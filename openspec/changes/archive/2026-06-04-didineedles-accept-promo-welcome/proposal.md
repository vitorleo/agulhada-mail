## Why

`didineedles/api/acceptPromo/index.js` still sends the promotion welcome email through Mailjet SMTP after granting the 30-day VIP trial. Agulhada Mail already owns SES delivery and React Email transactional templates, so the accept-promo welcome path should be prepared for migration to the centralized email system.

## What Changes

- Ensure Agulhada Mail has a transactional welcome template suitable for the `didineedles` accept-promo flow.
- Document the exact external transactional payload that `didineedles/api/acceptPromo/index.js` should send.
- Create a pasteable Codex prompt for applying the `didineedles` repo change in a separate session.
- Keep this session scoped to `agulhada-mail`; do not edit the `didineedles` repo here.
- Preserve the existing `didineedles` promo grant behavior: MongoDB user update, voucher validation, and response payload must remain unchanged.
- Recommend replacing only the Mailjet welcome send call in `acceptPromo`, not the generic `api/sendemail` endpoint.

## Capabilities

### New Capabilities

- `didineedles-accept-promo-handoff`: Defines how the `didineedles` accept-promo flow should hand off its welcome email to Agulhada Mail.

### Modified Capabilities

- `react-email-templates`: Add requirements for the welcome template to support accept-promo transactional data and subject expectations.
- `external-transactional-email`: Add requirements for accepting a trusted `didineedles` welcome request through the transactional API.

## Impact

- `agulhada-mail` templates/docs: may adjust or document the `welcome` template for accept-promo usage.
- `agulhada-mail` transactional API: existing `/api/transactional/send` remains the target integration point.
- `didineedles` repo: no changes in this session; user will apply a separate Codex prompt there.
- Mailjet: `didineedles/api/acceptPromo` can stop sending through Mailjet SMTP after the separate repo change is applied.
