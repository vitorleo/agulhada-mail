## ADDED Requirements

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
