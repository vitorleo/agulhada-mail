## 1. API Validation

- [x] 1.1 Extend `POST /api/transactional/send` request validation to accept optional `bcc` as either a single string or an array of strings.
- [x] 1.2 Normalize accepted BCC input to a string array before calling `sendWithSes`.
- [x] 1.3 Ensure invalid BCC address formats are rejected before template rendering or SES sending, without attempting mailbox-existence checks.

## 2. SES Delivery

- [x] 2.1 Extend `sendWithSes` parameters to accept optional BCC recipients.
- [x] 2.2 Pass non-empty BCC recipients to SES v2 as `Destination.BccAddresses`.
- [x] 2.3 Preserve existing `Destination.ToAddresses` behavior for requests without BCC.

## 3. Documentation

- [x] 3.1 Document the optional `bcc` request field for the transactional send API.
- [x] 3.2 Note that BCC recipients are delivery metadata and are not template data.

## 4. Verification

- [x] 4.1 Add or update focused tests for single-string BCC, array BCC, omitted BCC, and invalid BCC behavior if a test harness exists.
- [x] 4.2 Run the relevant test or build command to verify the change.
- [x] 4.3 Run `openspec status --change add-transactional-bcc` and confirm the change is apply-ready.
