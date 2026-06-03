## Context

`needles/stripewh/index.js` is an Azure Function that handles Stripe webhook events. It updates MongoDB subscription fields, sends Telegram notifications, and currently sends the welcome email on `invoice.payment_succeeded` when `billing_reason === "subscription_create"`.

The welcome email path is still implemented with `node-mailjet`, Mailjet API keys, and Mailjet template `6419616`. `agulhada-mail` now has SES production access, an authenticated `/api/transactional/send` route, and a React Email `welcome` transactional template. The safest migration is for the Azure Function to call Agulhada Mail over HTTPS rather than embedding SES credentials or React Email rendering into the Azure Function. This change documents that migration and prepares/verifies the Agulhada Mail side only; it does not modify the `needles` repository.

## Goals / Non-Goals

**Goals:**

- Document how to replace the Stripe webhook welcome email path with an authenticated call to Agulhada Mail.
- Use the registered `welcome` transactional React Email template.
- Provide guidance for removing the Mailjet dependency from this welcome email path.
- Keep Stripe webhook response behavior stable so email failures do not cause avoidable Stripe retries.
- Log enough information to debug failed welcome email sends.
- Keep MongoDB subscription updates and Telegram notifications unchanged.

**Non-Goals:**

- Rewrite or edit the Stripe webhook function in this change.
- Touch the `needles` repository.
- Move Stripe webhook hosting from Azure Functions to the VPS.
- Replace Telegram notification delivery.
- Change campaign email behavior.
- Remove every Mailjet reference in the `needles` repo in this first step if other paths still use it.

## Decisions

### Use Agulhada Mail HTTP API from the Azure Function

The recommended Azure Function change is to call `POST {AGULHADA_MAIL_API_URL}/api/transactional/send` with a bearer token. The payload should use `templateSlug: "welcome"`, `to`, `toName`, and template data including `email`, `name`, `firstName`, `userId`, and Stripe identifiers when available.

Alternative considered: send through SES directly from Azure. That would duplicate SES credentials, rendering logic, configuration set tagging, and delivery event handling outside Agulhada Mail.

### Keep webhook success independent from welcome email delivery success

If Agulhada Mail returns an error or times out, the Azure Function should log the failure but still complete Stripe webhook handling after subscription state updates. Stripe webhook retries should be reserved for failures that affect Stripe state processing, not email notification delivery.

Alternative considered: fail the webhook when welcome email fails. That can create duplicate subscription-processing attempts and makes email availability a dependency of payment handling.

### Use the existing admin bearer token initially

The current Agulhada Mail route already uses `API_ADMIN_TOKEN`. The Azure Function can use that token for the first migration. A narrower external transactional token can be added later if needed.

Alternative considered: add a new token immediately. Better security long term, but it increases scope; the existing authenticated route is sufficient for the first cut if the token is stored in Azure Function app settings.

### Remove Mailjet only from this path

`sendWelcomeEmail` in `stripewh/index.js` should stop constructing a Mailjet client and should become an Agulhada Mail client call. Mailjet environment variables can be removed from this function once no other code path in the deployed function uses them. This change will document that recommended edit for manual application.

Alternative considered: keep Mailjet as fallback. That slows the migration and keeps old credentials/templates active. If rollback is needed, git can revert the function change.

## Risks / Trade-offs

- Agulhada Mail downtime can prevent welcome emails -> Log failures, keep Stripe processing successful, and allow manual resend through the transactional API.
- Shared admin token has broad access -> Store only in Azure app settings and consider a narrower token in a future hardening change.
- Customer name parsing may be imperfect -> Pass both full name and derived first name; the template can gracefully fall back.
- Duplicate Stripe events can send duplicate welcome emails -> Consider idempotency using Stripe invoice/event id in a later enhancement if duplicates appear.
- Network latency from Azure to VPS can slow webhook execution -> Use a short timeout for the email API call.

## Migration Plan

1. Confirm Agulhada Mail production endpoint is reachable from Azure.
2. Add Azure Function app settings:
   - `AGULHADA_MAIL_API_URL`
   - `AGULHADA_MAIL_API_TOKEN`
3. Document the recommended `sendWelcomeEmail` replacement for `needles/stripewh/index.js`.
4. Document which Mailjet imports/environment variables can be removed from that function.
5. Test Agulhada Mail directly with the `welcome` transactional template.
6. After the user applies the documented change in `needles`, test with a local/sample `invoice.payment_succeeded` payload or a Stripe test event.
7. Verify Agulhada Mail returns a SES message id and Mongo receives `Send`/`Delivery`.
8. Remove Mailjet credentials from the deployed function after confirming no deployed path still needs them.

Rollback: revert the Azure Function change to the previous Mailjet sender or temporarily disable welcome email sends while Agulhada Mail is restored.

## Open Questions

- Should we add a narrower `EXTERNAL_TRANSACTIONAL_TOKEN` now, or use `API_ADMIN_TOKEN` for the first migration?
- Should welcome email sends be idempotent by Stripe invoice id in this change or in a follow-up?
- Should the Azure Function await the email call or queue it asynchronously through Agulhada Mail in a later version?
