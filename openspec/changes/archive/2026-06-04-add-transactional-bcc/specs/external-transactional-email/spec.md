## ADDED Requirements

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
