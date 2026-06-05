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

Open `http://127.0.0.1:3030`.

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

## Smoke Test

Use only internal recipients:

1. Preview a CSV containing one valid address, one duplicate, and one invalid address.
2. Confirm the preview counts before importing.
3. Import into a dedicated internal test list.
4. Request a VPS test send and confirm its response.
5. Create a draft and confirm preflight does not create jobs.
6. Verify an incorrect confirmation name and missing acknowledgement are rejected.
7. Enqueue the internal campaign and confirm the actual queued/excluded counts.
8. Confirm delivery is performed by the VPS worker.
