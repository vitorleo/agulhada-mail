# Didineedles Accept-Promo Welcome Email

This document describes how to switch `didineedles/api/acceptPromo/index.js` from the local Mailjet SMTP welcome send to Agulhada Mail.

Scope note: this repository does not edit `C:\Users\Vitor\Documents\codebase\didineedles`. Apply the prompt below from a separate Codex session opened in the `didineedles` repo.

## Agulhada Mail Endpoint

Use the existing authenticated transactional endpoint:

```http
POST https://email.agulhada.com/api/transactional/send
Authorization: Bearer <AGULHADA_MAIL_API_TOKEN>
Content-Type: application/json
```

Payload:

```json
{
  "templateSlug": "welcome30dias",
  "to": "customer@example.com",
  "toName": "Customer Name",
  "data": {
    "email": "customer@example.com",
    "name": "Customer Name",
    "firstName": "Customer",
    "userId": "agulhada-user-id",
    "promoCode": "VIP30",
    "promoLevel": "VIP30"
  }
}
```

The registered `welcome30dias` template uses the subject `Seus primeiros passos no Agulhada.com`. `promoCode` and `promoLevel` are optional for general welcomes, but the didineedles accept-promo request should include them when available so Agulhada Mail can render the promo-specific first-steps copy.

Successful response:

```json
{
  "ok": true,
  "messageId": "010301..."
}
```

If the promo grant fails, do not request the welcome email. The email should only be requested after `acceptPromo` has successfully validated the voucher and granted the `VIP30` subscription.

## Didineedles Settings

Add these settings to the didineedles Azure Function app:

```text
AGULHADA_MAIL_API_URL=https://email.agulhada.com
AGULHADA_MAIL_API_TOKEN=<same value as agulhada-mail API_ADMIN_TOKEN, or a future narrower transactional token>
```

For this first migration, the current `API_ADMIN_TOKEN` is acceptable if it is stored only in Azure Function app settings. A narrower external transactional token can be added later.

## Expected Behavior

- Success: Agulhada Mail returns `202` with `{ "ok": true, "messageId": "..." }`; SES events later appear in Mongo `email_events`.
- Unauthorized: Agulhada Mail returns `401` and does not send email. Log the status and response body in didineedles.
- Suppressed recipient: Agulhada Mail returns `409` with a suppression reason and does not send email. Log it, but keep the promo grant response unchanged.
- Transient failure or timeout: log recipient, promo context, status/error, and a short response preview. Do not undo the promo grant or fail the `acceptPromo` response after the grant is complete.

## Local HTTP Test

PowerShell example:

```powershell
$body = @{
  templateSlug = "welcome30dias"
  to = "vitorleo@gmail.com"
  toName = "Vitor"
  data = @{
    email = "vitorleo@gmail.com"
    name = "Vitor"
    firstName = "Vitor"
    userId = "manual-didineedles-test"
    promoCode = "VIP30"
    promoLevel = "VIP30"
  }
} | ConvertTo-Json -Depth 5

curl.exe -i "https://email.agulhada.com/api/transactional/send" `
  -H "Authorization: Bearer $env:AGULHADA_MAIL_API_TOKEN" `
  -H "Content-Type: application/json" `
  --data $body
```

## Pasteable Codex Prompt for Didineedles

Paste this into Codex while working in `C:\Users\Vitor\Documents\codebase\didineedles`:

```text
Implement the Agulhada Mail welcome email migration for didineedles accept-promo.

Scope:
- Edit only api/acceptPromo/index.js.
- Do not edit api/sendemail.
- Do not edit api/common/emailer.js unless I explicitly ask in a separate request.
- Preserve existing voucher validation, MongoDB user updates, VIP30 subscription creation, and HTTP response behavior.

Goal:
- Replace only the existing Mailjet/Nodemailer welcome email send that happens after a successful promo grant.
- After the promo grant succeeds, call POST {AGULHADA_MAIL_API_URL}/api/transactional/send with Authorization: Bearer {AGULHADA_MAIL_API_TOKEN}.
- Use templateSlug "welcome30dias".
- Send to the authenticated user's email.
- Include toName/name/firstName when available.
- Include data.email, data.name, data.firstName, data.userId, data.promoCode, and data.promoLevel when available.

Behavior:
- If the promo grant result contains an error, do not request the welcome email.
- If AGULHADA_MAIL_API_URL or AGULHADA_MAIL_API_TOKEN is missing after a successful grant, log a concise warning and keep the current successful promo response.
- Use an AbortController timeout around the fetch call, about 8 seconds.
- For non-2xx responses, log recipient, promo code/level, status, and a short response preview.
- For thrown errors or timeouts, log recipient, promo code/level, and the error message.
- Email failures must soft-fail after the promo grant: do not roll back MongoDB updates and do not change the successful API response.

Verification:
- Run the existing didineedles tests or checks that are available locally.
- Show the final diff and confirm only api/acceptPromo/index.js changed.
```

## Deployment Checklist

1. Deploy the current `agulhada-mail` build to the VPS.
2. Confirm `https://email.agulhada.com/health` returns `{ "ok": true }`.
3. Send the local HTTP test above and keep the returned `messageId`.
4. Confirm Mongo `email_events` receives `Send` and `Delivery` for that `messageId`.
5. Add `AGULHADA_MAIL_API_URL` and `AGULHADA_MAIL_API_TOKEN` to didineedles Azure Function settings.
6. Apply the prompt from this document in the `didineedles` repo.
7. Confirm the didineedles session changed only `api/acceptPromo/index.js`.
8. Deploy didineedles and test one controlled promo acceptance.
