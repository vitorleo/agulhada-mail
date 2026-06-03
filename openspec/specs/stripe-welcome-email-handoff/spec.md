## Requirements

### Requirement: Stripe subscription welcome handoff documentation
The system SHALL document how the Stripe webhook should request the Agulhada Mail `welcome` transactional template when a new subscription payment succeeds.

#### Scenario: New subscription payment succeeded
- **WHEN** the Stripe webhook receives `invoice.payment_succeeded` with `billing_reason` equal to `subscription_create`
- **THEN** the documentation shows how to call Agulhada Mail to send the `welcome` transactional template to the invoice customer email

#### Scenario: Non-subscription-create payment succeeded
- **WHEN** the Stripe webhook receives `invoice.payment_succeeded` with another `billing_reason`
- **THEN** the documentation states that it should not send the welcome email

### Requirement: Mailjet removal guidance
The system SHALL document that the Stripe webhook should not use Mailjet to send the new subscription welcome email after this migration.

#### Scenario: Welcome email send path
- **WHEN** the welcome email is triggered from the Stripe webhook
- **THEN** the documentation recommends using the Agulhada Mail HTTP API rather than `node-mailjet`

### Requirement: Stripe webhook resilience guidance
The system SHALL document that Stripe subscription processing should remain independent from welcome email delivery success.

#### Scenario: Agulhada Mail request fails
- **WHEN** Agulhada Mail is unavailable or returns an error for the welcome email request
- **THEN** the documentation recommends logging the failure without undoing completed subscription database updates

### Requirement: Welcome payload mapping documentation
The system SHALL document the customer and subscription context needed by the welcome template.

#### Scenario: Customer data is available
- **WHEN** the Stripe invoice includes `customer_email`, `customer_name`, and subscription metadata
- **THEN** the documentation maps recipient email, recipient name, first name, user id, and Stripe invoice/subscription identifiers when available
