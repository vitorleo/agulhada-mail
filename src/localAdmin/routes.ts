import express from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  CampaignInputError,
  CampaignNotFoundError,
  createCampaign,
  enqueueCampaign,
  importSubscribers,
  listCampaignTemplates,
  preflightCampaign
} from "../campaigns.js";
import { config } from "../config.js";
import { getDb } from "../db.js";
import { consumePreparation, CsvValidationError, previewCsv } from "./csv.js";
import { validateEnqueueConfirmation } from "./validation.js";

export const localAdminRouter = express.Router();
const asyncRoute = (handler: express.RequestHandler): express.RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

localAdminRouter.get("/api/context", asyncRoute(async (_req, res) => {
  const db = await getDb();
  const lists = await db.collection("lists").find({}, { projection: { slug: 1, name: 1 } }).sort({ slug: 1 }).toArray();
  res.json({
    databaseName: config.MONGO_DATABASE_NAME,
    vpsApiBaseUrl: config.VPS_API_BASE_URL,
    templates: listCampaignTemplates(),
    lists: lists.map((list) => ({ slug: list.slug, name: list.name || list.slug }))
  });
}));

localAdminRouter.post("/api/csv/preview", (req, res) => {
  const input = z.object({ csv: z.string().min(1) }).parse(req.body);
  res.json(previewCsv(input.csv));
});

localAdminRouter.post("/api/csv/import", asyncRoute(async (req, res) => {
  const input = z.object({
    preparationId: z.string().uuid(),
    listSlug: z.string().trim().min(1)
  }).parse(req.body);
  const subscribers = consumePreparation(input.preparationId);
  const result = await importSubscribers(input.listSlug, subscribers);
  res.status(201).json({ ok: true, ...result });
}));

localAdminRouter.post("/api/test-send", asyncRoute(async (req, res) => {
  const input = z.object({
    templateSlug: z.string().trim().min(1),
    to: z.string().trim().email(),
    toName: z.string().trim().optional(),
    subjectOverride: z.string().trim().max(300).optional()
  }).parse(req.body);
  const response = await fetch(`${config.VPS_API_BASE_URL.replace(/\/$/, "")}/api/manual/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.API_ADMIN_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...input,
      data: { email: input.to, name: input.toName, firstName: input.toName }
    })
  });
  const text = await response.text();
  res.status(response.status).type(response.headers.get("content-type") || "application/json").send(text);
}));

localAdminRouter.post("/api/campaigns", asyncRoute(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(1),
    listSlug: z.string().trim().min(1),
    templateSlug: z.string().trim().min(1),
    subjectOverride: z.string().trim().max(300).optional()
  }).parse(req.body);
  try {
    const result = await createCampaign(input);
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CampaignInputError) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }
    throw error;
  }
}));

localAdminRouter.get("/api/campaigns/:campaignId/preflight", asyncRoute(async (req, res) => {
  try {
    res.json({ ok: true, summary: await preflightCampaign(req.params.campaignId) });
  } catch (error) {
    if (error instanceof CampaignNotFoundError) {
      res.status(404).json({ ok: false, error: "Campaign not found" });
      return;
    }
    throw error;
  }
}));

localAdminRouter.post("/api/campaigns/:campaignId/enqueue", asyncRoute(async (req, res) => {
  const input = z.object({
    confirmationName: z.string(),
    acknowledgeImmediateSend: z.boolean()
  }).parse(req.body);
  if (!ObjectId.isValid(req.params.campaignId)) {
    res.status(404).json({ ok: false, error: "Campaign not found" });
    return;
  }
  const db = await getDb();
  const campaign = await db.collection("campaigns").findOne({ _id: new ObjectId(req.params.campaignId) });
  if (!campaign) {
    res.status(404).json({ ok: false, error: "Campaign not found" });
    return;
  }
  const confirmationError = validateEnqueueConfirmation(
    campaign.name,
    input.confirmationName,
    input.acknowledgeImmediateSend
  );
  if (confirmationError) {
    res.status(400).json({ ok: false, error: confirmationError });
    return;
  }
  res.json({ ok: true, ...(await enqueueCampaign(req.params.campaignId, db)) });
}));

localAdminRouter.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ ok: false, error: "Invalid request", issues: error.issues });
    return;
  }
  if (error instanceof CsvValidationError) {
    res.status(400).json({ ok: false, error: error.message });
    return;
  }
  console.error("LOCAL_ADMIN_ERROR", error);
  res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unexpected error" });
});
