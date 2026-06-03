## 1. Agulhada Mail API Readiness

- [x] 1.1 Confirm `/api/transactional/send` supports the registered `welcome` React Email template.
- [x] 1.2 Add or document the external request payload expected by the Stripe webhook.
- [x] 1.3 Add a local script or curl example for sending the `welcome` template through the HTTP API.
- [x] 1.4 Verify suppressed recipients are still rejected by the transactional API.

## 2. Stripe Webhook Migration Documentation

- [x] 2.1 Add Azure Function configuration variables for Agulhada Mail API URL and bearer token.
- [x] 2.2 Document the recommended `sendWelcomeEmail` replacement for `needles/stripewh/index.js`.
- [x] 2.3 Document how Stripe invoice data maps into the `welcome` template payload, including email, name, first name, user id, invoice id, and subscription id when available.
- [x] 2.4 Document which Mailjet imports and Mailjet environment variables can be removed from the Stripe webhook welcome path.
- [x] 2.5 Explicitly note that this change does not edit the `needles` repo and that subscription database updates and Telegram notifications should remain unchanged.

## 3. Resilience and Logging

- [x] 3.1 Add timeout/error handling around the Agulhada Mail request.
- [x] 3.2 Log welcome email failures with recipient and Stripe invoice context.
- [x] 3.3 Ensure email send failure does not undo completed Stripe subscription processing.

## 4. Verification

- [x] 4.1 Run local/static checks for `agulhada-mail`.
- [x] 4.2 Run available checks or syntax validation for the Stripe webhook function.
- [x] 4.3 Send a controlled `welcome` transactional email through Agulhada Mail.
- [x] 4.4 Confirm Mongo `email_events` receives SES `Send` and `Delivery` for the controlled welcome email.
- [x] 4.5 Document deployment steps for Azure Function settings and removal of Mailjet credentials.
