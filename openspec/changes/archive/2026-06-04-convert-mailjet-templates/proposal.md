## Why

Agulhada still has active email templates in Mailjet that are referenced by `agulhada-backend`, while this project is moving email rendering into local React Email templates sent through SES. Converting the Mailjet templates now preserves the existing customer communication flows and lets future template changes live in this repository.

## What Changes

- Export Mailjet template metadata and source content for the templates currently used by `agulhada-backend`, plus the requested CST25 marketing template.
- Preserve raw Mailjet HTML, text, and MJML where available as migration/reference artifacts.
- Convert the selected Mailjet templates into registered React Email templates in this project.
- Map Mailjet personalization variables to typed template data consumed by the React Email renderer.
- Add render-level verification so converted templates produce subject, HTML, and plaintext output before they are used for sending.
- Document the Mailjet template ID to local React Email slug mapping for backend handoff.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `react-email-templates`: Adds Mailjet-derived templates to the React Email registry and requires those templates to render locally with preserved subject/content intent and documented Mailjet ID mappings.

## Impact

- Affected code: `src/emailTemplates/**`, `src/emailTemplates/registry.ts`, render/test scripts as needed.
- Affected docs: Mailjet migration documentation and backend handoff notes.
- External systems: Mailjet is read during migration export; SES remains the delivery path in this project.
- Dependencies: no new runtime dependency is expected unless implementation chooses to compile MJML directly as part of the migration tooling.
