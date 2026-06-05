import crypto from "node:crypto";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import type { ImportSubscriberInput } from "../campaigns.js";

const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_RECIPIENTS = 5000;
const PREPARATION_TTL_MS = 30 * 60 * 1000;
const emailSchema = z.string().trim().email();

type InvalidRow = {
  row: number;
  email: string;
  reason: string;
};

type Preparation = {
  expiresAt: number;
  subscribers: ImportSubscriberInput[];
};

export class CsvPreparationStore {
  private readonly preparations = new Map<string, Preparation>();

  constructor(
    private readonly ttlMs = PREPARATION_TTL_MS,
    private readonly now: () => number = () => Date.now()
  ) {}

  create(subscribers: ImportSubscriberInput[]): string {
    this.cleanup();
    const id = crypto.randomUUID();
    this.preparations.set(id, { expiresAt: this.now() + this.ttlMs, subscribers });
    return id;
  }

  consume(id: string): ImportSubscriberInput[] {
    this.cleanup();
    const preparation = this.preparations.get(id);
    if (!preparation) throw new CsvValidationError("CSV preparation expired or was not found");
    this.preparations.delete(id);
    return preparation.subscribers;
  }

  private cleanup() {
    const now = this.now();
    for (const [id, preparation] of this.preparations) {
      if (preparation.expiresAt <= now) this.preparations.delete(id);
    }
  }
}

const preparationStore = new CsvPreparationStore();

export function previewCsv(csv: string, store = preparationStore) {
  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) throw new CsvValidationError("CSV exceeds the 2 MB limit");

  let records: Record<string, unknown>[];
  try {
    records = parse(csv, {
      columns: (headers: string[]) => headers.map(normalizeHeader),
      bom: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    throw new CsvValidationError(error instanceof Error ? error.message : "Could not parse CSV");
  }

  if (!records.length || !Object.prototype.hasOwnProperty.call(records[0], "email")) {
    throw new CsvValidationError("CSV must include an email column");
  }
  if (records.length > MAX_RECIPIENTS) throw new CsvValidationError(`CSV exceeds the ${MAX_RECIPIENTS} recipient limit`);

  const subscribers: ImportSubscriberInput[] = [];
  const invalidRows: InvalidRow[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  records.forEach((record, index) => {
    const emailValue = stringValue(record.email);
    const emailResult = emailSchema.safeParse(emailValue);
    if (!emailResult.success) {
      invalidRows.push({ row: index + 2, email: emailValue, reason: "Invalid or missing email" });
      return;
    }

    const emailLower = emailResult.data.toLowerCase();
    if (seen.has(emailLower)) {
      duplicates++;
      return;
    }
    seen.add(emailLower);

    subscribers.push(compactSubscriber({
      email: emailResult.data,
      firstName: stringValue(record.firstname),
      name: stringValue(record.name) || stringValue(record.fullname),
      source: stringValue(record.source),
      userId: stringValue(record.userid)
    }));
  });

  const preparationId = store.create(subscribers);

  return {
    preparationId,
    counts: {
      rows: records.length,
      valid: subscribers.length,
      invalid: invalidRows.length,
      duplicates
    },
    preview: subscribers.slice(0, 20),
    invalidRows: invalidRows.slice(0, 50)
  };
}

export function consumePreparation(preparationId: string): ImportSubscriberInput[] {
  return preparationStore.consume(preparationId);
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll("_", "").replaceAll("-", "").replaceAll(" ", "");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function compactSubscriber(input: Required<Pick<ImportSubscriberInput, "email">> & Omit<ImportSubscriberInput, "email">) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "")) as ImportSubscriberInput;
}

export class CsvValidationError extends Error {}
