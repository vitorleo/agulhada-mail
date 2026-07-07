## Why

Creating a campaign currently requires assembling CSV data and manually calling several authenticated API endpoints in the correct order. A local-only web UI will make this workflow repeatable and easier to review while keeping campaign administration unavailable from the VPS and public internet.

## What Changes

- Add a local campaign administration web UI that runs only when explicitly started in the developer environment and binds only to the loopback interface.
- Provide a guided workflow to select a registered campaign template, upload and validate a CSV recipient list, review recipients and exclusions, send a test email, create a campaign, and enqueue it.
- Allow the loopback-only admin server to connect directly to the configured MongoDB for list, subscriber, campaign, preflight, and queue administration.
- Route every operation that sends an email immediately, including controlled test sends, through the authenticated VPS API.
- Do not provide or start a local email worker; queued campaign email is delivered only by the worker running on the VPS.
- Keep the VPS admin API token and database credentials on the local server side; the browser UI will not receive or store them.
- Add a pre-enqueue eligibility summary and require explicit typed confirmation before creating sendable campaign jobs.
- Show clear completion results, including imported, invalid, duplicate, suppressed, eligible, and queued recipient counts.
- Ensure the local UI is not started by production scripts, included in VPS process configuration, or exposed by the production API server.

## Capabilities

### New Capabilities

- `local-campaign-ui`: A loopback-only campaign administration workflow for preparing, validating, testing, creating, and enqueueing campaigns.

### Modified Capabilities

None.

## Impact

- Adds a dedicated local admin server entry point, local UI assets/components, and an `npm run admin` development command.
- Reuses the existing React Email registry, MongoDB collections, suppression rules, VPS API, and campaign queue behavior.
- May extract existing subscriber import and campaign queue logic into shared application services so local MongoDB administration applies the same rules as the existing API.
- Adds tests for loopback binding, recipient validation and summaries, confirmation safeguards, VPS-only send routing, and campaign workflow behavior.
- Does not change VPS startup commands, public routes, unsubscribe behavior, or worker delivery behavior.
