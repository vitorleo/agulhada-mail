# Implementation Notes

## What Was Reused From Existing Code

- MongoDB remains the persistence layer.
- The subscriber import shape mirrors `emails.export._index.jsx` and `needles/dbmanagement/export-users-csv.js`: email, first name, full name, status/source.
- The unsubscribe concept mirrors `didineedles/api/unsubscribe`, but changes from a raw user id to a signed token.
- The transactional email path mirrors the Stripe welcome email flow in `needles/stripewh/index.js`, but routes through SES and suppression checks.

## What Changes From Mailjet

Mailjet template ids are not portable to SES. The MVP stores templates locally as HTML/text with Handlebars variables.

Migration path:

1. Export or copy each important Mailjet template.
2. Save as `email_templates` documents.
3. Replace Mailjet variables with Handlebars variables, for example `{{firstName}}`.
4. Test by sending to one internal address.
5. Only then enqueue a small live segment.

## Safe First Campaign Plan

1. Import subscribers from the existing Mongo user collection or CSV export.
2. Mark all imported users as `subscribed` only if they are registered users with a legitimate relationship to Agulhada.
3. Send a plain, useful re-introduction campaign to 50 recipients.
4. Watch SES bounce/complaint metrics and local `email_events`.
5. Increase to 250, then 1000, then the full list only if bounce and complaint rates are healthy.

## Open Production Hardening Items

- Validate SNS signatures before accepting webhook events.
- Add a real admin UI in `agulhada-backend`.
- Add template preview rendering.
- Add click/open tracking only after consent/legal review.
- Add CSV import UI with duplicate and invalid email reporting.
- Add per-list/topic unsubscribe instead of only marketing suppression.
- Add DKIM/DMARC monitoring reports.

