## 1. Mailjet Export

- [x] 1.1 Add or adapt a migration script that fetches Mailjet template metadata and `detailcontent` for IDs `6487676`, `6739428`, `6430901`, `7929021`, `6419616`, and `8051890`.
- [x] 1.2 Store the raw export output with metadata, HTML, plaintext, MJML when present, and explicit missing-field markers.
- [x] 1.3 Extract and document source subjects, CTA URLs, image URLs, and personalization variables from the exported templates.

## 2. React Email Conversion

- [x] 2.1 Convert Mailjet ID `6487676` into a campaign React Email template registered as `marketing-30-days-cst`.
- [x] 2.2 Convert Mailjet ID `6739428` into a campaign React Email template registered as `marketing-30-days`.
- [x] 2.3 Convert Mailjet ID `6430901` into a campaign React Email template registered as `trial-expiring`.
- [x] 2.4 Convert Mailjet ID `7929021` into a campaign React Email template registered as `trial-expiring-50-cst24`.
- [x] 2.5 Convert Mailjet ID `8051890` into a campaign React Email template registered as `marketing-30-days-cst25`.
- [x] 2.6 Update or confirm the existing `welcome` transactional React Email template against Mailjet ID `6419616`.
- [x] 2.7 Replace Mailjet personalization syntax with typed React Email data fields such as `firstName`, `name`, `email`, and `unsubscribeUrl`.

## 3. Registry and Documentation

- [x] 3.1 Register all converted templates with stable slugs, categories, default subjects, and component references.
- [x] 3.2 Document the Mailjet ID to React Email slug mapping and required payload fields.
- [x] 3.3 Document any assets that were replaced, newly hosted, or still require stable public HTTPS hosting.

## 4. Verification

- [x] 4.1 Render each converted template locally and verify subject, HTML, and plaintext output are produced.
- [x] 4.2 Verify converted campaign templates reject missing `unsubscribeUrl`.
- [x] 4.3 Verify the `welcome` transactional template renders without `unsubscribeUrl`.
- [x] 4.4 Run the project build or relevant TypeScript/template render checks.
