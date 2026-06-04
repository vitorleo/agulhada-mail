## Requirements

### Requirement: Template registry
The system SHALL provide a registry of React Email templates keyed by stable kebab-case slugs. Each registry entry MUST declare the template category, default subject, and React component used for rendering.

#### Scenario: Registered template can be resolved
- **WHEN** the system is asked to render a known template slug
- **THEN** it resolves the template category, subject, and component from the registry

#### Scenario: Unknown template fails clearly
- **WHEN** the system is asked to render an unknown template slug
- **THEN** it fails with a clear template-not-found error

### Requirement: React Email rendering
The system SHALL render registered templates into HTML and plaintext using React Email. The rendered output MUST include a subject, HTML body, and text body.

#### Scenario: Render campaign template
- **WHEN** a campaign job renders a registered campaign template with recipient data
- **THEN** the system returns HTML, plaintext, and a subject ready for SES sending

#### Scenario: Render transactional template
- **WHEN** the transactional send API renders a registered transactional template with request data
- **THEN** the system returns HTML, plaintext, and a subject ready for SES sending

### Requirement: Marketing unsubscribe enforcement
The system SHALL require a valid `unsubscribeUrl` when rendering campaign templates. Transactional templates MUST be renderable without a marketing unsubscribe URL.

#### Scenario: Campaign render includes unsubscribe URL
- **WHEN** a campaign email is rendered for a subscriber
- **THEN** the template data includes an `unsubscribeUrl` generated from the existing signed unsubscribe token

#### Scenario: Campaign render missing unsubscribe URL
- **WHEN** a campaign template is rendered without an `unsubscribeUrl`
- **THEN** the system rejects rendering before sending to SES

#### Scenario: Transactional render does not require unsubscribe URL
- **WHEN** a transactional template is rendered without an `unsubscribeUrl`
- **THEN** the system renders the email successfully

### Requirement: Shared branded layout
The system SHALL provide shared React Email layout components for Agulhada branding, footer text, logo, recipient email display, and common call-to-action styling.

#### Scenario: Template uses shared layout
- **WHEN** a registered template is rendered
- **THEN** the output includes the shared Agulhada branding and footer structure

#### Scenario: Hosted logo URL is used
- **WHEN** a template includes the Agulhada logo
- **THEN** the logo source is a public HTTPS URL rather than embedded base64 data

### Requirement: Existing SES delivery path preserved
The system SHALL continue to send rendered emails through the existing SES sending path, including configuration set tags and List-Unsubscribe headers when an unsubscribe URL is present.

#### Scenario: Campaign send preserves SES tracking
- **WHEN** a rendered campaign email is sent
- **THEN** the SES send request includes the configured configuration set and campaign/subscriber/job tags

#### Scenario: Marketing unsubscribe header is preserved
- **WHEN** a rendered campaign email has an `unsubscribeUrl`
- **THEN** the SES send request includes List-Unsubscribe headers for that URL

### Requirement: Existing template compatibility during migration
The system SHALL preserve a safe migration path for existing MongoDB Handlebars templates until React Email templates are fully adopted.

#### Scenario: Legacy template remains usable during transition
- **WHEN** a queued job references a template that is not registered as React Email
- **THEN** the system can continue rendering it through the existing Handlebars path or fail with an explicit migration error before sending

### Requirement: Welcome template supports accept-promo usage
The `welcome` React Email template SHALL support use as the post-promo first-steps email for `didineedles/api/acceptPromo/index.js`.

#### Scenario: Accept-promo welcome render
- **WHEN** the `welcome` template is rendered with `email`, `userId`, `promoCode`, and `promoLevel` data
- **THEN** it renders successfully as a transactional first-steps email

#### Scenario: Missing promo-specific data
- **WHEN** the `welcome` template is rendered without `promoCode` or `promoLevel`
- **THEN** it still renders successfully as a general welcome email

### Requirement: Welcome subject supports first-steps email
The `welcome` transactional send SHALL be usable with the subject "Seus primeiros passos no Agulhada.com" for the didineedles accept-promo flow.

#### Scenario: Accept-promo subject expectation
- **WHEN** didineedles requests the `welcome` template for an accepted promo
- **THEN** the documented request identifies the first-steps subject expectation for review or override

### Requirement: Mailjet-derived template migration
The system SHALL provide React Email templates for each Mailjet template in the selected migration batch, and each converted template MUST be registered with a stable slug, category, default subject, and component.

#### Scenario: Selected Mailjet templates are registered
- **WHEN** the React Email template registry is inspected
- **THEN** it includes registered templates corresponding to Mailjet IDs `6487676`, `6739428`, `6430901`, `7929021`, `6419616`, and `8051890`

#### Scenario: Converted Mailjet template renders locally
- **WHEN** a converted Mailjet-derived template is rendered with valid template data
- **THEN** the system returns a subject, HTML body, and plaintext body ready for SES sending

#### Scenario: Mailjet source identity is documented
- **WHEN** maintainers review the migration documentation
- **THEN** they can map each converted React Email slug back to its source Mailjet template ID and Mailjet template name

### Requirement: Mailjet variable mapping
The system SHALL replace Mailjet personalization syntax with typed React Email template data fields and MUST fail clearly when required campaign data is missing.

#### Scenario: First-name personalization is rendered
- **WHEN** a converted Mailjet-derived template is rendered with `firstName`
- **THEN** the rendered HTML and plaintext use that value in place of the corresponding Mailjet personalization variable

#### Scenario: Campaign unsubscribe URL remains required
- **WHEN** a converted Mailjet-derived campaign template is rendered without `unsubscribeUrl`
- **THEN** rendering is rejected before sending to SES

#### Scenario: Transactional welcome remains renderable without unsubscribe URL
- **WHEN** the Mailjet-derived `welcome` template is rendered without `unsubscribeUrl`
- **THEN** it renders successfully as a transactional email

### Requirement: Mailjet source archive
The migration SHALL preserve the exported Mailjet metadata and source content needed to review the conversion of backend-used templates.

#### Scenario: Source export exists for converted template
- **WHEN** maintainers review a converted Mailjet-derived template
- **THEN** they can find the source Mailjet metadata and available HTML, plaintext, and MJML content used for conversion

#### Scenario: Missing source field is explicit
- **WHEN** a Mailjet source template lacks MJML or another content field
- **THEN** the export records the missing field explicitly rather than silently fabricating source content
