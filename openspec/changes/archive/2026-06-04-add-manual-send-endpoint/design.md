## Context

Agulhada Mail already exposes authenticated admin routes in `src/routes.ts` using `API_ADMIN_TOKEN`, renders React Email templates through the registry in `src/emailTemplates/`, and sends through the shared SES v2 wrapper in `src/mailer.ts`. Campaign queueing already creates unsubscribe tokens for marketing sends, while `/api/transactional/send` sends registered transactional templates immediately and checks only global suppressions.

The new manual endpoint is a trusted immediate-send path for admin tools. It must handle both React Email categories while keeping compliance decisions inside Agulhada Mail instead of pushing suppression or unsubscribe logic into callers such as `agulhada-backend`.

## Goals / Non-Goals

**Goals:**

- Add `POST /api/manual/send` protected by the existing bearer admin token.
- Resolve React Email templates by slug without requiring callers to identify category.
- Apply category-specific compliance:
  - transactional templates check global suppressions only;
  - campaign templates check both global and marketing suppressions;
  - campaign templates receive a generated Agulhada Mail unsubscribe URL before render and SES send.
- Support a trusted `subjectOverride` while defaulting to the template subject.
- Return `202 { ok: true, messageId }` after SES acceptance and structured non-2xx JSON errors otherwise.
- Keep `agulhada-backend` and `didineedles` unchanged for this change.

**Non-Goals:**

- Replace `/api/transactional/send`.
- Add Kinde, per-client tokens, OAuth, or scoped API keys.
- Add Mailjet or legacy Handlebars template support to the manual endpoint.
- Create campaign records, enqueue jobs, or update `agulhada-backend`/`didineedles`.
- Introduce new suppression semantics beyond existing global and marketing scopes.

## Decisions

1. Implement the manual API as a new route in `src/routes.ts`.

   Rationale: Existing admin APIs and the transactional send route live there, so route-local validation and response patterns remain consistent. The route should delegate repeated pieces to small helpers if needed, but it does not need a new service layer unless implementation starts duplicating complex logic.

   Alternative considered: Reuse `/api/transactional/send` with a category flag. That would weaken the transactional-only contract and risk campaign sends bypassing unsubscribe requirements.

2. Resolve the template once through `getReactEmailTemplate(templateSlug)`.

   Rationale: The manual endpoint intentionally supports both categories. The registered template definition already carries category and default subject, so callers should not provide category and cannot lie about it.

   Alternative considered: Require `category` in the request. That creates avoidable mismatch cases and makes trusted callers know internal template classification.

3. Generate unsubscribe handling for campaign templates before rendering.

   Rationale: React Email campaign templates already reject missing `unsubscribeUrl`, and `sendWithSes` adds List-Unsubscribe headers when given a URL. Manual campaign sends should follow the same visible footer and header behavior as queued campaigns.

   Implementation should create or load a subscriber record by recipient email so the existing `/u/:token` flow can mark the recipient unsubscribed and add a marketing suppression. The signed token can use that subscriber id and a manual-send identifier or source marker when no campaign id exists.

   Alternative considered: Use an ad hoc unsubscribe URL that only contains email. That would require changing unsubscribe verification and persistence, increasing blast radius.

4. Treat `subjectOverride` as trusted input only on `/api/manual/send`.

   Rationale: Admin tools sometimes need a one-off subject while still using a registered template body. The route should trim and validate a non-empty override, use it for SES subject when present, and leave the rendered template subject untouched otherwise.

   Alternative considered: Add subject override to the renderer. That would blend delivery concerns into template rendering and make the override available in less trusted paths.

5. Use structured JSON errors with status codes chosen by failure class.

   Rationale: Admin callers need actionable responses without scraping text. Suggested classes are `401 unauthorized`, `400 validation_error`, `404 template_not_found`, `409 suppressed`, `422 render_error`, and `502 send_error`.

   Alternative considered: Let Express/zod default errors bubble. That may be inconsistent and harder for callers to automate.

## Risks / Trade-offs

- Manual marketing sends can reach recipients outside a list if an admin tool calls the endpoint directly -> Mitigate by requiring admin auth, applying marketing suppression checks, and ensuring every campaign-category manual send creates usable unsubscribe handling.
- Creating subscriber records for one-off recipients may add contacts that were not imported from a list -> Mitigate by marking an explicit source such as `manual-send` and preserving existing suppression behavior.
- Reusing the broad admin token keeps implementation simple but is not least-privilege -> Mitigate by documenting it as "for now" and leaving room for a future scoped token.
- Immediate sends bypass queue retries and campaign stats -> Mitigate by returning SES acceptance synchronously and tagging SES sends as manual with `category` and `templateSlug` for event correlation.
- `subjectOverride` can be abused by trusted callers -> Mitigate with authentication, length validation, trimming, and no exposure on public or less-trusted endpoints.
