## 1. Agulhada Mail Welcome Readiness

- [x] 1.1 Verify the registered `welcome` template renders with didineedles accept-promo data.
- [x] 1.2 Decide whether the existing `welcome` subject should remain generic or support the didineedles first-steps subject.
- [x] 1.3 If needed, update the `welcome` template copy to cover the accept-promo first-steps use case.
- [x] 1.4 Run local render and TypeScript checks for the `welcome` template.

## 2. External Transactional Request Documentation

- [x] 2.1 Document the `/api/transactional/send` payload for didineedles accept-promo.
- [x] 2.2 Document required didineedles environment variables: `AGULHADA_MAIL_API_URL` and `AGULHADA_MAIL_API_TOKEN`.
- [x] 2.3 Document expected success, unauthorized, suppressed-recipient, and transient-failure behavior.
- [x] 2.4 Include a local curl/PowerShell example for sending the didineedles accept-promo welcome request.

## 3. Didineedles Codex Prompt

- [x] 3.1 Create a pasteable prompt for Codex in the `didineedles` repo.
- [x] 3.2 In the prompt, scope the change to `api/acceptPromo/index.js` only.
- [x] 3.3 In the prompt, require preserving voucher validation, MongoDB updates, and response behavior.
- [x] 3.4 In the prompt, require leaving `api/sendemail` and `api/common/emailer.js` untouched unless the user explicitly decides otherwise.
- [x] 3.5 In the prompt, include timeout/error logging guidance and soft-fail email behavior.

## 4. Verification

- [x] 4.1 Send a controlled `welcome` transactional email with accept-promo-style data through Agulhada Mail.
- [x] 4.2 Confirm Mongo `email_events` receives SES `Send` and `Delivery` for the controlled test.
- [x] 4.3 Verify no files under `C:\Users\Vitor\Documents\codebase\didineedles` were changed by this session.
- [x] 4.4 Run `npm run check` in `agulhada-mail`.
- [x] 4.5 Update README or docs index with the new didineedles migration guide.
