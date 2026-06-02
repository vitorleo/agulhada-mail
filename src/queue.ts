import { ObjectId } from "mongodb";
import { getDb } from "./db.js";
import { config } from "./config.js";
import { verifyUnsubscribeToken } from "./crypto.js";
import { renderHandlebarsTemplate } from "./templates.js";
import { renderReactEmailTemplate } from "./emailTemplates/render.js";
import { ReactEmailTemplateError } from "./emailTemplates/registry.js";
import { sendWithSes } from "./mailer.js";
import type { EmailJob, EmailTemplate } from "./types.js";

const leaseMs = 60_000;

export async function leaseJobs(limit = config.WORKER_BATCH_SIZE): Promise<EmailJob[]> {
  const db = await getDb();
  const now = new Date();
  const leasedUntil = new Date(now.getTime() + leaseMs);
  const jobs: EmailJob[] = [];

  for (let i = 0; i < limit; i++) {
    const result = await db.collection<EmailJob>("email_jobs").findOneAndUpdate(
      {
        status: { $in: ["pending", "retrying"] },
        nextAttemptAt: { $lte: now }
      },
      {
        $set: {
          status: "leased",
          leasedUntil,
          updatedAt: now
        },
        $inc: { attempts: 1 }
      },
      {
        sort: { nextAttemptAt: 1, createdAt: 1 },
        returnDocument: "after"
      }
    );

    if (!result) break;
    jobs.push(result);
  }

  return jobs;
}

export async function processJob(job: EmailJob): Promise<void> {
  const db = await getDb();
  const now = new Date();

  const suppression = await db.collection("suppressions").findOne({
    emailLower: job.to.toLowerCase(),
    scope: "global"
  });

  if (suppression) {
    await db.collection("email_jobs").updateOne(
      { _id: job._id },
      { $set: { status: "suppressed", updatedAt: now, lastError: `Suppressed: ${suppression.reason}` } }
    );
    return;
  }

  const unsubscribeUrl = job.unsubscribeToken
    ? `${config.PUBLIC_BASE_URL}/u/${encodeURIComponent(job.unsubscribeToken)}`
    : undefined;

  const data = { ...job.data, unsubscribeUrl };

  try {
    const rendered = await renderJobTemplate(job, data);
    const sesMessageId = await sendWithSes({
      to: job.to,
      toName: job.toName,
      subject: job.subject || rendered.subject,
      html: rendered.html,
      text: rendered.text,
      unsubscribeUrl,
      tags: {
        jobId: job._id.toString(),
        campaignId: job.campaignId?.toString() || "transactional",
        subscriberId: job.subscriberId?.toString() || "none",
        category: job.category
      }
    });

    await db.collection("email_jobs").updateOne(
      { _id: job._id },
      {
        $set: {
          status: "sent",
          sesMessageId,
          sentAt: new Date(),
          updatedAt: new Date()
        },
        $unset: { leasedUntil: "" }
      }
    );
  } catch (error) {
    await failJob(job, error instanceof Error ? error.message : String(error), true);
  }
}

async function renderJobTemplate(job: EmailJob, data: Record<string, unknown>) {
  if (job.templateSlug) {
    try {
      return await renderReactEmailTemplate(job.templateSlug, data, {
        expectedCategory: job.kind,
        requireUnsubscribeUrl: job.kind === "campaign"
      });
    } catch (error) {
      if (!(error instanceof ReactEmailTemplateError)) throw error;
      if (!job.templateId) throw error;
    }
  }

  if (!job.templateId) {
    throw new Error("Template not found");
  }

  const db = await getDb();
  const template = await db.collection<EmailTemplate>("email_templates").findOne({ _id: job.templateId });
  if (!template) {
    throw new Error("Template not found");
  }

  return renderHandlebarsTemplate(template, data);
}

async function failJob(job: EmailJob, error: string, retryable: boolean): Promise<void> {
  const db = await getDb();
  const attempts = job.attempts || 1;
  const shouldRetry = retryable && attempts < 5;
  const delayMs = Math.min(60 * 60 * 1000, 2 ** attempts * 30_000);

  await db.collection("email_jobs").updateOne(
    { _id: job._id },
    {
      $set: {
        status: shouldRetry ? "retrying" : "failed",
        nextAttemptAt: shouldRetry ? new Date(Date.now() + delayMs) : new Date(),
        lastError: error,
        updatedAt: new Date()
      },
      $unset: { leasedUntil: "" }
    }
  );
}

export function parseTokenSubscriberId(token: string): ObjectId | null {
  const payload = verifyUnsubscribeToken(token);
  if (!payload?.subscriberId || !ObjectId.isValid(payload.subscriberId)) return null;
  return new ObjectId(payload.subscriberId);
}
