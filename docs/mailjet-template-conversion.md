# Mailjet Template Conversion

This migration converts the selected Mailjet templates into local React Email templates rendered by Agulhada Mail and sent through SES.

## Export

Raw Mailjet source can be exported with:

```powershell
node --env-file=..\agulhada-backend\.env node_modules\tsx\dist\cli.mjs scripts\export-mailjet-templates.ts
```

The exporter writes metadata, HTML, plaintext, MJML, and summary files to:

```text
tmp/mailjet-template-export/
```

The export folder is generated local source material. Re-run the script if Mailjet content changes before conversion review.

## Template Mapping

| Mailjet ID | Mailjet name | Local slug | Category | Default subject |
| --- | --- | --- | --- | --- |
| `6487676` | Marketing 30 days Avulso | `marketing-30-days-cst` | campaign | Experimente o Agulhada.com por 30 dias grátis |
| `6739428` | Marketing 30 days Sem CST | `marketing-30-days` | campaign | Experimente o Agulhada.com por 30 dias grátis |
| `6430901` | Vencendo | `trial-expiring` | campaign | Receba alerta depois dos 30 dias |
| `7929021` | Vencendo 50% | `trial-expiring-50-cst24` | campaign | Receba alerta depois dos 30 dias |
| `6419616` | novo_assinante | `welcome` | transactional | Bem-vindo ao Agulhada.com |
| `8051890` | Marketing 30 days CST25 | `marketing-30-days-cst25` | campaign | 🔥 Teste o Agulhada.com GRÁTIS por 30 dias e leve seu trade apra o próximo nivel! |

## Payload Fields

Converted campaign templates use:

- `firstName`: replaces Mailjet `{{var:firstName:"Agulheiro"}}` or `[[data:firstname:"Agulheiro"]]`; falls back to `name`, then `Agulheiro`.
- `name`: secondary recipient-name fallback.
- `email`: displayed in the footer and appended to the CTA URL as `email`.
- `unsubscribeUrl`: required for every campaign template.

The `welcome` transactional template uses:

- `firstName` or `name`: recipient greeting.
- `email`: footer recipient display.
- `promoCode` and `promoLevel`: optional accept-promo context.

## Assets

Mailjet campaign templates used this image:

```text
https://sgr98.mjt.lu/img2/sgr98/a38a5510-8df8-422d-9175-a39b79fdc716/content
```

The React Email conversion replaces that Mailjet-hosted image with the existing shared Agulhada logo:

```text
https://www.agulhada.com/logo/logo_agulhada.png
```

No additional image asset is required for the first conversion batch.

## Verification

Render all registered templates:

```powershell
npm run render:emails
```

Write rendered HTML/text output:

```powershell
npx tsx scripts/render-email-template.ts --out-dir tmp/email-render
```
