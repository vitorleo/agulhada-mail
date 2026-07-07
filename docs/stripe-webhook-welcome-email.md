# Stripe Webhook Welcome Email

This document describes how to switch the Stripe subscription welcome email from Mailjet to Agulhada Mail.

Scope note: this repository does not edit `C:\Users\Vitor\Documents\codebase\needles`. Apply the `needles/stripewh/index.js` change manually from the recommendation below.

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
  "templateSlug": "welcome",
  "to": "customer@example.com",
  "toName": "Customer Name",
  "bcc": "Agulhada.com <contato@agulhada.com>",
  "data": {
    "email": "customer@example.com",
    "name": "Customer Name",
    "firstName": "Customer",
    "userId": "agulhada-user-id",
    "stripeInvoiceId": "in_...",
    "stripeSubscriptionId": "sub_...",
    "stripeCustomerId": "cus_..."
  }
}
```

Successful response:

```json
{
  "ok": true,
  "messageId": "010301..."
}
```

If the recipient is globally suppressed, the endpoint returns `409` with the suppression reason and does not send email.

## Azure Function Settings

Add these application settings to the Stripe webhook Azure Function:

```text
AGULHADA_MAIL_API_URL=https://email.agulhada.com
AGULHADA_MAIL_API_TOKEN=<same value as agulhada-mail API_ADMIN_TOKEN, or a future narrower transactional token>
```

For this first migration, the current `API_ADMIN_TOKEN` is acceptable if it is stored only in Azure Function app settings. A narrower token can be added later.

## Local HTTP Test

PowerShell example:

```powershell
$body = @{
  templateSlug = "welcome"
  to = "vitorleo@gmail.com"
  toName = "Vitor"
  data = @{
    email = "vitorleo@gmail.com"
    name = "Vitor"
    firstName = "Vitor"
    userId = "manual-test"
    stripeInvoiceId = "manual-test"
    stripeSubscriptionId = "manual-test"
    stripeCustomerId = "manual-test"
  }
} | ConvertTo-Json -Depth 5

curl.exe -i "https://email.agulhada.com/api/transactional/send" `
  -H "Authorization: Bearer $env:AGULHADA_MAIL_API_TOKEN" `
  -H "Content-Type: application/json" `
  --data $body
```

## Recommended `sendWelcomeEmail` Replacement

Replace the Mailjet-based `sendWelcomeEmail(emailTo, firstName)` in `needles/stripewh/index.js` with an HTTP client call like this.

```js
const {
  AGULHADA_MAIL_API_URL,
  AGULHADA_MAIL_API_TOKEN
} = process.env;

function firstNameFrom(name) {
  return typeof name === "string" && name.trim()
    ? name.trim().split(/\s+/)[0]
    : undefined;
}

async function sendWelcomeEmail(emailTo, customerName, stripeContext = {}) {
  if (!emailTo) {
    console.log("Skipping welcome email: missing customer email", stripeContext);
    return;
  }

  if (!AGULHADA_MAIL_API_URL || !AGULHADA_MAIL_API_TOKEN) {
    console.log("Skipping welcome email: missing Agulhada Mail configuration", {
      emailTo,
      stripeInvoiceId: stripeContext.stripeInvoiceId
    });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${AGULHADA_MAIL_API_URL.replace(/\/$/, "")}/api/transactional/send`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${AGULHADA_MAIL_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        templateSlug: "welcome",
        to: emailTo,
        toName: customerName,
        bcc: "Agulhada.com <contato@agulhada.com>",
        data: {
          email: emailTo,
          name: customerName,
          firstName: firstNameFrom(customerName),
          ...stripeContext
        }
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.log("Welcome email request failed", {
        emailTo,
        stripeInvoiceId: stripeContext.stripeInvoiceId,
        status: response.status,
        responseText: responseText.slice(0, 500)
      });
      return;
    }

    console.log("Welcome email requested through Agulhada Mail", {
      emailTo,
      stripeInvoiceId: stripeContext.stripeInvoiceId,
      responseText: responseText.slice(0, 500)
    });
  } catch (error) {
    console.log("Welcome email request error", {
      emailTo,
      stripeInvoiceId: stripeContext.stripeInvoiceId,
      error: error instanceof Error ? error.message : String(error)
    });
  } finally {
    clearTimeout(timeout);
  }
}
```

Then update the existing Stripe event branch:

```js
case "invoice.payment_succeeded": {
  if (dataObject.billing_reason === "subscription_create") {
    await sendWelcomeEmail(dataObject.customer_email, dataObject.customer_name, {
      userId: dataObject.subscription_details?.metadata?.userId,
      stripeInvoiceId: dataObject.id,
      stripeSubscriptionId: dataObject.subscription,
      stripeCustomerId: dataObject.customer
    });
  }
  break;
}
```

## Mailjet Cleanup for This Path

After applying the manual change in `needles`, this welcome path no longer needs:

```js
const Mailjet = require("node-mailjet");
MAILJET_API_KEY
MAILJET_PVT_KEY
```

Only remove the `node-mailjet` package or Mailjet environment variables if no other deployed `needles` function still uses them.

## Resilience

The Stripe webhook should log welcome email errors but should not undo subscription database updates or force Stripe retries just because welcome email delivery failed.

Keep these existing behaviors unchanged:

- subscription updates in MongoDB
- `stripeSubcriptionLog` updates
- Telegram invoice/payment notifications

## Deployment Checklist

1. Deploy the current `agulhada-mail` build to the VPS.
2. Confirm `https://email.agulhada.com/health` returns `{ "ok": true }`.
3. Confirm the deployed VPS has the React Email `welcome` template available:

   ```powershell
   curl.exe -i "https://email.agulhada.com/api/transactional/send" `
     -H "Authorization: Bearer $env:AGULHADA_MAIL_API_TOKEN" `
     -H "Content-Type: application/json" `
     --data $body
   ```

   If this returns `{"error":"Transactional template not found"}`, the VPS has not yet deployed the React Email template commit.

4. Add `AGULHADA_MAIL_API_URL` and `AGULHADA_MAIL_API_TOKEN` to Azure Function app settings.
5. Apply the recommended `sendWelcomeEmail` change in the `needles` repo.
6. Deploy the Azure Function.
7. Trigger a Stripe test event or controlled subscription-create payment.
8. Confirm Agulhada Mail returns a `messageId`.
9. Confirm Mongo `email_events` receives `Send` and `Delivery`.
10. Remove Mailjet credentials for this function after confirming no remaining deployed path needs them.
