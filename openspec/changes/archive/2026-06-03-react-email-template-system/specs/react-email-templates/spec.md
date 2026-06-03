## ADDED Requirements

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
