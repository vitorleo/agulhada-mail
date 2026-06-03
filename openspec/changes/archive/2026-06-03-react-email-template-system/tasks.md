## 1. Dependencies and Structure

- [x] 1.1 Add React Email and React dependencies required for server-side rendering.
- [x] 1.2 Create `src/emailTemplates/` with subfolders for shared components, campaign templates, transactional templates, and registry code.
- [x] 1.3 Add centralized email asset URL constants, including the current Agulhada logo URL.

## 2. Renderer and Registry

- [x] 2.1 Implement a React Email template registry keyed by stable kebab-case slugs.
- [x] 2.2 Implement a shared renderer that returns subject, HTML, and plaintext for a registered template slug.
- [x] 2.3 Add clear errors for unknown template slugs and category mismatches.
- [x] 2.4 Enforce that campaign template rendering requires an `unsubscribeUrl`.
- [x] 2.5 Preserve or wrap the existing Handlebars renderer for migration fallback.

## 3. Template Components

- [x] 3.1 Create shared branded layout components for logo, container, footer, CTA button, and recipient metadata.
- [x] 3.2 Port/adapt the `Welcome` transactional template from `didineedles/emailTemplates`.
- [x] 3.3 Port/adapt the `Promo30Days` campaign template from `didineedles/emailTemplates`.
- [x] 3.4 Replace legacy unsubscribe URLs with the app-generated `unsubscribeUrl`.
- [x] 3.5 Ensure campaign URLs encode recipient email or use safe campaign data values.

## 4. Sending Integration

- [x] 4.1 Update campaign creation/enqueue data so queued jobs can resolve a React Email template slug.
- [x] 4.2 Update worker job processing to render registered React Email templates before SES sending.
- [x] 4.3 Update transactional send API to render registered transactional templates by slug.
- [x] 4.4 Keep SES configuration set tags and List-Unsubscribe headers intact.
- [x] 4.5 Keep suppression checks and existing unsubscribe flow unchanged.

## 5. Verification

- [x] 5.1 Add a local render/check script or tests for registered templates.
- [x] 5.2 Verify TypeScript build and existing checks pass.
- [x] 5.3 Send a controlled SES production test email using the React Email renderer.
- [x] 5.4 Confirm Mongo `email_events` receives SES `Send` and `Delivery` events for the test.
- [x] 5.5 Document how to add future React Email templates and where to host email images.
