## Context

`didineedles/api/acceptPromo/index.js` validates a promo code, grants a `VIP30` trial subscription, and then sends a welcome email through `api/common/emailer.js`. That emailer renders the local React Email `Welcome` template bundle and delivers it through Mailjet SMTP using `MAILJET_KEY` and `MAILJET_SECRET`.

Agulhada Mail already has the `welcome` React Email template, SES production delivery, authenticated `/api/transactional/send`, and SES event capture. This change prepares Agulhada Mail to be the sender for the `didineedles` accept-promo welcome email and documents the separate repo change for the user to apply later.

## Goals / Non-Goals

**Goals:**

- Ensure the Agulhada Mail `welcome` template can cover the accept-promo use case.
- Document the exact `didineedles` payload for `/api/transactional/send`.
- Produce a pasteable Codex prompt for making the `didineedles` change in a separate session.
- Keep `didineedles/api/sendemail` out of scope because it is a generic sender and may still need Mailjet until its callers are understood.
- Keep this session from editing the `didineedles` repo.

**Non-Goals:**

- Modify `C:\Users\Vitor\Documents\codebase\didineedles` from this repo/session.
- Remove Mailjet/Nodemailer from `didineedles`.
- Replace every didineedles email path.
- Change promo code validation, Mongo subscription updates, or user response behavior in `acceptPromo`.
- Build a new queueing mechanism for didineedles.

## Decisions

### Use the existing Agulhada Mail transactional API

The `didineedles` app should call `POST {AGULHADA_MAIL_API_URL}/api/transactional/send` with `templateSlug: "welcome"`. This avoids giving didineedles SES credentials and keeps rendering, SES configuration sets, and event tracking centralized.

Alternative considered: send through SES directly from didineedles. That would duplicate rendering and SES concerns and would bypass the Agulhada Mail event pipeline.

### Keep the `welcome` slug but document accept-promo data

The existing `welcome` transactional template is suitable for “Seus primeiros passos no Agulhada.com”. The didineedles prompt should pass `email`, `name`, `firstName`, `userId`, `promoCode`, and `promoLevel` so the template can personalize or later branch without changing the external contract.

Alternative considered: create a separate `accept-promo-welcome` template slug immediately. That may become useful later, but it is more moving parts for a first migration when the current welcome template is already the desired email.

### Replace only the `acceptPromo` welcome send

The separate didineedles change should replace only the `sendEmail(...)` call in `api/acceptPromo/index.js`. The generic `api/sendemail` endpoint and `api/common/emailer.js` should remain until their callers and templates are audited.

Alternative considered: replace `api/common/emailer.js` entirely. That risks changing unknown generic/manual sends and is not needed for this specific Mailjet SMTP path.

### Fail softly after the promo grant

If Agulhada Mail is unavailable after the promo subscription is granted, the didineedles function should log the email failure and still return the promo result. Email delivery should not undo the successful trial grant.

Alternative considered: fail the whole request when email fails. That would create a poor user experience and could cause duplicate/manual recovery work even though the promo was already granted.

## Risks / Trade-offs

- Agulhada Mail downtime after promo grant -> Log the failure and allow manual resend through `/api/transactional/send`.
- Shared admin token in didineedles settings -> Store in Azure Function settings only; consider a narrower external transactional token later.
- Existing `Welcome` template copy may not exactly match the didineedles copy -> Preview/send a controlled test before switching the endpoint.
- Generic `api/sendemail` still uses Mailjet -> Keep it unchanged until a separate audit confirms it can migrate safely.
- Duplicate accept-promo retries may send duplicate welcomes -> Keep the existing promo grant idempotency behavior and consider future email idempotency if duplicates appear.

## Migration Plan

1. Verify the local Agulhada Mail `welcome` template renders and sends through `/api/transactional/send`.
2. Add documentation with the expected `didineedles` payload and environment variables.
3. Create a prompt for Codex in the `didineedles` repo that replaces only the `acceptPromo` welcome send.
4. User applies the prompt in `didineedles` separately.
5. User deploys `didineedles` and tests a controlled promo acceptance.
6. Confirm Agulhada Mail receives SES `Send` and `Delivery` events.

Rollback: restore the old `sendEmail(...)` call in `api/acceptPromo/index.js` or temporarily skip the welcome email while Agulhada Mail is restored.

## Open Questions

- Should the `welcome` template include explicit copy mentioning the 30-day VIP trial, or remain a general first-steps email?
- Should Agulhada Mail add a narrower token for external transactional sends before didineedles uses it?
- Should didineedles eventually delete `api/common/emailer.js` after `api/sendemail` is audited?
