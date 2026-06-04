## Context

`agulhada-backend` currently sends Mailjet templates by hard-coded `TemplateID` values through `node-mailjet`. The initial migration batch includes those referenced templates plus the requested CST25 marketing template:

| Mailjet ID | Backend label | Mailjet name | Initial local slug |
| --- | --- | --- | --- |
| `6487676` | Marketing 30 dias CST | Marketing 30 days Avulso | `marketing-30-days-cst` |
| `6739428` | Marketing 30 dias | Marketing 30 days Sem CST | `marketing-30-days` |
| `6430901` | 30 dias expirando | Vencendo | `trial-expiring` |
| `7929021` | 30 dias expirando 50% CST24 | Vencendo 50% | `trial-expiring-50-cst24` |
| `6419616` | Welcome | novo_assinante | `welcome` |
| `8051890` | Marketing 30 dias CST25 | Marketing 30 days CST25 | `marketing-30-days-cst25` |

Mailjet `v3/REST/template` and `v3/REST/template/{id}/detailcontent` are accessible with the existing backend Mailjet credentials and return metadata plus HTML, text, and MJML where available. The newer Content API `v1/REST/templates/...` returned `404` with the existing credentials, so it is not required for the initial migration.

This project already has React Email rendering, a registry, shared layout components, and SES sending. The conversion should extend that system rather than add a separate template engine.

## Goals / Non-Goals

**Goals:**

- Preserve raw Mailjet exports for the selected Mailjet migration batch before conversion.
- Convert those templates into maintainable React Email components using the shared Agulhada layout and public HTTPS assets.
- Register converted templates with stable slugs, categories, subjects, and component references.
- Preserve the intent of the Mailjet subject, HTML body, text body, CTA URLs, and personalization variables.
- Provide enough documentation for `agulhada-backend` or another caller to map old Mailjet template IDs to new Agulhada Mail slugs.

**Non-Goals:**

- Replace the whole `agulhada-backend` email UI in this change.
- Recreate Mailjet's visual editor or continue editing templates in Mailjet after migration.
- Send campaign emails through Mailjet.
- Fully hand-convert every historical Mailjet template beyond the selected migration batch unless implementation discovers another active caller.

## Decisions

### Export raw Mailjet content before conversion

The migration will add or use a script to fetch Mailjet metadata and `detailcontent` for the targeted template IDs. Raw output should be stored under a git-ignored migration/export location or committed documentation fixture only if the content is safe to keep in the repository.

Rationale: raw HTML/text/MJML provides a reviewable fallback and prevents the conversion from depending on repeated Mailjet API access.

Alternative considered: convert directly from live API responses without saving raw content. This is faster but loses auditability and makes retries fragile.

### Convert into curated React Email components

The implementation should produce idiomatic React Email components rather than wrapping Mailjet HTML as an opaque blob. It may use Mailjet HTML/MJML as source material, but the final templates should use shared components, typed props, public image URLs, and local render verification.

Rationale: this keeps future edits maintainable and consistent with the existing React Email architecture.

Alternative considered: store Mailjet HTML in string templates and render with Handlebars. This preserves output quickly but continues the legacy-template problem this migration is meant to close.

### Treat marketing templates as campaign templates

The four non-welcome templates are marketing/campaign emails and must require an `unsubscribeUrl` at render time. The welcome template remains transactional and must be renderable without a marketing unsubscribe link.

Rationale: the existing spec already enforces marketing unsubscribe behavior, and SES List-Unsubscribe headers are part of the current delivery path.

Alternative considered: register all converted templates as transactional because the backend sends them manually to individual users. This would bypass unsubscribe requirements for promotional content.

### Use explicit variable mapping

Mailjet variables such as first-name personalization should map to typed template data fields such as `firstName`, `name`, `email`, and `unsubscribeUrl`. Unknown or unused Mailjet variables should be documented during conversion.

Rationale: Mailjet's variable syntax does not belong in React Email components, and typed props make missing data easier to catch in local renders.

Alternative considered: build a compatibility adapter that evaluates Mailjet template syntax. That adds complexity without a long-term benefit once templates are local.

## Risks / Trade-offs

- Mailjet source may include editor-generated markup that is hard to reproduce exactly -> preserve raw exports and verify rendered output by visual/content review rather than requiring byte-for-byte parity.
- Some template assets may point to Mailjet-hosted or temporary URLs -> replace with stable public HTTPS assets or document any asset that needs hosting before send.
- Existing subjects may be supplied by backend form input rather than Mailjet headers -> document default local subjects and allow future callers to override only if the current API supports it.
- The Content API version history is unavailable with current credentials -> use `v3` content for migration and only revisit `v1` if a new Content API token is provided.
- Marketing emails sent one-by-one still require unsubscribe handling -> keep them in the campaign category so current safeguards remain active.

## Migration Plan

1. Export the selected Mailjet templates and record metadata, HTML, text, MJML, and source IDs.
2. Create React Email components for the five campaign templates and update the existing welcome template if needed to match the Mailjet welcome content.
3. Register all converted templates with stable slugs and categories.
4. Render each converted template locally and inspect the generated HTML/text output.
5. Document the Mailjet ID to local slug mapping and any required payload fields.
6. After callers move to Agulhada Mail slugs, retire backend Mailjet sends in a separate change.
