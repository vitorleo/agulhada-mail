## Why

Agulhada Mail needs a maintainable template system for both marketing campaigns and transactional emails as SES moves into production use. React Email is a good fit because Agulhada already has working React Email templates in `didineedles`, and code-based templates are easier to version, preview, test, and adapt than copied Mailjet HTML.

## What Changes

- Add a React Email based template rendering capability inside `agulhada-mail`.
- Introduce a template registry for campaign and transactional templates with subjects, categories, and strongly named template slugs.
- Port/adapt existing Agulhada templates from `didineedles/emailTemplates`, starting with the welcome and promo campaign templates.
- Render HTML and plaintext from React Email at send/enqueue time.
- Update campaign sending to provide marketing-specific data such as `unsubscribeUrl`, recipient name, recipient email, source, and campaign metadata.
- Update transactional sending to use the same renderer without requiring marketing unsubscribe links.
- Keep SES as the delivery provider and keep MongoDB as the source of campaign, queue, subscriber, suppression, and event data.
- Keep public images hosted via stable HTTPS URLs, initially using existing Agulhada assets, with room to move to `assets.agulhada.com` later.

## Capabilities

### New Capabilities

- `react-email-templates`: Defines how Agulhada Mail stores, selects, renders, and sends React Email templates for campaign and transactional email.

### Modified Capabilities

None.

## Impact

- Adds React Email dependencies and template source files to `agulhada-mail`.
- Affects the worker and transactional send API where templates are rendered before SES delivery.
- Affects campaign enqueue/send data because marketing emails must include a valid unsubscribe URL.
- May change how `email_templates` is used: campaign and transactional template metadata may remain in MongoDB, but canonical template markup moves to versioned source code.
- Requires a local preview/import workflow for future templates and a consistent strategy for hosted logo/image URLs.
