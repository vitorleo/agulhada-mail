import { ObjectId, type Db } from "mongodb";
import { signUnsubscribeToken } from "./crypto.js";
import { getDb } from "./db.js";
import { getReactEmailTemplate, ReactEmailTemplateError, reactEmailTemplates } from "./emailTemplates/registry.js";
import type { Subscriber } from "./types.js";

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

type EligibleRecipient = {
  subscriber: Subscriber;
};

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
  for (const subscriber of subscribers) {
    const emailLower = subscriber.email.toLowerCase();
    const saved = await database.collection("subscribers").findOneAndUpdate(
      { emailLower },
      {
        $set: { ...subscriber, emailLower, status: "subscribed", updatedAt: now },
        $setOnInsert: { subscribedAt: now, createdAt: now }
      },
      { upsert: true, returnDocument: "after" }
    );
    if (!saved) throw new Error(`Could not create or load subscriber ${subscriber.email}`);

    await database.collection("list_members").updateOne(
      { listId: list._id, subscriberId: saved._id },
      {
        $set: { status: "active", updatedAt: now },
        $setOnInsert: { subscribedAt: now, createdAt: now }
      },
      { upsert: true }
    );
    imported++;
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

export async function enqueueCampaign(campaignId: string, db?: Db) {
  const database = db || await getDb();
  const { campaign, summary, eligibleRecipients } = await getEligibleRecipients(campaignId, database);
  const now = new Date();
  let queued = 0;

  for (const { subscriber } of eligibleRecipients) {
    const unsubscribeToken = signUnsubscribeToken({
      subscriberId: subscriber._id.toString(),
      campaignId: campaign._id.toString()
    });
    const result = await database.collection("email_jobs").updateOne(
      { campaignId: campaign._id, subscriberId: subscriber._id },
      {
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
      { upsert: true }
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
  const members = db.collection("list_members").find({ listId: campaign.listId, status: "active" });

  for await (const member of members) {
    summary.activeMembers++;
    const subscriber = await db.collection<Subscriber>("subscribers").findOne({ _id: member.subscriberId });
    if (!subscriber || subscriber.status !== "subscribed") {
      summary.unsubscribed++;
      continue;
    }
    const suppressed = await db.collection("suppressions").findOne({
      emailLower: subscriber.emailLower,
      scope: { $in: ["global", "marketing"] }
    });
    if (suppressed) {
      summary.suppressed++;
      continue;
    }
    const existingJob = await db.collection("email_jobs").findOne({
      campaignId: campaign._id,
      subscriberId: subscriber._id
    });
    if (existingJob) {
      summary.existingJobs++;
      continue;
    }
    summary.eligible++;
    eligibleRecipients.push({ subscriber });
  }

  return { campaign, summary, eligibleRecipients };
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
