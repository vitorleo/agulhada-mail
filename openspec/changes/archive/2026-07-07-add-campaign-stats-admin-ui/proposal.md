## Why

Campaign sends currently move through the queue and SES event pipeline, but the local admin workflow does not give an operator a campaign-level view of what happened after enqueue. Operators need a quick way to answer how many emails are queued, sent, opened, clicked, failed, or suppressed for each campaign before deciding whether to follow up or investigate delivery.

## What Changes

- Add a read-only campaign stats view to the existing local admin UI.
- Show campaign rows with identity and status details, including name, template, subject, created/updated timestamps, and current campaign status.
- Show per-campaign counts for queued jobs, pending/leased jobs, sent jobs, failed/retrying/suppressed jobs, SES delivery events, open events, and click events.
- Derive stats from MongoDB campaign, job, and email event collections without sending email locally or exposing privileged credentials to the browser.
- Allow operators to refresh stats and inspect a single campaign after enqueue without leaving the local admin workflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-campaign-ui`: Adds read-only campaign delivery and engagement stats to the local administration workflow.

## Impact

- Affects `src/localAdmin/routes.ts`, local admin client assets, and shared campaign service code.
- Reads from MongoDB `campaigns`, `email_jobs`, and `email_events`.
- May add tests for campaign stat aggregation and local admin route responses.
- Does not change production API startup, SES sending, worker behavior, unsubscribe behavior, or credential exposure rules.
