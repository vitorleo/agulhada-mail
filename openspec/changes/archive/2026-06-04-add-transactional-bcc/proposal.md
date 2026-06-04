## Why

Trusted transactional email callers sometimes need to blind-copy an internal mailbox for audit, support, or operational review without exposing that mailbox to the recipient. AWS SES already supports BCC recipients, but Agulhada Mail's transactional API and SES wrapper currently only accept a primary `to` recipient.

## What Changes

- Add optional `bcc` recipient support to the external transactional send API.
- Validate BCC address format before rendering or sending; no mailbox-existence check is performed.
- Pass accepted BCC recipients to SES v2 as `Destination.BccAddresses`.
- Accept `bcc` as either a single string or an array of strings, including formatted mailbox strings such as `Agulhada.com <contato@agulhada.com>`.
- Preserve existing behavior for calls that omit BCC.
- Keep campaign sending unchanged so campaign jobs remain one-recipient-per-send.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `external-transactional-email`: allow trusted external transactional send requests to include optional blind-copy recipients.

## Impact

- Affected API: `POST /api/transactional/send`
- Affected code: transactional request validation, `sendWithSes`, and any focused tests or docs for the transactional API.
- Affected external systems: trusted callers may add `bcc` as a string or string array when they need internal blind-copy delivery.
- Dependencies: no new runtime dependency expected; uses existing AWS SES v2 `SendEmail` support.
