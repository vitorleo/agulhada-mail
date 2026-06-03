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
