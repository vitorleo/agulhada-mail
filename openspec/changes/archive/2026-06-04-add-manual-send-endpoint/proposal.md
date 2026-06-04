## Why

Trusted admin systems such as `agulhada-backend` need a safe one-off send path that can use the React Email template registry without building direct SES or unsubscribe logic outside Agulhada Mail. This change centralizes manual sends in Agulhada Mail so suppression checks, marketing unsubscribe handling, and template rendering remain owned by the mail service.

## What Changes

- Add an authenticated `POST /api/manual/send` API for trusted admin callers.
- Allow the endpoint to send registered React Email templates by `templateSlug`, including both transactional and campaign categories.
- Accept recipient identity, template data, and an optional trusted `subjectOverride`.
- Preserve compliance behavior by checking global suppressions for all sends and marketing suppressions for campaign/manual marketing sends.
- Ensure campaign/manual marketing sends generate and include Agulhada Mail unsubscribe handling before sending through SES.
- Return `202 { ok: true, messageId }` when SES accepts the send and structured non-2xx errors for validation, auth, suppression, template, render, and send failures.
- Continue using the existing bearer admin authentication for now.
- Do not require changes in `agulhada-backend` or `didineedles` as part of this change.

## Capabilities

### New Capabilities
- `manual-email-send`: Covers the authenticated manual send endpoint, request/response contract, template category handling, suppression behavior, unsubscribe handling, subject overrides, and error behavior.

### Modified Capabilities

None.

## Impact

- Adds a new HTTP API route under `POST /api/manual/send`.
- Reuses existing bearer admin auth, React Email template registry/rendering, suppression checks, unsubscribe token/link generation, and SES sender.
- May require small shared helpers so manual sends and existing send paths apply the same compliance and SES behavior consistently.
- Adds tests or verification coverage for authenticated manual sends across campaign and transactional templates, subject overrides, suppressions, unknown slugs, and invalid auth.
