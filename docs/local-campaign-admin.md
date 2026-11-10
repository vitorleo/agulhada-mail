# Local Campaign Admin

The campaign admin UI runs only on the local development machine. It connects directly to the configured MongoDB to manage lists, subscribers, campaign drafts, eligibility, and queue jobs.

Email delivery remains on the VPS:

- controlled test sends call the authenticated VPS `POST /api/manual/send` endpoint;
- enqueueing creates `email_jobs` records in MongoDB;
- only the VPS worker leases and sends queued jobs;
- the local admin process does not import the SES sender, process jobs, or start a worker.

## Configuration

Set these values in the local `.env`:

```env
LOCAL_ADMIN_PORT=3030
VPS_API_BASE_URL=https://email.agulhada.com
MONGO_DATABASE_URL=mongodb://...
MONGO_DATABASE_NAME=agulhada_mail
API_ADMIN_TOKEN=...
```

Start the UI:

```powershell
npm run admin
```

Open `http://127.0.0.1:3030` to launch campaigns. Open `http://127.0.0.1:3030/stats` to review campaign stats.

Do not add `npm run admin` to VPS startup, PM2, Docker Compose, nginx, or any public deployment configuration.

## Recipient CSV

The CSV must contain an `email` column. Optional columns are:

- `firstName`
- `name`
- `source`
- `userId`

The preview validates addresses, trims values, removes case-insensitive duplicates, and supports up to 5,000 rows. Previewed recipient data expires after 30 minutes and must be imported before it expires.

## Workflow

1. Confirm the displayed MongoDB database and VPS API target.
2. Select a campaign template and enter campaign/list details.
3. Upload, preview, and import the recipient CSV.
4. Request a controlled test send from the VPS.
5. Create the campaign draft and review the eligibility preflight.
6. Type the exact campaign name and acknowledge that the VPS worker may send immediately.
7. Enqueue the campaign jobs.

## Campaign Stats

The local admin stats page at `/stats` includes a read-only campaign stats table. It answers the operational questions after a campaign is enqueued: how many jobs exist, how many are still active, how many were sent, and how many provider events show delivery, opens, or clicks.

The table is loaded from the loopback admin server and never exposes MongoDB credentials, AWS credentials, the VPS API token, unsubscribe secrets, raw SES payloads, or SES message ids to the browser.

Displayed columns:

- `Campaign`: campaign name plus template and subject metadata.
- `Status`: campaign document status such as `draft` or `queued`.
- `Queued`: total `email_jobs` documents for the campaign.
- `Active`: jobs currently `pending`, `leased`, or `retrying`.
- `Sent`: jobs with status `sent`.
- `Failed`: jobs with status `failed` or `suppressed`.
- `Delivered`: SES `Delivery` events recorded for the campaign.
- `Opens`: unique opener count and total SES `Open` event count.
- `Clicks`: unique clicker count and total SES `Click` event count.
- `Updated`: campaign `updatedAt` timestamp.

Open and click totals can be higher than the unique counts because SES can emit repeated events for the same recipient. The unique count is the better headline number for "how many emails opened/clicked"; the total count is useful for spotting repeated engagement or tracking noise.

After a campaign is enqueued, the completion state links to `/stats?campaignId=<id>` so the stats page can load that campaign first. Use `Refresh stats` to pull the latest counts from MongoDB. Refreshing stats is read-only: it does not send email, lease jobs, retry jobs, or update campaign state.

## Smoke Test

Use only internal recipients:

1. Preview a CSV containing one valid address, one duplicate, and one invalid address.
2. Confirm the preview counts before importing.
3. Import into a dedicated internal test list.
4. Request a VPS test send and confirm its response.
5. Create a draft and confirm preflight does not create jobs.
6. Verify an incorrect confirmation name and missing acknowledgement are rejected.
7. Enqueue the internal campaign and confirm the actual queued/excluded counts.
8. Refresh campaign stats and confirm the enqueued campaign appears with queued/job counts.
9. Confirm delivery is performed by the VPS worker.
