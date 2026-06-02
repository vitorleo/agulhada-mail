import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { ObjectId } from "mongodb";
import { closeDb, getDb } from "../src/db.js";
import type { SubscriberStatus } from "../src/types.js";

type CsvRow = Record<string, string>;

type ImportOptions = {
  listPath: string;
  contactsPath?: string;
  listSlug: string;
  listName: string;
  write: boolean;
  limit?: number;
};

type ImportStats = {
  read: number;
  valid: number;
  imported: number;
  skippedInvalidEmail: number;
  listMembersActive: number;
  listMembersSuppressed: number;
  suppressionsUpserted: number;
  existingProtected: number;
};

const protectedStatuses = new Set<SubscriberStatus>(["unsubscribed", "bounced", "complained", "suppressed"]);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const contactsByEmail = options.contactsPath
    ? await loadContacts(options.contactsPath)
    : new Map<string, CsvRow>();

  const rows = readCsv(options.listPath);
  const now = new Date();
  const db = options.write ? await getDb() : undefined;
  const stats: ImportStats = {
    read: 0,
    valid: 0,
    imported: 0,
    skippedInvalidEmail: 0,
    listMembersActive: 0,
    listMembersSuppressed: 0,
    suppressionsUpserted: 0,
    existingProtected: 0
  };

  console.log(options.write ? "Running Mailjet import with writes enabled." : "Dry run only. Re-run with --write to import.");
  console.log({
    listPath: resolve(options.listPath),
    contactsPath: options.contactsPath ? resolve(options.contactsPath) : null,
    listSlug: options.listSlug,
    contactsLoaded: contactsByEmail.size,
    limit: options.limit ?? null
  });

  let listId: ObjectId | undefined;
  if (options.write) {
    if (!db) throw new Error("MongoDB connection was not initialized.");
    const list = await db.collection("lists").findOneAndUpdate(
      { slug: options.listSlug },
      {
        $set: {
          slug: options.listSlug,
          name: options.listName,
          source: "mailjet-import",
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true, returnDocument: "after" }
    );
    listId = list?._id;
    if (!listId) throw new Error("Could not create or load import list.");
  }

  for await (const row of rows) {
    stats.read++;
    if (options.limit && stats.read > options.limit) break;

    const email = clean(row.email);
    if (!isEmail(email)) {
      stats.skippedInvalidEmail++;
      continue;
    }

    stats.valid++;
    const emailLower = email.toLowerCase();
    const contact = contactsByEmail.get(emailLower);
    const desiredStatus = deriveStatus(row, contact);
    const existing = db
      ? await db.collection("subscribers").findOne<{ status?: SubscriberStatus }>({ emailLower })
      : undefined;
    const finalStatus = existing?.status && protectedStatuses.has(existing.status) && desiredStatus === "subscribed"
      ? existing.status
      : desiredStatus;

    if (existing?.status && protectedStatuses.has(existing.status) && desiredStatus === "subscribed") {
      stats.existingProtected++;
    }

    const subscriberDoc = buildSubscriberDoc(row, contact, email, emailLower, finalStatus, now);
    const isSuppressed = finalStatus !== "subscribed";

    if (options.write) {
      if (!db) throw new Error("MongoDB connection was not initialized.");
      const saved = await db.collection("subscribers").findOneAndUpdate(
        { emailLower },
        {
          $set: subscriberDoc.$set,
          $setOnInsert: subscriberDoc.$setOnInsert
        },
        { upsert: true, returnDocument: "after" }
      );
      if (!saved?._id) throw new Error(`Could not import ${email}`);

      if (listId) {
        await db.collection("list_members").updateOne(
          { listId, subscriberId: saved._id },
          {
            $set: {
              status: isSuppressed ? "unsubscribed" : "active",
              updatedAt: now,
              ...(isSuppressed ? { unsubscribedAt: now } : {})
            },
            $setOnInsert: { subscribedAt: parseDate(row.subscribedat) ?? now, createdAt: now }
          },
          { upsert: true }
        );
      }

      if (isSuppressed) {
        await upsertSuppression(emailLower, finalStatus, row, contact, now);
        stats.suppressionsUpserted++;
      }
    }

    stats.imported++;
    if (isSuppressed) {
      stats.listMembersSuppressed++;
    } else {
      stats.listMembersActive++;
    }
  }

  console.log("Mailjet import summary", stats);
}

function parseArgs(args: string[]): ImportOptions {
  const values = new Map<string, string | true>();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      values.set(key, true);
    } else {
      values.set(key, next);
      index++;
    }
  }

  return {
    listPath: stringValue(values, "list", "data/all_list.csv"),
    contactsPath: optionalStringValue(values, "contacts", "data/all_contacts.csv"),
    listSlug: stringValue(values, "list-slug", "mailjet-all"),
    listName: stringValue(values, "list-name", "Mailjet import"),
    write: values.get("write") === true,
    limit: optionalNumberValue(values, "limit")
  };
}

async function loadContacts(path: string): Promise<Map<string, CsvRow>> {
  const contacts = new Map<string, CsvRow>();
  for await (const row of readCsv(path)) {
    const email = clean(row.email).toLowerCase();
    if (isEmail(email)) contacts.set(email, row);
  }
  return contacts;
}

async function* readCsv(path: string): AsyncGenerator<CsvRow> {
  const input = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let headers: string[] | null = null;

  for await (const line of lines) {
    if (!headers) {
      headers = parseCsvLine(stripBom(line)).map((header) => header.trim().toLowerCase());
      continue;
    }

    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? "";
    });
    yield row;
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index++;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function buildSubscriberDoc(
  row: CsvRow,
  contact: CsvRow | undefined,
  email: string,
  emailLower: string,
  status: SubscriberStatus,
  now: Date
) {
  const subscribedAt = parseDate(row.subscribedat) ?? parseDate(row.signup_date) ?? now;
  const firstName = clean(row.firstname);
  const name = clean(row.name);
  const source = clean(row.source) || "mailjet";
  const tags = buildTags(row, contact);
  const custom = {
      mailjet: {
        id: clean(row._id) || clean(contact?.id),
        importedFrom: "mailjet",
        status: clean(row.status),
        newsletterSub: parseBool(row.newsletter_sub),
        country: clean(row.country),
        website: clean(row.website),
      source,
      signupDate: parseDate(row.signup_date)?.toISOString(),
      listSubscribedAt: subscribedAt.toISOString(),
      engagement: contact ? numericContactStats(contact) : undefined
    }
  };

  return {
    $set: {
      email,
      emailLower,
      firstName: firstName || undefined,
      name: name || firstName || undefined,
      source,
      status,
      tags,
      custom,
      updatedAt: now,
      ...(status === "unsubscribed" ? { unsubscribedAt: now, unsubscribeReason: "mailjet-import" } : {})
    },
    $setOnInsert: {
      subscribedAt,
      createdAt: now
    }
  };
}

function deriveStatus(row: CsvRow, contact?: CsvRow): SubscriberStatus {
  if (numberValue(contact?.hard_bounce) > 0) return "bounced";
  if (numberValue(contact?.spam) > 0) return "complained";
  if (parseBool(row.unsubscribed) || numberValue(contact?.unsub) > 0) return "unsubscribed";
  if (row.newsletter_sub && !parseBool(row.newsletter_sub)) return "unsubscribed";
  return "subscribed";
}

async function upsertSuppression(
  emailLower: string,
  status: SubscriberStatus,
  row: CsvRow,
  contact: CsvRow | undefined,
  now: Date
) {
  const db = await getDb();
  const reason = status === "bounced" ? "bounce" : status === "complained" ? "complaint" : "unsubscribe";
  const scope = status === "unsubscribed" ? "marketing" : "global";

  await db.collection("suppressions").updateOne(
    { emailLower, scope },
    {
      $set: {
        reason,
        source: "mailjet-import",
        details: { list: row, contact },
        updatedAt: now
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );
}

function buildTags(row: CsvRow, contact?: CsvRow): string[] {
  const tags = new Set<string>(["mailjet"]);
  const source = clean(row.source);
  const status = clean(row.status);
  if (source) tags.add(`mailjet-source:${source}`);
  if (status) tags.add(`mailjet-status:${status}`);
  if (parseBool(row.newsletter_sub)) tags.add("newsletter");
  if (numberValue(contact?.open) > 0) tags.add("mailjet-opened");
  if (numberValue(contact?.click) > 0) tags.add("mailjet-clicked");
  return Array.from(tags);
}

function numericContactStats(contact: CsvRow): Record<string, number> {
  return Object.fromEntries(
    ["open", "click", "sent", "hard_bounce", "soft_bounce", "blocked", "spam", "unsub", "deferred", "total"]
      .map((key) => [key, numberValue(contact[key])])
  );
}

function stringValue(values: Map<string, string | true>, key: string, fallback: string): string {
  const value = values.get(key);
  return typeof value === "string" ? value : fallback;
}

function optionalStringValue(values: Map<string, string | true>, key: string, fallback: string): string | undefined {
  const value = values.get(key);
  if (value === true) return fallback;
  return typeof value === "string" ? value : fallback;
}

function optionalNumberValue(values: Map<string, string | true>, key: string): number | undefined {
  const value = values.get(key);
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function parseBool(value: unknown): boolean {
  const normalized = clean(value).toLowerCase();
  return ["true", "t", "yes", "y", "1"].includes(normalized);
}

function numberValue(value: unknown): number {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value: unknown): Date | undefined {
  const raw = clean(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
