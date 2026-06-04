# React Email Templates

Agulhada Mail uses React Email templates as the canonical source for maintained campaign and transactional emails.

SES remains the delivery provider. The app renders React Email to HTML and plaintext, then sends that output through the existing SESv2 sender with configuration set tags and unsubscribe headers.

## Structure

```text
src/emailTemplates/
  assets.ts
  registry.ts
  render.tsx
  types.ts
  components/
  campaign/
  transactional/
```

## Registered Templates

Templates are registered in `src/emailTemplates/registry.ts`.

Current slugs:

- `welcome`: transactional welcome email.
- `welcome30dias`: transactional first-steps welcome email alias.
- `promo-30-days`: marketing campaign email.
- `marketing-30-days-cst`: Mailjet-derived CST 30-day marketing campaign.
- `marketing-30-days`: Mailjet-derived general 30-day marketing campaign.
- `trial-expiring`: Mailjet-derived trial-expiring campaign.
- `trial-expiring-50-cst24`: Mailjet-derived trial-expiring campaign with CST24 discount.
- `trial-recapture`: Mailjet-derived 30-day recapture campaign.
- `marketing-30-days-cst25`: Mailjet-derived CST25 30-day marketing campaign.

Each registry entry declares:

- `slug`
- `name`
- `category`
- `subject`
- `component`

## Rendering Locally

Render all registered templates:

```powershell
npx tsx scripts/render-email-template.ts
```

Render one template:

```powershell
npx tsx scripts/render-email-template.ts --slug promo-30-days
```

Write local HTML/text output:

```powershell
npx tsx scripts/render-email-template.ts --out-dir tmp/email-render
```

## Sending a React Email Test

```powershell
npx tsx scripts/send-test-email.ts --to vitorleo@gmail.com --template promo-30-days
```

The script uses `.env` values for SES sender, region, and configuration set.

## Adding a Template

1. Create a component under `src/emailTemplates/campaign/` or `src/emailTemplates/transactional/`.
2. Use the shared layout components from `src/emailTemplates/components/`.
3. Add the component to `src/emailTemplates/registry.ts`.
4. Run `npx tsx scripts/render-email-template.ts --slug <slug>`.
5. Send one controlled SES test before using it in a campaign.

Campaign templates must receive `unsubscribeUrl`. Transactional templates do not require marketing unsubscribe links.

## Images

Email images must use public HTTPS URLs. The current logo URL is centralized in `src/emailTemplates/assets.ts`:

```text
https://www.agulhada.com/logo/logo_agulhada.png
```

Future campaign images should move to a stable asset domain such as:

```text
https://assets.agulhada.com/email/...
```
