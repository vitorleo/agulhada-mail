## Purpose

Provide a local-only campaign administration workflow for preparing, validating, testing, creating, and enqueueing campaign email without exposing privileged credentials or running delivery locally.

## Requirements

### Requirement: Loopback-only administration server
The system SHALL provide a campaign administration UI through a dedicated process that binds explicitly to a loopback address and is started only by a local-development command. The local administration process MUST NOT be started by the production API command or documented VPS process configuration.

#### Scenario: Start local administration UI
- **WHEN** the operator runs the local administration command
- **THEN** the administration server listens on `127.0.0.1` using its configured local admin port

#### Scenario: Start production API
- **WHEN** the production API command is run
- **THEN** the local campaign administration UI is not mounted or started

### Requirement: Privileged credentials remain server-side
The local administration UI SHALL perform privileged campaign operations through the loopback admin server, and the browser MUST NOT receive the VPS API admin token, MongoDB credentials, AWS credentials, or unsubscribe secret.

#### Scenario: Load the local UI
- **WHEN** the browser loads or uses the local campaign administration UI
- **THEN** responses and browser assets do not contain privileged credentials

### Requirement: Local MongoDB campaign administration
The loopback admin server SHALL be permitted to connect directly to the configured MongoDB to manage lists, subscribers, campaign drafts, eligibility preflight, and campaign queue jobs.

#### Scenario: Manage campaign data locally
- **WHEN** the operator imports recipients, creates a draft, reviews eligibility, or confirms enqueue
- **THEN** the loopback admin server performs the required MongoDB administration without sending email locally

### Requirement: VPS-only email delivery
The local administration process MUST NOT send email through SES and MUST NOT run or invoke an email worker. Immediate email sends SHALL be requested through the authenticated VPS API, and queued campaign jobs SHALL be delivered only by the VPS worker.

#### Scenario: Request controlled test send
- **WHEN** the operator submits a controlled test send
- **THEN** the loopback admin server requests the send from the authenticated VPS API and does not invoke a local SES sender

#### Scenario: Enqueue campaign locally
- **WHEN** the loopback admin server creates eligible campaign jobs in MongoDB
- **THEN** it does not send or lease those jobs and leaves delivery to the VPS worker

#### Scenario: Start local administration UI
- **WHEN** the operator starts the local administration UI
- **THEN** no local email worker is started

### Requirement: Campaign template and environment selection
The local administration UI SHALL list registered campaign-category templates and SHALL display the active database name and VPS API base URL throughout the workflow.

#### Scenario: Begin a campaign
- **WHEN** the operator opens the campaign workflow
- **THEN** the operator can select a registered campaign template and can see the active delivery environment details

#### Scenario: Exclude transactional template
- **WHEN** the template registry contains a transactional template
- **THEN** that template is not offered as a campaign template selection

### Requirement: CSV recipient preview
The local administration UI SHALL accept a CSV with a required `email` column and optional `firstName`, `name`, `source`, and `userId` columns. The system MUST parse the CSV using a structured CSV parser, validate email addresses, trim values, and deduplicate email addresses case-insensitively before import.

#### Scenario: Preview valid CSV
- **WHEN** the operator uploads a CSV containing valid recipient rows
- **THEN** the UI displays the valid and duplicate recipient counts and a recipient preview without importing the rows

#### Scenario: Preview CSV with invalid rows
- **WHEN** the operator uploads a CSV with missing or invalid email values
- **THEN** the UI identifies the invalid rows and prevents importing them as recipients

#### Scenario: Preview CSV without email header
- **WHEN** the operator uploads a CSV without an `email` column
- **THEN** the UI rejects the file with a clear validation error

### Requirement: Reviewed recipient import
The local administration UI SHALL import only recipients from a valid reviewed CSV preparation into the selected list and SHALL report imported and excluded counts. Existing global and marketing suppressions MUST remain effective after import.

#### Scenario: Import reviewed recipients
- **WHEN** the operator confirms a valid recipient preparation and selected list
- **THEN** the system imports the valid deduplicated recipients and displays the import result

#### Scenario: Import suppressed recipient
- **WHEN** an imported email has an existing global or marketing suppression
- **THEN** the suppression remains in effect and the recipient is excluded from campaign eligibility

### Requirement: Controlled test send
The local administration UI SHALL allow the operator to request that the authenticated VPS API send the selected campaign template to one explicitly entered test recipient before enqueueing the campaign and SHALL display the resulting success or failure.

#### Scenario: Successful test send
- **WHEN** the operator enters a valid test recipient and submits a test send
- **THEN** the VPS API sends the selected campaign template using campaign unsubscribe handling and the UI displays the send result

#### Scenario: Suppressed test recipient
- **WHEN** the operator submits a test send to a suppressed recipient
- **THEN** the system does not send the email and displays the suppression result

### Requirement: Draft campaign creation
The local administration UI SHALL create a draft campaign from the reviewed campaign name, selected list, selected registered campaign template, and optional subject override.

#### Scenario: Create draft campaign
- **WHEN** the operator submits valid reviewed campaign details
- **THEN** the system creates a draft campaign and displays its identifier and effective subject

### Requirement: Pre-enqueue eligibility summary
The local administration UI SHALL calculate and display a read-only eligibility summary before enqueueing. The summary MUST distinguish active list members, unsubscribed recipients, globally or marketing-suppressed recipients, recipients with existing campaign jobs, and recipients currently eligible to queue.

#### Scenario: Review campaign eligibility
- **WHEN** a draft campaign and recipient list are ready
- **THEN** the UI displays the eligibility summary without creating email jobs

### Requirement: Guarded campaign enqueue
The local administration UI SHALL require the operator to type the exact campaign name and acknowledge that the VPS worker may send immediately before enqueueing. The loopback server MUST validate both confirmations, rerun eligibility checks, create only eligible queue jobs, and report the actual queued and excluded counts without sending those jobs locally.

#### Scenario: Enqueue with valid confirmation
- **WHEN** the operator enters the exact campaign name, acknowledges immediate sending, and confirms enqueue
- **THEN** the system creates jobs only for currently eligible recipients and displays the actual queue result

#### Scenario: Reject incomplete confirmation
- **WHEN** the campaign name does not match or the immediate-send acknowledgement is absent
- **THEN** the system does not create campaign jobs

#### Scenario: Prevent accidental duplicate submission
- **WHEN** the enqueue request is submitted more than once for the same campaign and recipients
- **THEN** the system does not create duplicate campaign jobs

### Requirement: Accessible guided workflow
The local administration UI SHALL use semantic forms, visible labels, native validation constraints, keyboard-accessible controls, a labeled progress indicator, non-color-only status indicators, and announced dynamic results.

#### Scenario: Navigate workflow with keyboard
- **WHEN** the operator uses only keyboard controls
- **THEN** all workflow stages, fields, validation messages, and actions remain operable and visibly focused

#### Scenario: Submit invalid form
- **WHEN** the operator submits a stage with invalid required fields
- **THEN** the UI identifies the invalid fields with text and visual indicators and moves focus to actionable error feedback
