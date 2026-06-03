## Purpose

Define how the didineedles accept-promo flow should hand off its welcome email to Agulhada Mail without editing the didineedles repository in this change.

## Requirements

### Requirement: Accept-promo welcome handoff documentation
The system SHALL document how `didineedles/api/acceptPromo/index.js` should request the Agulhada Mail `welcome` transactional template after granting a promo trial.

#### Scenario: Promo trial granted
- **WHEN** `didineedles/api/acceptPromo/index.js` successfully grants a `VIP30` promo trial
- **THEN** the documentation shows how to request the Agulhada Mail `welcome` transactional template for the authenticated user's email

#### Scenario: Promo grant fails
- **WHEN** the promo grant result contains an error
- **THEN** the documentation states that no welcome email should be requested

### Requirement: Didineedles repo remains untouched
This change SHALL NOT modify the `didineedles` repository.

#### Scenario: Applying this change
- **WHEN** this OpenSpec change is implemented
- **THEN** no files under `C:\Users\Vitor\Documents\codebase\didineedles` are edited

### Requirement: Pasteable Codex prompt
The system SHALL provide a prompt that the user can paste into Codex while working in the `didineedles` repo.

#### Scenario: User applies didineedles prompt
- **WHEN** the user opens Codex in the `didineedles` repo
- **THEN** the prompt gives scoped instructions to replace only the `acceptPromo` welcome email sender

### Requirement: Existing didineedles behavior preserved
The documented didineedles change SHALL preserve promo validation, MongoDB user updates, and response behavior.

#### Scenario: Existing promo logic
- **WHEN** the didineedles prompt is followed
- **THEN** voucher lookup, `VIP30` subscription creation, and response payload behavior remain unchanged
