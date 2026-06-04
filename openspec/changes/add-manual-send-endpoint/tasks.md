## 1. Route Contract

- [x] 1.1 Add `POST /api/manual/send` behind the existing `requireAdmin` bearer admin middleware.
- [x] 1.2 Validate the manual send payload with `templateSlug`, `to`, optional `toName`, optional trimmed `subjectOverride`, and `data`.
- [x] 1.3 Return structured JSON errors for validation and authorization failures without rendering or sending email.

## 2. Template Resolution and Rendering

- [x] 2.1 Resolve `templateSlug` through the React Email registry and reject unknown slugs with a structured template-not-found error.
- [x] 2.2 Render transactional templates without requiring an unsubscribe URL.
- [x] 2.3 Render campaign templates only after adding an Agulhada Mail unsubscribe URL to template data.
- [x] 2.4 Apply `subjectOverride` to the SES subject when provided and fall back to the rendered template subject otherwise.

## 3. Compliance and Delivery

- [x] 3.1 Check global suppressions for every manual send before rendering.
- [x] 3.2 Check marketing suppressions for campaign-category manual sends before rendering.
- [x] 3.3 Create or load the recipient subscriber record needed for manual campaign unsubscribe tokens.
- [x] 3.4 Generate a signed unsubscribe token and URL for manual campaign sends using existing Agulhada Mail unsubscribe handling.
- [x] 3.5 Send through the existing SES sender with category/template tags and List-Unsubscribe headers when an unsubscribe URL is present.
- [x] 3.6 Return `202 { ok: true, messageId }` after SES accepts the manual send and structured non-2xx errors for render or SES failures.

## 4. Documentation

- [x] 4.1 Document `POST /api/manual/send` in the API docs with the expected `agulhada-backend` payload.
- [x] 4.2 Document that `agulhada-backend` and `didineedles` are not changed by this implementation.
- [x] 4.3 Document compliance behavior for transactional versus campaign manual sends.

## 5. Verification

- [x] 5.1 Verify a campaign template manual send includes unsubscribe support in rendered content and SES send parameters.
- [x] 5.2 Verify a transactional template manual send succeeds without unsubscribe data or headers.
- [x] 5.3 Verify `subjectOverride` changes the SES subject for a trusted manual send.
- [x] 5.4 Verify a globally suppressed recipient is rejected for both transactional and campaign manual sends.
- [x] 5.5 Verify a marketing-suppressed recipient is rejected for campaign manual sends.
- [x] 5.6 Verify a marketing-suppressed recipient is not rejected for a transactional manual send unless globally suppressed.
- [x] 5.7 Verify an unknown template slug returns a structured non-2xx error and does not send.
- [x] 5.8 Verify invalid auth returns a structured non-2xx error and does not render or send.
- [x] 5.9 Run the project test/build command and record any remaining gaps.
