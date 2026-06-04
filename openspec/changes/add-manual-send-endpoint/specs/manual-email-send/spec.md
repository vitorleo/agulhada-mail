## ADDED Requirements

### Requirement: Authenticated manual send endpoint
The system SHALL expose `POST /api/manual/send` for trusted one-off email sends and SHALL require the existing bearer admin authentication before validating or sending any email.

#### Scenario: Valid manual request is accepted
- **WHEN** a trusted caller sends a valid manual request with `Authorization: Bearer <API_ADMIN_TOKEN>`, a registered `templateSlug`, recipient fields, and template `data`
- **THEN** the system renders the requested React Email template and sends the email through the existing SES sender

#### Scenario: Invalid auth is rejected
- **WHEN** a manual send request is sent without a valid bearer admin token
- **THEN** the system rejects the request with a structured non-2xx authorization error and does not render or send email

### Requirement: Manual send request contract
The manual send endpoint SHALL accept `templateSlug`, `to`, optional `toName`, optional `subjectOverride`, and `data` fields, and SHALL reject malformed requests before rendering or sending email.

#### Scenario: Expected backend payload
- **WHEN** a trusted caller sends a payload containing `templateSlug`, `to`, `toName`, optional `subjectOverride`, and `data.email`, `data.firstName`, `data.name`, and `data.userId`
- **THEN** the system accepts the payload shape for a registered template and uses the provided data for rendering

#### Scenario: Invalid recipient payload
- **WHEN** a trusted caller sends a manual request with an invalid `to` email address
- **THEN** the system rejects the request with a structured validation error and does not send email

### Requirement: Registered React Email templates only
The manual send endpoint SHALL send only registered React Email templates and SHALL support both transactional and campaign template categories based on the registered template definition.

#### Scenario: Campaign template with unsubscribe support
- **WHEN** a trusted caller sends a manual request for a registered campaign template such as `trial-expiring`
- **THEN** the system renders the campaign React Email template with an Agulhada Mail unsubscribe URL and sends it through SES with unsubscribe handling

#### Scenario: Transactional template without unsubscribe requirement
- **WHEN** a trusted caller sends a manual request for a registered transactional template such as `welcome`
- **THEN** the system renders and sends the transactional template without requiring or adding a marketing unsubscribe URL

#### Scenario: Unknown template slug
- **WHEN** a trusted caller sends a manual request with a `templateSlug` that is not registered in the React Email template registry
- **THEN** the system rejects the request with a structured template-not-found error and does not send email

### Requirement: Category-specific suppression enforcement
The manual send endpoint SHALL check local suppressions before sending. Transactional templates MUST check global suppressions only. Campaign templates MUST check both global and marketing suppressions.

#### Scenario: Global suppression blocks manual send
- **WHEN** a trusted caller sends a manual request to a recipient with a global suppression
- **THEN** the system rejects the request with a structured suppression error and does not render or send email

#### Scenario: Marketing suppression blocks campaign manual send
- **WHEN** a trusted caller sends a manual request for a campaign template to a recipient with a marketing suppression
- **THEN** the system rejects the request with a structured suppression error and does not render or send email

#### Scenario: Marketing suppression does not block transactional manual send
- **WHEN** a trusted caller sends a manual request for a transactional template to a recipient with only a marketing suppression
- **THEN** the system sends the transactional email if no global suppression applies

### Requirement: Manual campaign unsubscribe ownership
For campaign-category manual sends, the system SHALL generate unsubscribe handling owned by Agulhada Mail before rendering the template and sending through SES.

#### Scenario: Manual campaign render receives unsubscribe URL
- **WHEN** a trusted caller sends a manual request for a campaign template
- **THEN** the system provides an Agulhada Mail unsubscribe URL in the template data before rendering

#### Scenario: Manual campaign SES send includes unsubscribe header
- **WHEN** a manual campaign email is sent through SES
- **THEN** the SES send request includes List-Unsubscribe headers for the generated Agulhada Mail unsubscribe URL

### Requirement: Manual subject override
The manual send endpoint SHALL use `subjectOverride` as the SES subject when a trusted request provides a valid override, and SHALL use the registered template subject when no override is provided.

#### Scenario: Subject override is used
- **WHEN** a trusted caller sends a valid manual request with `subjectOverride` equal to `Optional trusted admin subject`
- **THEN** the system sends the email through SES with `Optional trusted admin subject` as the subject

#### Scenario: Default subject is used without override
- **WHEN** a trusted caller sends a valid manual request without `subjectOverride`
- **THEN** the system sends the email through SES with the subject returned by the registered React Email template renderer

### Requirement: Manual send response contract
The manual send endpoint SHALL return `202` with `{ "ok": true, "messageId": "<ses-message-id>" }` after SES accepts the message and SHALL return structured non-2xx JSON errors for unsuccessful requests.

#### Scenario: SES acceptance response
- **WHEN** SES accepts a manual send request and returns a message id
- **THEN** the endpoint responds with status `202` and a JSON body containing `ok: true` and `messageId`

#### Scenario: Structured send failure
- **WHEN** SES rejects or fails the manual send after validation and rendering succeed
- **THEN** the endpoint responds with a structured non-2xx send error and does not report `ok: true`
