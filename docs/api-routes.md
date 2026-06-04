# API Routes

All admin APIs require `Authorization: Bearer ${API_ADMIN_TOKEN}` for the MVP. In the Remix admin app, this should later be replaced by Kinde admin permissions, matching `agulhada-backend`.

## Health

`GET /health`

Returns `{ ok: true }`.

## Templates

`POST /api/templates`

```json
{
  "slug": "welcome",
  "name": "Welcome",
  "category": "transactional",
  "subject": "Seus primeiros passos no Agulhada.com",
  "html": "<p>Oi {{firstName}}</p>",
  "text": "Oi {{firstName}}"
}
```

## Subscribers

`POST /api/subscribers/import`

Accepts an array of subscribers from CSV/export scripts.

```json
{
  "listSlug": "agulhada-newsletter",
  "subscribers": [
    {
      "email": "person@example.com",
      "firstName": "Person",
      "name": "Person Example",
      "source": "agulhada-backend:user",
      "tags": ["registered"]
    }
  ]
}
```

## Campaigns

`POST /api/campaigns`

Creates a draft.

```json
{
  "name": "May update",
  "listSlug": "agulhada-newsletter",
  "templateSlug": "may-update",
  "subjectOverride": "Novidades do Agulhada"
}
```

`POST /api/campaigns/:campaignId/enqueue`

Enqueues one `email_jobs` document per active subscriber.

`POST /api/campaigns/:campaignId/pause`

Pauses sending. Existing leased jobs may finish.

## Transactional Email

`POST /api/transactional/send`

Sends immediately through SES.

```json
{
  "templateSlug": "welcome",
  "to": "person@example.com",
  "toName": "Person",
  "bcc": "Agulhada.com <contato@agulhada.com>",
  "data": {
    "firstName": "Person"
  }
}
```

`bcc` is optional and may be either a single recipient string or an array of recipient strings:

```json
{
  "bcc": [
    "Agulhada.com <contato@agulhada.com>",
    "support@example.com"
  ]
}
```

BCC recipients are delivery metadata. They are format-validated before sending, passed to SES as blind-copy recipients, and are not added to template `data`.

Transactional email ignores marketing unsubscribe, but respects complaint, hard bounce, and manual global suppression.

## Unsubscribe

`GET /u/:token`

Shows a minimal unsubscribe confirmation page.

`POST /u/:token`

Unsubscribes the subscriber from campaign/list email and creates a marketing suppression.

## SES Webhook

`POST /webhooks/ses?secret=${SNS_WEBHOOK_SECRET}`

Receives Amazon SNS messages for SES events. For production, validate SNS signatures before trusting payloads.

Events handled:

- `Bounce`: save event; suppress permanent bounces globally.
- `Complaint`: save event; suppress globally.
- `Delivery`, `Send`, `Open`, `Click`, `Reject`, `Rendering Failure`, `DeliveryDelay`, `Subscription`: save event and update delivery stats where possible.
