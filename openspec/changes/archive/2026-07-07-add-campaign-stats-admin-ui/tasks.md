## 1. Campaign Stats Aggregation

- [x] 1.1 Define a normalized campaign stats response shape with campaign metadata, job status counts, provider event counts, and unique open/click counts
- [x] 1.2 Implement a MongoDB-backed aggregation function for recent campaign stats using `campaigns`, `email_jobs`, and `email_events`
- [x] 1.3 Support focused aggregation for a single campaign id and return zero-filled counts for draft campaigns with no jobs or events
- [x] 1.4 Add tests covering mixed job statuses, draft campaigns with no jobs, delivery/bounce/complaint events, and repeated open/click deduplication

## 2. Local Admin API

- [x] 2.1 Add read-only local admin route(s) for campaign stats without importing mailer, queue, or worker modules
- [x] 2.2 Validate route inputs such as campaign id and optional limit values
- [x] 2.3 Ensure route responses expose only normalized stats and no privileged configuration or raw event payloads
- [x] 2.4 Extend local admin boundary tests to cover the stats route safety constraints

## 3. Local Admin UI

- [x] 3.1 Add a campaign stats section or tab to the existing local admin page with a refresh control
- [x] 3.2 Render a compact campaign stats table with campaign identity, status, queued/job status counts, delivery counts, unique opens, total opens, unique clicks, and total clicks
- [x] 3.3 Connect enqueue completion to the stats view so the newly enqueued campaign can be refreshed or inspected directly
- [x] 3.4 Preserve accessibility behavior with semantic controls, visible labels, focus handling, and announced refresh errors/results

## 4. Verification

- [x] 4.1 Run `npm test`
- [x] 4.2 Run `npm run check`
- [x] 4.3 Manually exercise the local admin UI enough to confirm the stats table renders and refreshes without sending or leasing email
