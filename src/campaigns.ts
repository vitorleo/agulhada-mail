import { ObjectId, type Db } from "mongodb";
import { signUnsubscribeToken } from "./crypto.js";
import { getDb } from "./db.js";
import { getReactEmailTemplate, ReactEmailTemplateError, reactEmailTemplates } from "./emailTemplates/registry.js";
import type { JobStatus, Subscriber } from "./types.js";

export type ImportSubscriberInput = {
  email: string;
  firstName?: string;
  name?: string;
  source?: string;
  userId?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
};

export type CreateCampaignInput = {
  name: string;
  listSlug: string;
  templateSlug: string;
  subjectOverride?: string;
};

export type EligibilitySummary = {
  activeMembers: number;
  unsubscribed: number;
  suppressed: number;
  existingJobs: number;
  eligible: number;
};

export type CampaignStatsJobCounts = Record<JobStatus, number> & {
  queued: number;
};

export type CampaignStatsEventCounts = {
  delivery: number;
  bounce: number;
  complaint: number;
  open: number;
  uniqueOpens: number;
  click: number;
  uniqueClicks: number;
};

export type CampaignStats = {
  campaignId: string;
  name: string;
  templateSlug: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  jobs: CampaignStatsJobCounts;
  events: CampaignStatsEventCounts;
};

type EligibleRecipient = {
  subscriber: Subscriber;
};

const ELIGIBILITY_BATCH_SIZE = 1000;
const ENQUEUE_BULK_BATCH_SIZE = 500;
const IMPORT_BULK_BATCH_SIZE = 1000;
const DEFAULT_CAMPAIGN_STATS_LIMIT = 25;
const MAX_CAMPAIGN_STATS_LIMIT = 100;
const JOB_STATUSES: JobStatus[] = ["pending", "leased", "sent", "retrying", "failed", "suppressed"];

export function listCampaignTemplates() {
  return Object.values(reactEmailTemplates)
    .filter((template) => template.category === "campaign")
    .map((template) => ({
      slug: template.slug,
      name: template.name,
      subject: template.subject
    }));
}

export async function importSubscribers(
  listSlug: string,
  subscribers: ImportSubscriberInput[],
  db?: Db
) {
  const database = db || await getDb();
  const now = new Date();
  const list = await database.collection("lists").findOneAndUpdate(
    { slug: listSlug },
    { $set: { slug: listSlug, name: listSlug, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: "after" }
  );
  if (!list) throw new Error("Could not create or load list");

  let imported = 0;
  for (const chunk of chunkArray(subscribers, IMPORT_BULK_BATCH_SIZE)) {
    await database.collection("subscribers").bulkWrite(
      chunk.map((subscriber) => {
        const emailLower = subscriber.email.toLowerCase();
        return {
          updateOne: {
            filter: { emailLower },
            update: {
              $set: { ...subscriber, emailLower, status: "subscribed", updatedAt: now },
              $setOnInsert: { subscribedAt: now, createdAt: now }
            },
            upsert: true
          }
        };
      }),
      { ordered: false }
    );

    const emailLowers = chunk.map((subscriber) => subscriber.email.toLowerCase());
    const savedSubscribers = await database.collection<Subscriber>("subscribers")
      .find({ emailLower: { $in: emailLowers } }, { projection: { _id: 1, emailLower: 1 } })
      .toArray();
    const subscriberByEmail = new Map(savedSubscribers.map((subscriber) => [subscriber.emailLower, subscriber]));

    await database.collection("list_members").bulkWrite(
      chunk.map((subscriber) => {
        const saved = subscriberByEmail.get(subscriber.email.toLowerCase());
        if (!saved) throw new Error(`Could not create or load subscriber ${subscriber.email}`);
        return {
          updateOne: {
            filter: { listId: list._id, subscriberId: saved._id },
            update: {
              $set: { status: "active", updatedAt: now },
              $setOnInsert: { subscribedAt: now, createdAt: now }
            },
            upsert: true
          }
        };
      }),
      { ordered: false }
    );
    imported += chunk.length;
  }

  return { imported, listId: list._id.toString() };
}

export async function createCampaign(input: CreateCampaignInput, db?: Db) {
  const database = db || await getDb();
  const list = await database.collection("lists").findOne({ slug: input.listSlug });
  const storedTemplate = await database.collection("email_templates").findOne({
    slug: input.templateSlug,
    category: "campaign"
  });
  const reactTemplate = findCampaignTemplate(input.templateSlug);
  if (!list || (!storedTemplate && !reactTemplate)) {
    throw new CampaignInputError("List or campaign template not found");
  }

  const now = new Date();
  const result = await database.collection("campaigns").insertOne({
    name: input.name,
    listId: list._id,
    templateId: storedTemplate?._id,
    templateSlug: input.templateSlug,
    subjectOverride: input.subjectOverride,
    status: "draft",
    stats: {},
    createdAt: now,
    updatedAt: now
  });

  return {
    campaignId: result.insertedId.toString(),
    effectiveSubject: input.subjectOverride
      || (reactTemplate && typeof reactTemplate.subject === "string" ? reactTemplate.subject : storedTemplate?.subject)
      || ""
  };
}

export async function preflightCampaign(campaignId: string, db?: Db): Promise<EligibilitySummary> {
  const { summary } = await getEligibleRecipients(campaignId, db || await getDb());
  return summary;
}

export async function listCampaignStats(input: { campaignId?: string; limit?: number } = {}, db?: Db): Promise<CampaignStats[]> {
  const database = db || await getDb();
  const limit = normalizeStatsLimit(input.limit);
  const campaignFilter = input.campaignId
    ? { _id: parseCampaignObjectId(input.campaignId) }
    : {};
  const campaigns = await database.collection("campaigns")
    .find(campaignFilter, {
      projection: {
        name: 1,
        templateSlug: 1,
        subjectOverride: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1
      }
    })
    .sort({ createdAt: -1 })
    .limit(input.campaignId ? 1 : limit)
    .toArray();

  if (input.campaignId && campaigns.length === 0) {
    throw new CampaignNotFoundError();
  }
  if (campaigns.length === 0) return [];

  const campaignIds = campaigns.map((campaign) => campaign._id);
  const jobCountsByCampaign = await getJobCountsByCampaign(database, campaignIds);
  const eventCountsByCampaign = await getEventCountsByCampaign(database, campaignIds);

  return campaigns.map((campaign) => ({
    campaignId: campaign._id.toString(),
    name: String(campaign.name || ""),
    templateSlug: String(campaign.templateSlug || ""),
    subject: String(campaign.subjectOverride || ""),
    status: String(campaign.status || ""),
    createdAt: toIsoString(campaign.createdAt),
    updatedAt: toIsoString(campaign.updatedAt),
    jobs: jobCountsByCampaign.get(campaign._id.toString()) || emptyJobCounts(),
    events: eventCountsByCampaign.get(campaign._id.toString()) || emptyEventCounts()
  }));
}

export async function enqueueCampaign(campaignId: string, db?: Db) {
  const database = db || await getDb();
  const { campaign, summary, eligibleRecipients } = await getEligibleRecipients(campaignId, database);
  const now = new Date();
  let queued = 0;

  for (const chunk of chunkArray(eligibleRecipients, ENQUEUE_BULK_BATCH_SIZE)) {
    const result = await database.collection("email_jobs").bulkWrite(
      chunk.map(({ subscriber }) => {
        const unsubscribeToken = signUnsubscribeToken({
          subscriberId: subscriber._id.toString(),
          campaignId: campaign._id.toString()
        });
        return {
          updateOne: {
            filter: { campaignId: campaign._id, subscriberId: subscriber._id },
            update: {
              $setOnInsert: {
                kind: "campaign",
                status: "pending",
                campaignId: campaign._id,
                templateId: campaign.templateId,
                templateSlug: campaign.templateSlug,
                subscriberId: subscriber._id,
                to: subscriber.email,
                toName: subscriber.name || subscriber.firstName,
                subject: campaign.subjectOverride || "",
                data: {
                  firstName: subscriber.firstName || subscriber.name || "",
                  name: subscriber.name || "",
                  email: subscriber.email,
                  source: subscriber.source || "",
                  campaignId: campaign._id.toString(),
                  campaignName: campaign.name || ""
                },
                category: "marketing",
                unsubscribeToken,
                attempts: 0,
                nextAttemptAt: now,
                createdAt: now,
                updatedAt: now
              }
            },
            upsert: true
          }
        };
      }),
      { ordered: false }
    );
    queued += result.upsertedCount;
  }

  await database.collection("campaigns").updateOne(
    { _id: campaign._id },
    {
      $set: { status: "queued", updatedAt: new Date(), "stats.queued": queued + summary.existingJobs }
    }
  );

  return {
    queued,
    excluded: {
      unsubscribed: summary.unsubscribed,
      suppressed: summary.suppressed,
      existingJobs: summary.existingJobs
    }
  };
}

async function getEligibleRecipients(campaignId: string, db: Db) {
  if (!ObjectId.isValid(campaignId)) throw new CampaignNotFoundError();
  const campaign = await db.collection("campaigns").findOne({ _id: new ObjectId(campaignId) });
  if (!campaign) throw new CampaignNotFoundError();

  const summary: EligibilitySummary = {
    activeMembers: 0,
    unsubscribed: 0,
    suppressed: 0,
    existingJobs: 0,
    eligible: 0
  };
  const eligibleRecipients: EligibleRecipient[] = [];
  const members = db.collection("list_members").find(
    { listId: campaign.listId, status: "active" },
    { projection: { subscriberId: 1 }, batchSize: ELIGIBILITY_BATCH_SIZE }
  );

  let batch: Array<{ subscriberId: ObjectId }> = [];
  for await (const member of members) {
    batch.push({ subscriberId: member.subscriberId });
    if (batch.length >= ELIGIBILITY_BATCH_SIZE) {
      await addEligibilityBatch(db, campaign._id, batch, summary, eligibleRecipients);
      batch = [];
    }
  }

  if (batch.length) {
    await addEligibilityBatch(db, campaign._id, batch, summary, eligibleRecipients);
  }

  return { campaign, summary, eligibleRecipients };
}

async function addEligibilityBatch(
  db: Db,
  campaignId: ObjectId,
  members: Array<{ subscriberId: ObjectId }>,
  summary: EligibilitySummary,
  eligibleRecipients: EligibleRecipient[]
) {
  const subscriberIds = members.map((member) => member.subscriberId);
  const subscribers = await db.collection<Subscriber>("subscribers")
    .find({ _id: { $in: subscriberIds } })
    .toArray();
  const subscriberById = new Map(subscribers.map((subscriber) => [subscriber._id.toString(), subscriber]));
  const emailLowers = subscribers
    .filter((subscriber) => subscriber.status === "subscribed")
    .map((subscriber) => subscriber.emailLower);
  const suppressions = emailLowers.length
    ? await db.collection("suppressions").find({
        emailLower: { $in: emailLowers },
        scope: { $in: ["global", "marketing"] }
      }, { projection: { emailLower: 1 } }).toArray()
    : [];
  const suppressedEmails = new Set(suppressions.map((suppression) => suppression.emailLower));
  const jobs = subscriberIds.length
    ? await db.collection("email_jobs").find({
        campaignId,
        subscriberId: { $in: subscriberIds }
      }, { projection: { subscriberId: 1 } }).toArray()
    : [];
  const existingJobSubscriberIds = new Set(jobs.map((job) => job.subscriberId.toString()));

  for (const member of members) {
    summary.activeMembers++;
    const subscriber = subscriberById.get(member.subscriberId.toString());
    if (!subscriber || subscriber.status !== "subscribed") {
      summary.unsubscribed++;
      continue;
    }
    if (suppressedEmails.has(subscriber.emailLower)) {
      summary.suppressed++;
      continue;
    }
    if (existingJobSubscriberIds.has(subscriber._id.toString())) {
      summary.existingJobs++;
      continue;
    }
    summary.eligible++;
    eligibleRecipients.push({ subscriber });
  }
}

async function getJobCountsByCampaign(db: Db, campaignIds: ObjectId[]) {
  const jobs = await db.collection("email_jobs").find({
    campaignId: { $in: campaignIds }
  }, { projection: { campaignId: 1, status: 1 } }).toArray();
  const countsByCampaign = new Map<string, CampaignStatsJobCounts>();

  for (const job of jobs) {
    const campaignId = job.campaignId?.toString();
    if (!campaignId) continue;
    const counts = getOrCreate(countsByCampaign, campaignId, emptyJobCounts);
    counts.queued++;
    if (JOB_STATUSES.includes(job.status)) {
      counts[job.status as JobStatus]++;
    }
  }

  return countsByCampaign;
}

async function getEventCountsByCampaign(db: Db, campaignIds: ObjectId[]) {
  const events = await db.collection("email_events").find({
    campaignId: { $in: campaignIds }
  }, { projection: { campaignId: 1, eventType: 1, subscriberId: 1, email: 1 } }).toArray();
  const countsByCampaign = new Map<string, CampaignStatsEventCounts>();
  const uniqueOpensByCampaign = new Map<string, Set<string>>();
  const uniqueClicksByCampaign = new Map<string, Set<string>>();

  for (const event of events) {
    const campaignId = event.campaignId?.toString();
    if (!campaignId) continue;
    const counts = getOrCreate(countsByCampaign, campaignId, emptyEventCounts);
    const eventType = String(event.eventType || "").toLowerCase();

    if (eventType === "delivery") counts.delivery++;
    if (eventType === "bounce") counts.bounce++;
    if (eventType === "complaint") counts.complaint++;
    if (eventType === "open") {
      counts.open++;
      addUniqueEventRecipient(uniqueOpensByCampaign, campaignId, event);
    }
    if (eventType === "click") {
      counts.click++;
      addUniqueEventRecipient(uniqueClicksByCampaign, campaignId, event);
    }
  }

  for (const [campaignId, recipients] of uniqueOpensByCampaign) {
    getOrCreate(countsByCampaign, campaignId, emptyEventCounts).uniqueOpens = recipients.size;
  }
  for (const [campaignId, recipients] of uniqueClicksByCampaign) {
    getOrCreate(countsByCampaign, campaignId, emptyEventCounts).uniqueClicks = recipients.size;
  }

  return countsByCampaign;
}

function addUniqueEventRecipient(
  recipientsByCampaign: Map<string, Set<string>>,
  campaignId: string,
  event: Record<string, unknown>
) {
  const recipientKey = event.subscriberId instanceof ObjectId
    ? event.subscriberId.toString()
    : typeof event.email === "string"
      ? event.email.toLowerCase()
      : undefined;
  if (!recipientKey) return;
  getOrCreate(recipientsByCampaign, campaignId, () => new Set<string>()).add(recipientKey);
}

function emptyJobCounts(): CampaignStatsJobCounts {
  return {
    queued: 0,
    pending: 0,
    leased: 0,
    sent: 0,
    retrying: 0,
    failed: 0,
    suppressed: 0
  };
}

function emptyEventCounts(): CampaignStatsEventCounts {
  return {
    delivery: 0,
    bounce: 0,
    complaint: 0,
    open: 0,
    uniqueOpens: 0,
    click: 0,
    uniqueClicks: 0
  };
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  const existing = map.get(key);
  if (existing) return existing;
  const value = create();
  map.set(key, value);
  return value;
}

function normalizeStatsLimit(limit: number | undefined) {
  if (limit === undefined) return DEFAULT_CAMPAIGN_STATS_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_CAMPAIGN_STATS_LIMIT);
}

function parseCampaignObjectId(campaignId: string) {
  if (!ObjectId.isValid(campaignId)) throw new CampaignNotFoundError();
  return new ObjectId(campaignId);
}

function toIsoString(value: unknown) {
  return value instanceof Date ? value.toISOString() : "";
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function findCampaignTemplate(slug: string) {
  try {
    const template = getReactEmailTemplate(slug);
    return template.category === "campaign" ? template : null;
  } catch (error) {
    if (error instanceof ReactEmailTemplateError) return null;
    throw error;
  }
}

export class CampaignInputError extends Error {}
export class CampaignNotFoundError extends Error {}
