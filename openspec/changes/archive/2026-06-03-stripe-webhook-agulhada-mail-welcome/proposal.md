## Why

The Stripe webhook in `needles/stripewh/index.js` still sends the subscription welcome email through Mailjet template `6419616`. Now that Agulhada Mail has SES production access and a React Email `welcome` template, welcome email delivery should move to the new centralized email system so Mailjet can be turned off.

## What Changes

- Add a secure API path in `agulhada-mail` for external systems to send the registered transactional `welcome` template.
- Document the Stripe webhook integration plan so `invoice.payment_succeeded` with `billing_reason === "subscription_create"` can call Agulhada Mail instead of Mailjet.
- Provide recommended replacement code/configuration for the Mailjet welcome email path, without changing the `needles` repo in this change.
- Pass recipient data from Stripe to Agulhada Mail, including email, customer name, and user id when available.
- Preserve the existing Stripe subscription updates and Telegram notifications.
- Ensure failed welcome-email calls are logged without breaking Stripe webhook handling.

## Capabilities

### New Capabilities

- `external-transactional-email`: Defines how trusted external systems request transactional emails from Agulhada Mail.
- `stripe-welcome-email-handoff`: Defines how the Stripe webhook triggers the Agulhada welcome email through Agulhada Mail instead of Mailjet.

### Modified Capabilities

None.

## Impact

- `agulhada-mail` API: adds or documents a secure transactional send contract suitable for the Azure Function.
- Documentation: provides the recommended `needles/stripewh/index.js` change for the user to apply manually.
- Environment variables: Stripe webhook needs Agulhada Mail base URL and API token; Mailjet keys are no longer needed for this welcome path.
- SES/Mongo: welcome sends flow through existing SES configuration set, SNS webhook, and `email_events`.
- Operations: deployment requires updating Azure Function app settings before removing Mailjet credentials.
