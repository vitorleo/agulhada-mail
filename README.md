# Agulhada Mail MVP

Small MongoDB-backed email system for Amazon SES campaigns and transactional email.

This repo is intentionally modest: it gives you a safe queue, subscriber tables, unsubscribe flow, SES event handling, and a thin API that can be called from the existing Agulhada apps.

## Why This Shape

References inspected:

- `C:\Users\Vitor\Documents\codebase\agulhada-backend`: Remix admin, Kinde admin permission checks, MongoDB `user` collection, Mailjet template sends.
- `C:\Users\Vitor\Documents\codebase\didineedles`: Azure Functions, MongoDB, Nodemailer over Mailjet SMTP, bundled React Email template renderer, simple unsubscribe endpoint.
- `C:\Users\Vitor\Documents\codebase\needles`: Azure Functions, MongoDB, Stripe webhook-driven transactional email, CSV export scripts.

The MVP keeps the parts already working for you:

- MongoDB as the source of truth.
- A custom app rather than an ESP marketing UI.
- Stored templates and campaign records.
- Explicit unsubscribe and suppression behavior.
- Provider events saved back into your database.

## Quick Start

```bash
npm install
cp .env.example .env
npm run create-indexes
npm run dev
npm run worker
```

The API server starts on `http://localhost:3025` by default.

## Core Flows

- Transactional email: `POST /api/transactional/send` sends immediately unless the address is globally suppressed.
- Campaign email: create/import subscribers, create campaign, enqueue recipients, worker sends at a controlled rate.
- Unsubscribe: `GET /u/:token` shows a confirmation page, `POST /u/:token` marks the subscriber unsubscribed and suppresses future campaign sends.
- SES events: `POST /webhooks/ses` receives SNS messages for bounces, complaints, deliveries, opens, clicks, and subscription events.

## Documentation

- [MVP architecture](docs/architecture.md)
- [Database schema](docs/database-schema.md)
- [API routes](docs/api-routes.md)
- [Amazon SES setup](docs/ses-setup.md)
- [Implementation notes](docs/implementation-notes.md)
- [React Email templates](docs/react-email-templates.md)
