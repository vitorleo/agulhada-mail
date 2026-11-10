## Context

The local campaign admin process already binds to `127.0.0.1`, keeps credentials server-side, reads campaign/list/subscriber data directly from MongoDB, and leaves delivery to the VPS worker. Campaign enqueue creates `email_jobs` records with `campaignId`, and the worker tags SES sends with campaign, subscriber, and job identifiers. The SES webhook stores provider events in `email_events` with `campaignId` and `subscriberId` when SES tags are present.

The current UI supports setup, recipient import, test send, draft creation, preflight, and enqueue, but it does not expose post-enqueue campaign outcomes. The stats view should extend this local-only workflow without changing production delivery.

## Goals / Non-Goals

**Goals:**

- Show campaign-level delivery and engagement stats in the local admin UI.
- Provide counts for queued/pending work, sent jobs, delivered events, opens, clicks, failures, retries, and suppressions.
- Prefer unique-recipient engagement counts for operator decisions while still exposing total event counts for repeat opens/clicks.
- Keep all privileged MongoDB reads on the loopback server.
- Make aggregation testable in shared campaign/admin service code.

**Non-Goals:**

- Do not send, lease, retry, cancel, or mutate campaign jobs from the stats view.
- Do not add production public APIs or mount the local UI in the production server.
- Do not backfill historical SES events that lack campaign tags.
- Do not introduce charts or external analytics dependencies in the first implementation.

## Decisions

1. Add a local admin stats route backed by a shared aggregation function.

   The route should expose a read-only endpoint such as `GET /api/campaigns/stats` with optional paging/limit, and optionally `GET /api/campaigns/:campaignId/stats` for a focused row after enqueue. The aggregation function should live with campaign service code or a small local admin service so tests can call it without starting Express.

   Alternative considered: compute stats entirely in browser after loading raw records. That would expose more data than necessary and make the browser handle privileged collection shape.

2. Derive queue and send counts from `email_jobs`.

   Job status counts should group by `campaignId` and `status`. `queued` should mean all jobs created for the campaign. `pending`, `leased`, `retrying`, `sent`, `failed`, and `suppressed` should be reported separately so the UI can show both headline totals and operational state.

   Alternative considered: trust `campaigns.stats.queued`. That field is useful as a snapshot, but grouping current jobs prevents drift and supports retries/suppression counts.

3. Derive engagement and provider delivery counts from `email_events`.

   Event counts should group by `campaignId` and SES `eventType`. `Delivery`, `Open`, `Click`, `Bounce`, and `Complaint` are the main events to surface. For `Open` and `Click`, compute both total event counts and unique subscriber/email counts because a recipient can open or click multiple times.

   Alternative considered: update campaign documents whenever an SES event arrives. That would make the webhook write path more complex and still require deduplication logic.

4. Keep the UI dense and operational.

   Add a campaign stats section/tab to the existing local admin page that lists recent campaigns in a table with refresh controls. Use compact metric cells and status text rather than marketing-style cards. The current workflow can link or scroll to the stats section after enqueue.

   Alternative considered: create a separate dashboard app. The existing admin process already owns this operator workflow, so a second surface would add more navigation and startup overhead.

## Risks / Trade-offs

- Historical events may be missing `campaignId` if they were sent without SES tags -> Show zero/unknown stats for those campaigns and document that stats depend on tagged sends.
- SES can emit multiple open/click events per recipient -> Display unique and total counts distinctly, with unique counts emphasized.
- Aggregating many campaigns could become slow as events grow -> Default to recent campaigns or a bounded limit, and use MongoDB aggregation grouped by campaign/status/event type. Add indexes later if production data requires it.
- Job status and SES event counts can disagree temporarily -> Present them as separate operational and provider/engagement metrics rather than forcing them to reconcile.
- Manual campaign sends are tagged as `source: manual-send` without campaign id -> Keep this view scoped to queued campaigns only.

## Migration Plan

1. Add the aggregation service and tests with representative campaigns, jobs, and events.
2. Add read-only local admin route(s) that call the service and return normalized JSON.
3. Update the local admin UI with a campaign stats table and refresh behavior.
4. Verify `npm test` and `npm run check`.

Rollback is straightforward because the change is additive: remove or hide the stats route and UI section without changing existing campaign enqueue or worker behavior.
