## ADDED Requirements

### Requirement: Campaign stats overview
The local administration UI SHALL provide a read-only campaign stats page that lists campaigns with their name, template slug, created time, updated time, and delivery/engagement counts.

#### Scenario: View campaign stats
- **WHEN** the operator opens the local campaign stats page
- **THEN** the UI can display a campaign stats overview without exposing MongoDB credentials, AWS credentials, the VPS API admin token, or the unsubscribe secret to the browser

#### Scenario: Refresh campaign stats
- **WHEN** the operator refreshes campaign stats
- **THEN** the UI retrieves current stats from the loopback admin server and updates the displayed campaign rows without sending or leasing email jobs locally

### Requirement: Campaign queue and delivery counts
The loopback admin server SHALL calculate campaign queue and delivery counts from campaign jobs in MongoDB. The stats MUST include total queued jobs and separate counts for pending, leased, retrying, sent, failed, and suppressed jobs.

#### Scenario: Campaign has mixed job statuses
- **WHEN** a campaign has email jobs in pending, leased, retrying, sent, failed, and suppressed statuses
- **THEN** the stats response reports each status count separately and reports queued as the total number of jobs for that campaign

#### Scenario: Campaign has no jobs
- **WHEN** a draft campaign has no email jobs
- **THEN** the stats response reports zero queue and delivery counts for that campaign

### Requirement: Campaign engagement counts
The loopback admin server SHALL calculate campaign provider and engagement counts from SES email events in MongoDB. The stats MUST include counts for delivery, bounce, complaint, open, and click events, and MUST distinguish total open/click events from unique recipients or emails that opened or clicked.

#### Scenario: Campaign has repeated opens and clicks
- **WHEN** multiple SES Open or Click events exist for the same campaign recipient or email
- **THEN** the stats response reports the total event count and counts that recipient or email once in the unique opened or clicked count

#### Scenario: Campaign has delivery events
- **WHEN** SES Delivery, Bounce, or Complaint events exist for a campaign
- **THEN** the stats response reports those provider event counts for that campaign

### Requirement: Focused stats after enqueue
The local administration UI SHALL make stats for the newly enqueued campaign available from the enqueue completion state on the separate campaign stats page.

#### Scenario: Review stats after enqueue
- **WHEN** the operator successfully enqueues a campaign
- **THEN** the UI provides a link to inspect that campaign on the campaign stats page
