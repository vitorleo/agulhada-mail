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

Enqueues one `email_jobs` document per eligible active subscriber and returns actual newly queued and excluded counts. Repeated requests do not create duplicate jobs.

`GET /api/campaigns/:campaignId/preflight`

Returns active member, unsubscribed, suppressed, existing-job, and currently eligible counts without creating jobs.

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

## Manual Email

`POST /api/manual/send`

Sends a trusted one-off React Email template through SES for admin tools such as `agulhada-backend`.

```json
{
  "templateSlug": "trial-expiring",
  "to": "person@example.com",
  "toName": "Person",
  "subjectOverride": "Optional trusted admin subject",
  "data": {
    "email": "person@example.com",
    "firstName": "Person",
    "name": "Person",
    "userId": "agulhada-user-id"
  }
}
```

`subjectOverride` is optional. When present, Agulhada Mail uses it as the SES subject; otherwise it uses the registered React Email template subject.

The manual endpoint supports registered React Email transactional and campaign templates. Callers do not send a category; Agulhada Mail resolves the category from the template registry.

Compliance behavior:

- Transactional templates check global suppressions only and do not require marketing unsubscribe handling.
- Campaign templates check both global and marketing suppressions.
- Campaign templates receive an Agulhada Mail unsubscribe URL before rendering and are sent with List-Unsubscribe headers.

Success returns:

```json
{
  "ok": true,
  "messageId": "ses-message-id"
}
```

The endpoint returns structured non-2xx JSON errors for invalid auth, validation failures, unknown templates, suppressions, rendering failures, and SES send failures.

This endpoint is implemented only in Agulhada Mail. This change does not modify `agulhada-backend` or `didineedles`.

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
