## Context

Agulhada Mail already has the backend pieces required to send campaigns: registered React Email campaign templates, subscriber/list storage, suppression checks, campaign records, queue creation, and a rate-limited worker. The current operator workflow requires manually preparing JSON or PowerShell commands and provides no pre-enqueue review screen.

The administration UI is intended for one operator on the local development machine. Its server may connect directly to the configured MongoDB, including the production database, to manage lists, subscribers, campaign drafts, eligibility, and queued jobs. It MUST NOT connect to SES or run an email worker. Immediate sends are requested from the authenticated API hosted on the VPS, and queued campaign jobs are delivered only by the VPS worker.

The UI itself must never be reachable from the VPS or another network host. Enqueueing remains an irreversible operational boundary because the VPS worker can begin sending queued jobs immediately.

## Goals / Non-Goals

**Goals:**

- Provide one guided local workflow for CSV validation, recipient import, campaign test sending, campaign creation, eligibility review, and enqueueing.
- Make the selected template, subject, list, recipient counts, exclusions, and final action clear before enqueueing.
- Keep secrets and privileged operations in a loopback-only server process.
- Ensure all immediate and queued email delivery executes on the VPS, never in the local admin process.
- Reuse the existing campaign rules and data model so UI-created campaigns behave like API-created campaigns.
- Make forms keyboard-accessible, semantically structured, and clear about validation and progress.

**Non-Goals:**

- Hosting an admin UI on the VPS or adding public admin authentication.
- Starting, stopping, or monitoring the campaign worker from the UI.
- Sending email through local AWS credentials, a local SES client, or a local worker.
- Building a general campaign analytics dashboard, template editor, subscriber CRM, or scheduling system.
- Changing SES delivery, unsubscribe, suppression, or retry semantics.
- Supporting concurrent operators or preserving unfinished wizard state across local server restarts.

## Decisions

### Use a separate loopback-only admin process

Add a dedicated local admin entry point started with `npm run admin`. It MUST call `listen` with `127.0.0.1` explicitly and MUST use a separate admin port configuration with a safe local default. The production `start` command and VPS documentation/process configuration remain unchanged.

This is preferred over mounting admin routes in the existing API because the existing API is intentionally deployed behind the public `email.agulhada.com` endpoint. A runtime environment flag on public routes would be easier to misconfigure.

### Split local MongoDB administration from VPS email delivery

The local browser communicates only with the loopback admin server. The admin server reads MongoDB credentials, the VPS API base URL, and the VPS API admin token from local environment configuration; it does not send those values or any AWS credentials to browser code.

The local admin server connects directly to MongoDB for subscriber/list import, campaign creation, eligibility calculation, and guarded queue creation. Existing route implementations for those operations should be extracted into shared application services where needed so local administration and the existing API apply identical rules.

Any operation that immediately sends an email, including the controlled test send, MUST be proxied by the local admin server to the authenticated VPS API. The local admin process MUST NOT instantiate the SES sender or import/run worker processing functions. The VPS worker is the only process permitted by this workflow to lease and deliver queued campaign jobs.

Calling the VPS API from browser JavaScript was rejected because it would expose the admin bearer token and create cross-origin configuration. Routing immediate sends through the loopback server keeps the token server-side.

### Use a small server-backed UI with progressive enhancement

Serve local admin HTML, CSS, and minimal browser JavaScript from the local admin process. Avoid introducing a frontend framework or bundler for this small single-operator workflow. Use semantic forms, visible labels, native validation, fieldsets, a labeled progress indicator, status text announced with `aria-live`, and accessible error summaries.

The workflow has these stages:

1. Select a registered campaign template and enter campaign/list details.
2. Upload a CSV and review valid, invalid, duplicate, and existing/suppressed recipient counts.
3. Import the reviewed recipients into the selected list.
4. Request a one-recipient test email from the VPS API and record its success or failure in the UI.
5. Create the draft campaign and show a pre-enqueue eligibility summary.
6. Require typed confirmation using the campaign name, then enqueue and display the queued count.

Back navigation is allowed before enqueueing. Submissions are protected against accidental double-posts while requests are in progress.

### Parse and validate CSV on the local server

Use a maintained CSV parser rather than splitting lines manually. Accept a required `email` column and optional `firstName`, `name`, `source`, and `userId` columns. Normalize header names, trim values, validate email addresses, and deduplicate case-insensitively.

The preview response reports row-level validation problems without importing data. Import operates on a server-issued short-lived preparation identifier rather than trusting a second browser-supplied copy of the parsed recipients. Preparation state may remain in local process memory because this is a single-user, non-durable tool.

### Add a read-only eligibility preflight and local queue administration

Extract the recipient selection used by enqueueing into a shared preflight service. It calculates active list members, subscribed recipients, global/marketing suppressions, already-existing campaign jobs, and the number eligible to queue without creating jobs.

The local admin server may create campaign jobs directly in the shared MongoDB after guarded confirmation. Enqueue reruns eligibility checks at operation time and returns actual queued and excluded counts. The preflight is informative, not a promise that database state cannot change. Creating jobs does not send them; only the VPS worker leases and sends them.

### Make enqueueing a strongly guarded action

The enqueue control appears only after the campaign draft exists and preflight completes. The operator MUST type the exact campaign name and acknowledge that the VPS worker may send immediately. The local server validates the confirmation again before creating queue jobs.

A generic confirmation dialog alone was rejected because it is too easy to accept reflexively for a consequential action.

## Risks / Trade-offs

- [Local UI can directly affect production MongoDB data] -> Display the selected database name and VPS API base URL prominently on every step and repeat them on the final confirmation screen.
- [A VPS worker may send immediately after enqueue] -> State this beside the enqueue action, require typed confirmation, and keep enqueue separate from draft creation.
- [A future implementation could accidentally send locally] -> Do not configure AWS credentials for the admin process, do not expose worker controls, and add tests proving test sends call the VPS API while local code only creates jobs.
- [The preflight count can become stale] -> Re-evaluate eligibility during enqueue and display the actual result.
- [In-memory CSV preparation is lost when the local admin restarts] -> Require re-upload; unfinished preparation is intentionally non-durable.
- [Extracting shared services can accidentally alter API behavior] -> Add service-level tests and API regression tests before wiring the UI.
- [A future deployment could accidentally start the local process] -> Keep it out of `start`, build/deploy instructions, and VPS process configuration; add an automated binding test asserting loopback-only listen options.

## Migration Plan

1. Extract and test shared MongoDB campaign preparation and enqueue services without changing existing API behavior.
2. Add the authenticated VPS API capability required for local controlled test sends.
3. Add the loopback-only local admin server, UI assets, and `npm run admin` without local SES or worker startup.
4. Document the local workflow and explicitly document that the command must not be added to VPS startup.
5. Test with an internal recipient list and a development database before using it against production data.

Rollback consists of stopping the local admin process and removing the `admin` script and local UI modules. Existing campaigns, VPS API routes, and worker behavior remain compatible.

## Open Questions

- None required before implementation. The initial implementation will use a configurable `LOCAL_ADMIN_PORT` with a localhost-only default and will support CSV files up to the existing practical campaign range of approximately 5,000 recipients.
