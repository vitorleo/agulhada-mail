## Requirements

### Requirement: Authenticated external transactional send
The system SHALL allow trusted external systems to request transactional emails through an authenticated HTTP API.

#### Scenario: Valid external transactional request
- **WHEN** a trusted external system sends a transactional email request with a valid bearer token
- **THEN** the system sends the requested registered transactional template through SES

#### Scenario: Missing or invalid token
- **WHEN** a transactional email request is sent without a valid bearer token
- **THEN** the system rejects the request without sending email

### Requirement: Registered transactional templates only
The system SHALL send only registered transactional templates through the external transactional API.

#### Scenario: Welcome template request
- **WHEN** the external system requests `templateSlug` equal to `welcome`
- **THEN** the system renders the registered React Email welcome template

#### Scenario: Non-transactional template request
- **WHEN** the external system requests a campaign template through the transactional API
- **THEN** the system rejects the request without sending email

### Requirement: Transactional send response
The system SHALL return a response that allows the caller to confirm whether SES accepted the transactional email.

#### Scenario: SES accepts message
- **WHEN** SES accepts the transactional email
- **THEN** the response includes `ok: true` and the SES `messageId`

#### Scenario: Recipient is suppressed
- **WHEN** the recipient is globally suppressed
- **THEN** the system rejects the send and returns the suppression reason

### Requirement: Transactional blind-copy recipients
The external transactional API SHALL allow authenticated callers to include optional BCC recipients for a transactional email request as either a single string or an array of strings, and the system MUST send those recipients as blind-copy recipients through SES.

#### Scenario: Valid transactional request with BCC
- **WHEN** a trusted external system sends a transactional email request with a valid bearer token, a valid primary recipient, and one or more valid BCC recipient strings
- **THEN** the system sends the requested registered transactional template through SES with the primary recipient in `ToAddresses` and the BCC recipients in `BccAddresses`

#### Scenario: Valid transactional request with single BCC string
- **WHEN** a trusted external system sends a transactional email request with `bcc` equal to a single valid recipient string such as `Agulhada.com <contato@agulhada.com>`
- **THEN** the system normalizes that BCC value and sends it through SES in `BccAddresses`

#### Scenario: Transactional request without BCC
- **WHEN** a trusted external system sends a transactional email request without BCC recipients
- **THEN** the system sends the transactional email through SES using the existing primary-recipient behavior

#### Scenario: Invalid BCC address format
- **WHEN** a trusted external system sends a transactional email request with an invalid BCC recipient string
- **THEN** the system rejects the request before sending email

#### Scenario: BCC validation does not check mailbox existence
- **WHEN** a trusted external system sends a transactional email request with a syntactically valid BCC recipient string
- **THEN** the system relies on format validation and does not call SES or another service to verify that the mailbox exists before sending

### Requirement: Didineedles accept-promo transactional request
The external transactional API SHALL support a trusted didineedles request to send the `welcome` template after a successful promo acceptance.

#### Scenario: Valid didineedles welcome request
- **WHEN** didineedles sends an authenticated transactional request with `templateSlug` equal to `welcome` and a valid recipient email
- **THEN** Agulhada Mail sends the welcome email through SES

#### Scenario: Invalid didineedles token
- **WHEN** didineedles sends the welcome request without a valid bearer token
- **THEN** Agulhada Mail rejects the request without sending email

### Requirement: Didineedles payload fields
The documented didineedles payload SHALL include recipient identity and promo context fields needed for current and future welcome template personalization.

#### Scenario: Payload mapping
- **WHEN** the didineedles prompt constructs the transactional request body
- **THEN** it includes `email`, `userId`, `promoCode`, and `promoLevel` when available
