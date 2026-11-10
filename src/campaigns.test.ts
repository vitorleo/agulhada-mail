import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId, type Db } from "mongodb";
import { CampaignNotFoundError, listCampaignStats } from "./campaigns.js";

test("campaign stats aggregate mixed jobs and SES events", async () => {
  const campaignId = new ObjectId();
  const subscriberId = new ObjectId();
  const db = createMemoryDb({
    campaigns: [{
      _id: campaignId,
      name: "July campaign",
      templateSlug: "marketing-30-days",
      subjectOverride: "July subject",
      status: "queued",
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
      updatedAt: new Date("2026-07-02T10:00:00.000Z")
    }],
    email_jobs: [
      { _id: new ObjectId(), campaignId, status: "pending" },
      { _id: new ObjectId(), campaignId, status: "leased" },
      { _id: new ObjectId(), campaignId, status: "sent" },
      { _id: new ObjectId(), campaignId, status: "retrying" },
      { _id: new ObjectId(), campaignId, status: "failed" },
      { _id: new ObjectId(), campaignId, status: "suppressed" }
    ],
    email_events: [
      { _id: new ObjectId(), campaignId, eventType: "Delivery", subscriberId },
      { _id: new ObjectId(), campaignId, eventType: "Bounce", email: "person@example.com" },
      { _id: new ObjectId(), campaignId, eventType: "Complaint", email: "complaint@example.com" },
      { _id: new ObjectId(), campaignId, eventType: "Open", subscriberId },
      { _id: new ObjectId(), campaignId, eventType: "Open", subscriberId },
      { _id: new ObjectId(), campaignId, eventType: "Click", email: "click@example.com" },
      { _id: new ObjectId(), campaignId, eventType: "Click", email: "CLICK@example.com" }
    ]
  });

  const stats = await listCampaignStats({ campaignId: campaignId.toString() }, db);

  assert.equal(stats.length, 1);
  assert.equal(stats[0].campaignId, campaignId.toString());
  assert.equal(stats[0].name, "July campaign");
  assert.equal(stats[0].subject, "July subject");
  assert.deepEqual(stats[0].jobs, {
    queued: 6,
    pending: 1,
    leased: 1,
    sent: 1,
    retrying: 1,
    failed: 1,
    suppressed: 1
  });
  assert.deepEqual(stats[0].events, {
    delivery: 1,
    bounce: 1,
    complaint: 1,
    open: 2,
    uniqueOpens: 1,
    click: 2,
    uniqueClicks: 1
  });
});

test("campaign stats return zero-filled counts for draft campaigns with no jobs or events", async () => {
  const campaignId = new ObjectId();
  const db = createMemoryDb({
    campaigns: [{
      _id: campaignId,
      name: "Draft campaign",
      templateSlug: "trial-expiring",
      status: "draft",
      createdAt: new Date("2026-07-03T10:00:00.000Z"),
      updatedAt: new Date("2026-07-03T10:00:00.000Z")
    }],
    email_jobs: [],
    email_events: []
  });

  const [stats] = await listCampaignStats({ campaignId: campaignId.toString() }, db);

  assert.deepEqual(stats.jobs, {
    queued: 0,
    pending: 0,
    leased: 0,
    sent: 0,
    retrying: 0,
    failed: 0,
    suppressed: 0
  });
  assert.deepEqual(stats.events, {
    delivery: 0,
    bounce: 0,
    complaint: 0,
    open: 0,
    uniqueOpens: 0,
    click: 0,
    uniqueClicks: 0
  });
});

test("campaign stats reject unknown focused campaigns", async () => {
  const db = createMemoryDb({ campaigns: [], email_jobs: [], email_events: [] });

  await assert.rejects(
    () => listCampaignStats({ campaignId: new ObjectId().toString() }, db),
    CampaignNotFoundError
  );
});

function createMemoryDb(collections: Record<string, Array<Record<string, any>>>): Db {
  return {
    collection(name: string) {
      return new MemoryCollection(collections[name] || []);
    }
  } as unknown as Db;
}

class MemoryCollection {
  constructor(private readonly rows: Array<Record<string, any>>) {}

  find(query: Record<string, any> = {}) {
    return new MemoryCursor(this.rows.filter((row) => matchesQuery(row, query)));
  }
}

class MemoryCursor {
  private rows: Array<Record<string, any>>;

  constructor(rows: Array<Record<string, any>>) {
    this.rows = [...rows];
  }

  sort(sort: Record<string, 1 | -1>) {
    const [field, direction] = Object.entries(sort)[0] || [];
    if (field) {
      this.rows.sort((left, right) => {
        const leftValue = sortableValue(left[field]);
        const rightValue = sortableValue(right[field]);
        return direction === -1 ? rightValue - leftValue : leftValue - rightValue;
      });
    }
    return this;
  }

  limit(limit: number) {
    this.rows = this.rows.slice(0, limit);
    return this;
  }

  async toArray() {
    return this.rows;
  }
}

function matchesQuery(row: Record<string, any>, query: Record<string, any>) {
  return Object.entries(query).every(([field, expected]) => {
    if (expected && typeof expected === "object" && "$in" in expected) {
      return expected.$in.some((value: unknown) => valuesEqual(row[field], value));
    }
    return valuesEqual(row[field], expected);
  });
}

function valuesEqual(left: unknown, right: unknown) {
  if (left instanceof ObjectId && right instanceof ObjectId) {
    return left.equals(right);
  }
  return left === right;
}

function sortableValue(value: unknown) {
  return value instanceof Date ? value.getTime() : Number(value) || 0;
}
