# Database Schema

Database: `agulhada_mail`

The schema uses MongoDB collections because the existing systems already use MongoDB heavily.

## `subscribers`

One row per email address.

```js
{
  _id: ObjectId,
  email: "person@example.com",
  emailLower: "person@example.com",
  firstName: "Vitor",
  name: "Vitor Gomes",
  source: "agulhada-backend:user",
  userId: "auth-user-id",
  status: "subscribed", // subscribed | unsubscribed | bounced | complained | suppressed
  tags: ["registered", "paid"],
  custom: { status: "active" },
  subscribedAt: Date,
  unsubscribedAt: Date,
  unsubscribeReason: "user",
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- unique `emailLower`
- `status`
- `userId`
- `tags`

## `lists`

```js
{
  _id: ObjectId,
  slug: "agulhada-newsletter",
  name: "Agulhada Newsletter",
  description: "Registered users who opted into product updates.",
  createdAt: Date,
  updatedAt: Date
}
```

## `list_members`

Keeps list membership separate from the subscriber so one person can be on several topics.

```js
{
  _id: ObjectId,
  listId: ObjectId,
  subscriberId: ObjectId,
  status: "active", // active | unsubscribed
  subscribedAt: Date,
  unsubscribedAt: Date
}
```

Indexes:

- unique `{ listId, subscriberId }`
- `{ subscriberId, status }`

## `email_templates`

```js
{
  _id: ObjectId,
  slug: "welcome",
  name: "Welcome",
  category: "transactional", // transactional | campaign
  subject: "Seus primeiros passos no Agulhada.com",
  html: "<p>Oi {{firstName}}</p>",
  text: "Oi {{firstName}}",
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- unique `slug`
- `category`

## `campaigns`

```js
{
  _id: ObjectId,
  name: "CST 30 days follow-up",
  listId: ObjectId,
  templateId: ObjectId,
  subjectOverride: "Ainda quer testar o Agulhada?",
  status: "draft", // draft | queued | sending | sent | paused | cancelled
  scheduledAt: Date,
  sentAt: Date,
  stats: {
    queued: 0,
    sent: 0,
    delivered: 0,
    bounced: 0,
    complained: 0,
    unsubscribed: 0,
    failed: 0
  },
  createdAt: Date,
  updatedAt: Date
}
```

## `email_jobs`

```js
{
  _id: ObjectId,
  kind: "campaign", // campaign | transactional
  status: "pending", // pending | leased | sent | retrying | failed | suppressed
  campaignId: ObjectId,
  templateId: ObjectId,
  subscriberId: ObjectId,
  to: "person@example.com",
  toName: "Person",
  subject: "Subject",
  data: { firstName: "Person" },
  category: "marketing",
  unsubscribeToken: "signed-token",
  sesMessageId: "010f...",
  attempts: 0,
  nextAttemptAt: Date,
  leasedUntil: Date,
  lastError: "string",
  createdAt: Date,
  updatedAt: Date,
  sentAt: Date
}
```

Indexes:

- `{ status: 1, nextAttemptAt: 1 }`
- `{ campaignId: 1, subscriberId: 1 }`
- `sesMessageId`
- TTL/index strategy can be added later for old completed jobs.

## `email_events`

Raw SES/SNS event storage.

```js
{
  _id: ObjectId,
  provider: "ses",
  eventType: "Bounce",
  sesMessageId: "010f...",
  email: "person@example.com",
  campaignId: ObjectId,
  subscriberId: ObjectId,
  payload: {},
  createdAt: Date
}
```

## `suppressions`

```js
{
  _id: ObjectId,
  emailLower: "person@example.com",
  reason: "bounce", // bounce | complaint | unsubscribe | manual
  scope: "global", // global | marketing
  source: "ses",
  details: {},
  createdAt: Date
}
```

Indexes:

- unique `{ emailLower, scope }`
- `reason`

