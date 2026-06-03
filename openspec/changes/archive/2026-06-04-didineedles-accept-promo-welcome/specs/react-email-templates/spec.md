## ADDED Requirements

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
