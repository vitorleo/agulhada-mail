# Amazon SES Setup

These steps are based on the current Amazon SES documentation checked on 2026-05-27.

## 1. Pick Region and Identities

Use one AWS region for the MVP: `sa-east-1` (South America / Sao Paulo).

Most Agulhada recipients are in Brazil, so `sa-east-1` keeps the SES setup aligned with the product's primary market. Keep all SES resources for the MVP in the same region: verified identities, production access, configuration set, SNS topic, and sending credentials.

Verify the sending domain, not just a single email address:

- `agulhada.com`
- custom MAIL FROM / return-path subdomain: `email.agulhada.com`

Do not use `mail.agulhada.com` for SES. It is already used for existing mail routing. Do not reuse `send.agulhada.com` unless the old SES attempt is fully audited and intentionally kept.

In SES, create a verified identity for the domain and enable Easy DKIM. Publish the DKIM CNAME records SES gives you.

## 2. Configure Authentication

DNS checklist:

- DKIM: SES Easy DKIM CNAME records for `agulhada.com`.
- SPF for custom MAIL FROM subdomain, TXT on `email.agulhada.com`: `v=spf1 include:amazonses.com ~all`.
- MX for custom MAIL FROM subdomain pointing to the SES feedback endpoint for Sao Paulo: `feedback-smtp.sa-east-1.amazonses.com`.
- DMARC TXT on `_dmarc.agulhada.com`, start with monitoring: `v=DMARC1; p=none; rua=mailto:dmarc@agulhada.com; adkim=s; aspf=r`.

After stable sending, move DMARC gradually from `p=none` to `quarantine`, then maybe `reject`.

## 3. Request Production Access

SES accounts start in sandbox mode. Request production access before sending campaigns.

Include:

- campaign size: 500 to 5000 registered subscribers;
- opt-in source: registered Agulhada users/subscribers;
- unsubscribe link in every marketing email;
- bounce and complaint handling through SNS/webhook;
- suppression handling;
- expected send rate and frequency.

## 4. Create Configuration Set

Create SES configuration set:

```text
agulhada-mail
```

Add an event destination to SNS for:

- send
- reject
- bounce
- complaint
- delivery
- deliveryDelay
- renderingFailure
- open
- click
- subscription

The worker sends with `ConfigurationSetName=agulhada-mail` so SES publishes events for every message.

## 5. Create SNS Topic

Create SNS topic:

```text
ses-agulhada-mail-events
```

Subscribe your webhook endpoint:

```text
https://email.agulhada.com/webhooks/ses?secret=...
```

Confirm the subscription. The MVP route accepts `SubscriptionConfirmation`, but production should validate the SNS signature before confirming.

## 6. Suppression Lists

Enable account-level suppression in SES for bounces and complaints. Keep local suppression too, because your app needs campaign eligibility and audit history.

## 7. Sending API Notes

Use SES v2 `SendEmail`.

For campaign email:

- send one recipient per call;
- include `ConfigurationSetName`;
- include `EmailTags` for `campaignId`, `subscriberId`, `jobId`, and `category`;
- include unsubscribe headers;
- include the visible unsubscribe footer.

For transactional email:

- omit marketing unsubscribe behavior;
- still tag with `category=transactional`;
- never send to global suppressions from complaints/manual blocks.

## Sources

- Amazon SES SendEmail API: https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html
- SES event publishing setup: https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-using-event-publishing-setup.html
- SES SNS event examples: https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-examples.html
- SES subscription management: https://docs.aws.amazon.com/ses/latest/dg/sending-email-subscription-management.html
- SES lists and suppression overview: https://docs.aws.amazon.com/ses/latest/dg/lists-and-subscriptions.html
- SES DMARC guidance: https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html
- SES sending quotas: https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html
