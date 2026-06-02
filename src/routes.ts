import express, { type Request, type Response, type NextFunction } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { config } from "./config.js";
import { getDb } from "./db.js";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "./crypto.js";
import { renderTemplate } from "./templates.js";
import { renderReactEmailTemplate } from "./emailTemplates/render.js";
import { getReactEmailTemplate, ReactEmailTemplateError } from "./emailTemplates/registry.js";
import { sendWithSes } from "./mailer.js";
import type { EmailTemplate } from "./types.js";

export const router = express.Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (token !== config.API_ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.post("/api/templates", requireAdmin, async (req, res) => {
  const input = z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(["campaign", "transactional"]),
    subject: z.string().min(1),
    html: z.string().min(1),
    text: z.string().min(1)
  }).parse(req.body);

  const db = await getDb();
  const now = new Date();
  await db.collection("email_templates").updateOne(
    { slug: input.slug },
    { $set: { ...input, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  );

  res.status(201).json({ ok: true });
});

router.post("/api/subscribers/import", requireAdmin, async (req, res) => {
  const input = z.object({
    listSlug: z.string().min(1),
    subscribers: z.array(z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      name: z.string().optional(),
      source: z.string().optional(),
      userId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      custom: z.record(z.unknown()).optional()
    })).min(1)
  }).parse(req.body);

  const db = await getDb();
  const now = new Date();
  const list = await db.collection("lists").findOneAndUpdate(
    { slug: input.listSlug },
    { $set: { slug: input.listSlug, name: input.listSlug, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: "after" }
  );
  if (!list) {
    res.status(500).json({ error: "Could not create or load list" });
    return;
  }

  let imported = 0;
  for (const subscriber of input.subscribers) {
    const emailLower = subscriber.email.toLowerCase();
    const saved = await db.collection("subscribers").findOneAndUpdate(
      { emailLower },
      {
        $set: {
          ...subscriber,
          emailLower,
          status: "subscribed",
          updatedAt: now
        },
        $setOnInsert: {
          subscribedAt: now,
          createdAt: now
        }
      },
      { upsert: true, returnDocument: "after" }
    );
    if (!saved) {
      res.status(500).json({ error: `Could not create or load subscriber ${subscriber.email}` });
      return;
    }

    await db.collection("list_members").updateOne(
      { listId: list._id, subscriberId: saved._id },
      {
        $set: { status: "active", updatedAt: now },
        $setOnInsert: { subscribedAt: now, createdAt: now }
      },
      { upsert: true }
    );
    imported++;
  }

  res.status(201).json({ ok: true, imported });
});

router.post("/api/campaigns", requireAdmin, async (req, res) => {
  const input = z.object({
    name: z.string().min(1),
    listSlug: z.string().min(1),
    templateSlug: z.string().min(1),
    subjectOverride: z.string().optional()
  }).parse(req.body);

  const db = await getDb();
  const list = await db.collection("lists").findOne({ slug: input.listSlug });
  const template = await db.collection("email_templates").findOne({ slug: input.templateSlug, category: "campaign" });
  const reactTemplate = findReactTemplate(input.templateSlug, "campaign");
  if (!list || (!template && !reactTemplate)) {
    res.status(400).json({ error: "List or campaign template not found" });
    return;
  }

  const now = new Date();
  const result = await db.collection("campaigns").insertOne({
    name: input.name,
    listId: list._id,
    templateId: template?._id,
    templateSlug: input.templateSlug,
    subjectOverride: input.subjectOverride,
    status: "draft",
    stats: {},
    createdAt: now,
    updatedAt: now
  });

  res.status(201).json({ ok: true, campaignId: result.insertedId });
});

router.post("/api/campaigns/:campaignId/enqueue", requireAdmin, async (req, res) => {
  const campaignId = new ObjectId(req.params.campaignId);
  const db = await getDb();
  const campaign = await db.collection("campaigns").findOne({ _id: campaignId });
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const members = db.collection("list_members").find({ listId: campaign.listId, status: "active" });
  const now = new Date();
  let queued = 0;

  for await (const member of members) {
    const subscriber = await db.collection("subscribers").findOne({
      _id: member.subscriberId,
      status: "subscribed"
    });
    if (!subscriber) continue;

    const suppressed = await db.collection("suppressions").findOne({
      emailLower: subscriber.emailLower,
      scope: { $in: ["global", "marketing"] }
    });
    if (suppressed) continue;

    const unsubscribeToken = signUnsubscribeToken({
      subscriberId: subscriber._id.toString(),
      campaignId: campaign._id.toString()
    });

    await db.collection("email_jobs").updateOne(
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
    queued++;
  }

  await db.collection("campaigns").updateOne(
    { _id: campaign._id },
    { $set: { status: "queued", updatedAt: new Date() }, $inc: { "stats.queued": queued } }
  );

  res.json({ ok: true, queued });
});

router.post("/api/transactional/send", requireAdmin, async (req, res) => {
  const input = z.object({
    templateSlug: z.string().min(1),
    to: z.string().email(),
    toName: z.string().optional(),
    data: z.record(z.unknown()).default({})
  }).parse(req.body);

  const db = await getDb();
  const suppressed = await db.collection("suppressions").findOne({
    emailLower: input.to.toLowerCase(),
    scope: "global"
  });
  if (suppressed) {
    res.status(409).json({ error: "Recipient is globally suppressed", reason: suppressed.reason });
    return;
  }

  const reactTemplate = findReactTemplate(input.templateSlug, "transactional");
  const template = reactTemplate ? null : await db.collection<EmailTemplate>("email_templates").findOne({
    slug: input.templateSlug,
    category: "transactional"
  });
  if (!reactTemplate && !template) {
    res.status(404).json({ error: "Transactional template not found" });
    return;
  }

  const rendered = reactTemplate
    ? await renderReactEmailTemplate(input.templateSlug, { ...input.data, email: input.to, name: input.toName }, {
        expectedCategory: "transactional"
      })
    : renderTemplate(template!, input.data);
  const messageId = await sendWithSes({
    to: input.to,
    toName: input.toName,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    tags: { category: "transactional", templateSlug: input.templateSlug }
  });

  res.status(202).json({ ok: true, messageId });
});

function findReactTemplate(slug: string, category: "campaign" | "transactional") {
  try {
    const template = getReactEmailTemplate(slug);
    return template.category === category ? template : null;
  } catch (error) {
    if (error instanceof ReactEmailTemplateError) return null;
    throw error;
  }
}

router.get("/u/:token", async (req, res) => {
  const payload = verifyUnsubscribeToken(req.params.token);
  if (!payload?.subscriberId) {
    res.status(400).send("Invalid unsubscribe link.");
    return;
  }

  res.type("html").send(`
    <main style="font-family: system-ui, sans-serif; max-width: 560px; margin: 64px auto; line-height: 1.5;">
      <h1>Descadastrar email</h1>
      <p>Confirme para parar de receber emails de campanhas do Agulhada.com.</p>
      <form method="post">
        <button style="padding: 10px 16px; cursor: pointer;">Descadastrar</button>
      </form>
    </main>
  `);
});

router.post("/u/:token", async (req, res) => {
  const payload = verifyUnsubscribeToken(req.params.token);
  if (!payload?.subscriberId || !ObjectId.isValid(payload.subscriberId)) {
    res.status(400).send("Invalid unsubscribe link.");
    return;
  }

  const db = await getDb();
  const subscriberId = new ObjectId(payload.subscriberId);
  const now = new Date();
  const subscriber = await db.collection("subscribers").findOneAndUpdate(
    { _id: subscriberId },
    {
      $set: {
        status: "unsubscribed",
        unsubscribedAt: now,
        unsubscribeReason: "user",
        updatedAt: now
      }
    },
    { returnDocument: "after" }
  );

  if (subscriber) {
    await db.collection("suppressions").updateOne(
      { emailLower: subscriber.emailLower, scope: "marketing" },
      {
        $set: { reason: "unsubscribe", source: "app", updatedAt: now },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  }

  res.type("html").send(`
    <main style="font-family: system-ui, sans-serif; max-width: 560px; margin: 64px auto; line-height: 1.5;">
      <h1>Email descadastrado</h1>
      <p>Pronto. Voce nao recebera mais emails de campanhas do Agulhada.com.</p>
    </main>
  `);
});

router.post("/webhooks/ses", async (req, res) => {
  if (req.query.secret !== config.SNS_WEBHOOK_SECRET) {
    console.warn("Rejected SES webhook request with invalid secret");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const snsEnvelope = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  console.log("Received SES/SNS webhook", {
    type: snsEnvelope.Type,
    messageId: snsEnvelope.MessageId,
    hasSubscribeUrl: Boolean(snsEnvelope.SubscribeURL)
  });

  if (snsEnvelope.Type === "SubscriptionConfirmation" && snsEnvelope.SubscribeURL) {
    try {
      const confirmationResponse = await fetch(snsEnvelope.SubscribeURL);
      const confirmationBody = await confirmationResponse.text();
      console.log("SNS subscription confirmation attempted", {
        ok: confirmationResponse.ok,
        status: confirmationResponse.status,
        responsePreview: confirmationBody.slice(0, 300)
      });

      if (!confirmationResponse.ok) {
        res.status(502).json({ ok: false, confirmed: false, status: confirmationResponse.status });
        return;
      }

      res.json({ ok: true, confirmed: true });
    } catch (error) {
      console.error("SNS subscription confirmation failed", error);
      res.status(502).json({ ok: false, confirmed: false, error: "Subscription confirmation failed" });
    }
    return;
  }

  const message = typeof snsEnvelope.Message === "string" ? JSON.parse(snsEnvelope.Message) : snsEnvelope;
  const db = await getDb();
  const eventType = message.eventType || message.notificationType;
  const mail = message.mail || {};
  const tags = mail.tags || {};
  const email = extractEventEmail(message);
  const emailLower = email?.toLowerCase();
  const now = new Date();

  await db.collection("email_events").insertOne({
    provider: "ses",
    eventType,
    sesMessageId: mail.messageId,
    email,
    campaignId: parseFirstObjectId(tags.campaignId),
    subscriberId: parseFirstObjectId(tags.subscriberId),
    payload: message,
    createdAt: now
  });

  if (emailLower && eventType === "Bounce" && message.bounce?.bounceType === "Permanent") {
    await suppress(db, emailLower, "bounce", message);
  }

  if (emailLower && eventType === "Complaint") {
    await suppress(db, emailLower, "complaint", message);
  }

  res.json({ ok: true });
});

function extractEventEmail(message: any): string | undefined {
  return message.bounce?.bouncedRecipients?.[0]?.emailAddress
    || message.complaint?.complainedRecipients?.[0]?.emailAddress
    || message.delivery?.recipients?.[0]
    || message.mail?.destination?.[0];
}

function parseFirstObjectId(value: unknown): ObjectId | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && ObjectId.isValid(raw) ? new ObjectId(raw) : undefined;
}

async function suppress(db: Awaited<ReturnType<typeof getDb>>, emailLower: string, reason: "bounce" | "complaint", details: unknown) {
  const now = new Date();
  await db.collection("suppressions").updateOne(
    { emailLower, scope: "global" },
    {
      $set: { reason, source: "ses", details, updatedAt: now },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );

  const status = reason === "bounce" ? "bounced" : "complained";
  await db.collection("subscribers").updateOne(
    { emailLower },
    { $set: { status, updatedAt: now } }
  );
}
