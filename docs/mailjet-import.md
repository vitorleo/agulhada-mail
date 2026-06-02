# Mailjet CSV Import

The importer reads Mailjet exports from the local `data/` folder and upserts them into MongoDB.

`data/` is ignored by git so subscriber CSVs do not go through GitHub.

## Expected files

- `data/all_list.csv`: subscriber profile/list export.
- `data/all_contacts.csv`: Mailjet engagement and suppression counters.

Rows are matched by email address. Mailjet engagement counters are stored under `subscriber.custom.mailjet.engagement`.

The `source` column from `all_list.csv` is preserved as `subscriber.source` so campaign segments can target sources like `CST19`, `CST22`, or `website`. The fact that the row came from this migration is stored separately as `subscriber.custom.mailjet.importedFrom`.

## Dry run

```powershell
npx tsx scripts/import-mailjet.ts
```

Limit the preview:

```powershell
npx tsx scripts/import-mailjet.ts --limit 25
```

## Import

Point `.env` at the target MongoDB database, then run:

```powershell
npx tsx scripts/import-mailjet.ts --write --list-slug mailjet-all --list-name "Mailjet import"
```

The script is conservative:

- hard bounces become global suppressions
- spam complaints become global suppressions
- unsubscribes become marketing suppressions
- existing unsubscribed/bounced/complained/suppressed subscribers are not re-subscribed by a Mailjet subscribed row

## Collections Updated

- `lists`
- `subscribers`
- `list_members`
- `suppressions`

## Cleanup an Aborted Import

Preview the cleanup:

```powershell
npx tsx scripts/cleanup-mailjet-import.ts
```

Delete the Mailjet import data so you can re-import cleanly:

```powershell
npx tsx scripts/cleanup-mailjet-import.ts --write
```

The cleanup targets only the Mailjet import list, its list memberships, subscribers with `custom.mailjet`, and suppressions created with `source: "mailjet-import"`.
