## 1. Shared Campaign Services

- [x] 1.1 Extract subscriber/list import logic from the API route into a shared service while preserving current API behavior
- [x] 1.2 Extract draft campaign creation and registered campaign template listing into shared services
- [x] 1.3 Implement a read-only campaign eligibility preflight service with active, unsubscribed, suppressed, existing-job, and eligible counts
- [x] 1.4 Refactor enqueueing to reuse the eligibility rules, rerun them at enqueue time, and return actual queued and excluded counts
- [x] 1.5 Add or confirm an authenticated VPS API endpoint for campaign-category controlled test sends with suppression and unsubscribe behavior
- [x] 1.6 Add service and API regression tests for import, preflight, VPS test send, campaign creation, and idempotent enqueue

## 2. Local Admin Server

- [x] 2.1 Add local admin configuration with a safe default port and an explicit `127.0.0.1` listen address
- [x] 2.2 Add a dedicated local admin server entry point and `npm run admin` command without changing production start commands
- [x] 2.3 Add local admin handlers using direct MongoDB access for environment summary, campaign templates, CSV preview/import, draft creation, preflight, and guarded enqueue
- [x] 2.4 Add a local server-side VPS API client for controlled test sends that keeps the admin token out of browser code
- [x] 2.5 Add structured CSV parsing, validation, case-insensitive deduplication, row-level errors, upload limits, and short-lived in-memory preparation identifiers
- [x] 2.6 Ensure local admin responses and browser assets never expose privileged configuration values
- [x] 2.7 Ensure the local admin entry point does not instantiate SES, lease jobs, process jobs, or start a worker
- [x] 2.8 Add tests proving loopback-only binding, VPS-routed test sends, no local send/worker behavior, preparation expiry, and server-side enqueue confirmation validation

## 3. Guided Campaign UI

- [x] 3.1 Build the semantic workflow shell with environment banner, labeled progress indicator, accessible forms, status announcements, and error summary behavior
- [x] 3.2 Build campaign detail and registered-template selection with effective subject review
- [x] 3.3 Build CSV upload and recipient review views showing valid, invalid, duplicate, imported, existing, and suppressed counts
- [x] 3.4 Build VPS-routed controlled test-send UI with explicit recipient entry and success or failure result
- [x] 3.5 Build draft creation and pre-enqueue eligibility summary views
- [x] 3.6 Build the final enqueue form requiring exact campaign-name confirmation and immediate-send acknowledgement
- [x] 3.7 Prevent double submissions, support backward navigation before enqueue, and show actual final queued and excluded counts
- [x] 3.8 Verify keyboard-only operation, visible focus, native validation timing, non-color-only states, and dynamic result announcements

## 4. Documentation And Verification

- [x] 4.1 Document `npm run admin`, required MongoDB and VPS API configuration, the CSV format, and the full campaign workflow
- [x] 4.2 Document that localhost administers MongoDB but all immediate and queued email delivery occurs on the VPS
- [x] 4.3 Document that the local admin command must not be added to VPS startup, nginx, or production process configuration
- [x] 4.4 Add an internal-recipient smoke-test checklist covering preview, import, VPS test send, preflight, confirmation rejection, enqueue, and VPS worker delivery
- [x] 4.5 Run type checking, automated tests, and a local browser walkthrough of the complete workflow
