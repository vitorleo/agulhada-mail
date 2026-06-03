## 1. Agulhada Mail Welcome Readiness

- [ ] 1.1 Verify the registered `welcome` template renders with didineedles accept-promo data.
- [ ] 1.2 Decide whether the existing `welcome` subject should remain generic or support the didineedles first-steps subject.
- [ ] 1.3 If needed, update the `welcome` template copy to cover the accept-promo first-steps use case.
- [ ] 1.4 Run local render and TypeScript checks for the `welcome` template.

## 2. External Transactional Request Documentation

- [ ] 2.1 Document the `/api/transactional/send` payload for didineedles accept-promo.
- [ ] 2.2 Document required didineedles environment variables: `AGULHADA_MAIL_API_URL` and `AGULHADA_MAIL_API_TOKEN`.
- [ ] 2.3 Document expected success, unauthorized, suppressed-recipient, and transient-failure behavior.
- [ ] 2.4 Include a local curl/PowerShell example for sending the didineedles accept-promo welcome request.

## 3. Didineedles Codex Prompt

- [ ] 3.1 Create a pasteable prompt for Codex in the `didineedles` repo.
- [ ] 3.2 In the prompt, scope the change to `api/acceptPromo/index.js` only.
- [ ] 3.3 In the prompt, require preserving voucher validation, MongoDB updates, and response behavior.
- [ ] 3.4 In the prompt, require leaving `api/sendemail` and `api/common/emailer.js` untouched unless the user explicitly decides otherwise.
- [ ] 3.5 In the prompt, include timeout/error logging guidance and soft-fail email behavior.

## 4. Verification

- [ ] 4.1 Send a controlled `welcome` transactional email with accept-promo-style data through Agulhada Mail.
- [ ] 4.2 Confirm Mongo `email_events` receives SES `Send` and `Delivery` for the controlled test.
- [ ] 4.3 Verify no files under `C:\Users\Vitor\Documents\codebase\didineedles` were changed by this session.
- [ ] 4.4 Run `npm run check` in `agulhada-mail`.
- [ ] 4.5 Update README or docs index with the new didineedles migration guide.
