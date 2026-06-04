## Context

Agulhada Mail exposes `POST /api/transactional/send` for trusted external systems to send registered transactional templates. The route currently validates `templateSlug`, `to`, `toName`, and `data`, renders the requested template, then calls `sendWithSes`.

`sendWithSes` uses AWS SES v2 `SendEmailCommand` with a `Destination` containing only `ToAddresses`. SES v2 supports `BccAddresses`, so the change can be implemented without changing providers or message format.

## Goals / Non-Goals

**Goals:**

- Allow authenticated transactional callers to include optional blind-copy recipients.
- Validate BCC recipient address format at the API boundary without attempting mailbox-existence checks.
- Deliver BCC recipients through the existing SES v2 send path.
- Preserve current transactional responses and behavior for requests that do not include BCC.

**Non-Goals:**

- Add BCC support to campaign jobs.
- Add CC or reply-to support.
- Store BCC recipients in a new database model.
- Create a new auth token or caller-specific policy layer.

## Decisions

### Accept `bcc` as either a string or an array of strings

The transactional route should accept `bcc?: string | string[]`. Each entry should be a valid email address or formatted mailbox string that SES can accept, such as `Agulhada.com <contato@agulhada.com>`. The route should normalize the value to a non-empty string array before calling `sendWithSes`.

Alternative considered: accept only an array to mirror SES's `BccAddresses` shape. Supporting a single string is more ergonomic for common one-BCC use cases while still keeping the internal representation simple. Comma-delimited lists remain out of scope because they introduce parsing ambiguity with display names.

### Keep BCC out of template rendering data

BCC recipients are delivery metadata, not template personalization. The route should pass BCC to `sendWithSes` but should not merge it into template data.

Alternative considered: include BCC in the template data object for maximum transparency. That risks accidental rendering of blind-copy addresses and weakens the privacy expectation.

### Pass BCC only when non-empty

`sendWithSes` should add `BccAddresses` to the SES `Destination` only when at least one BCC recipient is present. Existing sends should produce the same SES request shape as before.

Alternative considered: always send `BccAddresses: []`. Omitting the field is cleaner and avoids relying on SES behavior for empty arrays.

### Preserve campaign one-recipient sending

Campaign jobs should remain unchanged. Campaign sends intentionally use one recipient per SES call for unsubscribe links, tags, and event correlation.

Alternative considered: add BCC to `EmailJob`. There is no current campaign requirement for BCC, and adding it would expand privacy, suppression, and event-correlation questions.

## Risks / Trade-offs

- BCC recipients may receive sensitive transactional content → Keep support behind the existing trusted bearer-token API and validate explicitly.
- SES events may include BCC recipients in destination/event payloads → Avoid assuming webhook events only refer to the primary `to` address when investigating deliveries, but do not change webhook behavior in this proposal.
- BCC recipients may affect SES recipient quotas → Document that each BCC address counts as an additional recipient from an SES sending perspective.
- External callers may expect BCC to be hidden from all logs → Do not add BCC to rendered data or response payload; keep any future logging minimal and intentional.

## Migration Plan

1. Deploy the API and SES wrapper changes.
2. Existing callers continue sending without `bcc`.
3. Trusted callers can begin including `bcc` as a string or string array after deployment.

Rollback: remove `bcc` from callers first, then revert the API/schema and SES wrapper changes if needed. Existing non-BCC sends are unaffected.

## Open Questions

- Should a future change add config-based default BCC recipients for specific transactional templates or sources?
- Should BCC be documented in caller handoff docs such as Stripe or didineedles only when those flows need it?
