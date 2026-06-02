import type { ObjectId } from "mongodb";

export type EmailCategory = "campaign" | "transactional";
export type SubscriberStatus = "subscribed" | "unsubscribed" | "bounced" | "complained" | "suppressed";
export type JobStatus = "pending" | "leased" | "sent" | "retrying" | "failed" | "suppressed";

export type Subscriber = {
  _id: ObjectId;
  email: string;
  emailLower: string;
  firstName?: string;
  name?: string;
  source?: string;
  userId?: string;
  status: SubscriberStatus;
  tags?: string[];
  custom?: Record<string, unknown>;
  subscribedAt?: Date;
  unsubscribedAt?: Date;
  unsubscribeReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailTemplate = {
  _id: ObjectId;
  slug: string;
  name: string;
  category: EmailCategory;
  subject: string;
  html: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailJob = {
  _id: ObjectId;
  kind: EmailCategory;
  status: JobStatus;
  campaignId?: ObjectId;
  templateId?: ObjectId;
  templateSlug?: string;
  subscriberId?: ObjectId;
  to: string;
  toName?: string;
  subject: string;
  data: Record<string, unknown>;
  category: "marketing" | "transactional";
  unsubscribeToken?: string;
  sesMessageId?: string;
  attempts: number;
  nextAttemptAt: Date;
  leasedUntil?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
};
