## Context

`agulhada-mail` currently renders email content from MongoDB `email_templates` using Handlebars. Campaign jobs store a `templateId`, the worker loads the template document, injects `unsubscribeUrl`, renders subject/html/text, and sends through SES. Transactional email also loads an `email_templates` document and renders the same way.

`didineedles/emailTemplates` already contains React Email templates for Agulhada, including `Welcome` and `Promo30Days`, plus a simple renderer that produces HTML and text. This change brings that pattern into `agulhada-mail` so SES remains the delivery provider while templates become versioned source code.

## Goals / Non-Goals

**Goals:**

- Add a React Email rendering layer inside `agulhada-mail`.
- Provide a registry of template slugs with category, default subject, and component.
- Port/adapt at least the existing `Welcome` and `Promo30Days` templates.
- Support both campaign and transactional rendering through the same API.
- Ensure campaign templates receive a valid `unsubscribeUrl`.
- Keep hosted images as public HTTPS URLs and centralize base asset URLs.
- Preserve SES event tracking, queue processing, suppression checks, and unsubscribe behavior.

**Non-Goals:**

- Rebuild a full visual email editor.
- Migrate all Mailjet templates in this first change.
- Store compiled React Email HTML in MongoDB as the canonical template source.
- Change SES configuration, SNS webhooks, bounce/complaint handling, or Mailjet list import behavior.
- Build a new asset hosting service immediately.

## Decisions

### Use source-code templates as canonical templates

React Email components will live in the repository under `src/emailTemplates`. The template registry will be the canonical list of available templates.

Alternative considered: keep MongoDB `email_templates` as canonical HTML storage. That is useful for ad hoc HTML templates but weaker for reusable branded layouts, reviewable code, and React Email composition.

### Keep MongoDB metadata but render by slug/component

Campaigns and jobs should refer to a template slug or registry key. Existing `email_templates` documents may remain useful for compatibility, metadata, or future admin surfaces, but the React component should be the source of markup for registered React Email templates.

Alternative considered: continue using `templateId` only. That would require storing React-generated HTML in MongoDB or awkwardly mapping `_id` back to source code.

### Render HTML and plaintext with React Email

The renderer will use React Email render APIs to produce both `html` and `text`. The worker and transactional API will call a shared render function that returns `{ subject, html, text }`.

Alternative considered: render React Email only to HTML and generate text separately through custom code. React Email already supports plaintext rendering, so separate text generation adds maintenance without enough benefit for MVP.

### Centralize shared email layout and assets

Templates will share components such as layout, footer, logo, and CTA button. The initial logo can continue to use `https://www.agulhada.com/logo/logo_agulhada.png`, while the code should make it easy to later use `https://assets.agulhada.com/email/...`.

Alternative considered: inline images or attach them to emails. Public HTTPS images are simpler, cacheable, and standard for campaign email.

### Enforce marketing unsubscribe data

Campaign rendering must require `unsubscribeUrl`; transactional rendering must not require marketing unsubscribe links. Existing SES List-Unsubscribe headers should continue to be set when an unsubscribe URL is present.

Alternative considered: leave unsubscribe as optional for campaigns. That creates compliance and deliverability risk, especially now that SES is in production.

## Risks / Trade-offs

- React Email dependency/build complexity -> Keep the renderer small, add TypeScript checks, and port templates incrementally.
- Template slug mismatch between campaigns and registry -> Validate slugs before creating/enqueuing campaigns and fail jobs clearly if a template is missing.
- Existing queued jobs with Mongo `templateId` only -> Maintain a fallback to Handlebars during transition or migrate queued jobs before deploying.
- Hosted image URL changes can affect all emails -> Centralize asset URLs in one module/config and avoid hardcoded image URLs in every template.
- React Email output may differ from Mailjet rendering -> Preview locally and send test emails before campaigns.
- Mongo `email_templates` usage may become ambiguous -> Document that React Email registry is canonical for registered templates and Mongo HTML templates are compatibility/future-admin data.

## Migration Plan

1. Add React Email dependencies and source template directory.
2. Add shared React Email components and renderer.
3. Port `Welcome` and `Promo30Days` from `didineedles/emailTemplates`.
4. Add registry entries for transactional and campaign templates.
5. Update transactional send and campaign worker rendering to use registry templates by slug, with a temporary Handlebars fallback if needed.
6. Run local render checks and send one production SES test to a controlled recipient.
7. Deploy with conservative send rate settings.

Rollback: keep the existing Handlebars renderer available during the transition. If React Email rendering fails in production, switch affected templates/campaigns back to existing Mongo `email_templates` rendering while fixing the React template.

## Open Questions

- Should `campaigns` store `templateSlug` directly, or should `email_templates` documents be retained as metadata records that point to a registry slug?
- Should image base URL become an environment variable now, or stay as a constant until `assets.agulhada.com` exists?
- Which Mailjet marketing template should be ported after `Promo30Days`?
