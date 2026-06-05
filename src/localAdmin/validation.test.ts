import assert from "node:assert/strict";
import test from "node:test";
import { listCampaignTemplates } from "../campaigns.js";
import { validateEnqueueConfirmation } from "./validation.js";

test("campaign template listing excludes transactional templates", () => {
  const templates = listCampaignTemplates();
  assert.ok(templates.some((template) => template.slug === "trial-recapture"));
  assert.ok(!templates.some((template) => template.slug === "welcome"));
});

test("enqueue confirmation requires exact name and acknowledgement", () => {
  assert.match(validateEnqueueConfirmation("June campaign", "Wrong", true) || "", /does not match/);
  assert.match(validateEnqueueConfirmation("June campaign", "June campaign", false) || "", /acknowledgement/);
  assert.equal(validateEnqueueConfirmation("June campaign", "June campaign", true), null);
});
