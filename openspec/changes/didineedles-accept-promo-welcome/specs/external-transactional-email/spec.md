## ADDED Requirements

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
