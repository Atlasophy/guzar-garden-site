# Guzar Garden platform

Production-oriented Next.js application for the restaurant website, online table reservations, staff operations, and menu management.

## What is included

- Existing public landing page and menu migrated into one server-rendered application.
- Four guest languages: Polish, English, Russian, and Uzbek.
- Guided booking flow: party size → date → time → table list with a rendered floor illustration → contact details → confirmation.
- Five-minute table holds, server-owned expiry, idempotent confirmation, and database-enforced collision protection.
- SMS confirmation/update/cancellation outbox with Twilio delivery callbacks and retry jobs.
- Email confirmation/update/cancellation alongside SMS, from the same outbox — ships disabled until a provider is configured (see below).
- Guest self-service links for viewing, rescheduling, and cancelling a reservation.
- Authenticated staff dashboard with today view, calendar, live floor state, phone/walk-in reservations, status changes, table moves, blocking, and closure/exception management.
- Menu administration for categories and meals, including names/descriptions in four languages, exact prices, availability/publishing, homepage highlights, allergens, images, archive/restore, and deletion controls.
- Role-based access (`host`, `manager`, `admin`), row-level security, same-origin checks, rate limits, audit records, and redacted logs.

## Architecture

| Layer             | Choice                                                | Responsibility                                                   |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Web               | Next.js 16 App Router, React 19, TypeScript           | Public pages, staff interface, API routes                        |
| 3D                | React Three Fiber, Drei, Three.js                     | Selectable floor plan with accessible list fallback              |
| Data/auth/storage | Supabase (PostgreSQL, Auth, Storage, Realtime)        | Durable bookings, staff sessions, menu images, dashboard updates |
| Messaging         | Twilio Messaging Service                              | Reservation SMS and delivery status callbacks                    |
| Validation        | Zod, React Hook Form, libphonenumber-js               | Server contracts and guest/staff forms                           |
| Testing           | Vitest, real PostgreSQL integration suite, Playwright | Domain rules, database races, browser journeys                   |

The PostgreSQL allocation range is the final authority for table occupancy. Holds, reservations, and staff blocks all use the same exclusion constraint. API checks improve error messages, but correctness does not depend on a browser’s cached availability.

## Quick local design preview

Use Node.js 20.9 or newer. From this folder, run:

```bash
npm ci
node -e "const fs=require('fs');fs.writeFileSync('.env.development.local',fs.readFileSync('.env.example','utf8').replace('RESERVATION_PREVIEW_MODE=false','RESERVATION_PREVIEW_MODE=true'),{flag:'wx'})"
npm run dev
```

Open http://localhost:3000. This creates a development-only configuration without real credentials and refuses to overwrite an existing file. Preview reservations are temporary and do not book the restaurant. Staff access and database-backed menu content require Supabase setup below. Remove the preview configuration when connecting real services.

The approved design includes gallery highlights, an updated floor illustration, two private-room phone enquiry options for 4–6 guests, and verified Google review excerpts. Automatic review refresh requires the optional setup in `docs/google-reviews.md`. The floor illustration is not a verified clickable table map; use the existing table list for selection.

## Local setup

Requirements: Node.js 20.9+, a Supabase project (local or hosted), and optionally a Twilio account.

On a Mac, [`docs/LOCAL-SETUP-MACOS.md`](docs/LOCAL-SETUP-MACOS.md) covers the whole thing end to end: the Supabase CLI stack in Docker, the configuration values, and a staff account. The steps below are for a hosted Supabase project.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and enter the Supabase URL, publishable key, service-role key, direct database connection, application URL, and strong random secrets.

3. Apply the schema and development data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Create the first staff administrator:

   ```bash
   npm run staff:create-admin -- --email owner@example.com --password "use-a-long-unique-password" --name "Owner Name"
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

Public site: `http://localhost:3000`  
Staff login: `http://localhost:3000/staff/login`

Development defaults to `SMS_PROVIDER=console` and `EMAIL_PROVIDER=disabled`. Console records the outbox workflow and prints only a redacted preview; it does not send a real message. Set `EMAIL_PROVIDER=console` locally to preview confirmation emails the same way.

## Supabase setup

- Use the direct or session-pooler PostgreSQL connection for `DATABASE_URL`.
- Migrations create all application tables, functions, constraints, indexes, RLS policies, the public `menu-images` bucket, and Realtime publication entries.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in a browser variable, commit it, or paste it into a client-side dashboard.
- The seed creates Guzar Garden, configurable reservation policy, weekly hours, four dining areas, 40 tables, and the migrated 127-item menu.
- `npm run db:reset` destroys application data. Use it only against a disposable local/development database.

## Twilio and scheduled jobs

For production set `SMS_PROVIDER=twilio`, the Twilio account/auth values, a Messaging Service SID, and the public callback URL. Configure Twilio delivery callbacks to:

```text
https://YOUR_DOMAIN/api/webhooks/twilio
```

Run these authenticated endpoints on a scheduler:

| Frequency    | Endpoint                        | Purpose                                            |
| ------------ | ------------------------------- | -------------------------------------------------- |
| Every minute | `POST /api/jobs/expire-holds`   | Releases abandoned holds                           |
| Every minute | `POST /api/jobs/process-outbox` | Sends/retries queued SMS                           |
| Daily        | `POST /api/jobs/cleanup-images` | Removes orphaned menu uploads after a grace period |

Send `Authorization: Bearer $CRON_SECRET`. The same calls can be tested against a running app with `npm run jobs:expire-holds` and `npm run jobs:process-outbox`.

## Email

No real email provider is wired up yet — `EMAIL_PROVIDER=disabled` is the production-safe default, same contract as `SMS_PROVIDER=disabled`: the booking form does not promise a confirmation email, and every queued message is recorded as `undelivered` rather than sent. The outbox, templates (four languages, HTML + plain text) and staff-panel status/resend UI are already built and shared with SMS; turning email on is a new provider adapter in `lib/notifications/email/` (mirroring `lib/notifications/twilio-provider.ts`) plus the real provider's API key — no schema or application-flow changes.

## Staff permissions

- `host`: view reservations/floor, create phone and walk-in reservations, seat/complete/no-show guests, and toggle meal availability.
- `manager`: host permissions plus edit/reschedule/move/cancel reservations, resend messages, manage blocks/hours, and edit/publish/archive/reorder menu content and images.
- `admin`: manager permissions plus permanent menu deletion, reservation policy, floor-table configuration, areas, and staff administration.

The UI hides unavailable operations, each API route authorizes again, and database RLS/functions form the final boundary.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
npm run test:e2e
```

Integration tests never use `DATABASE_URL`; they use an isolated embedded PostgreSQL or an explicitly supplied disposable `TEST_DATABASE_URL`. On Windows hosts where `initdb` cannot create its restricted process token, provide `TEST_DATABASE_URL`. Browser tests require a configured Supabase environment; set `E2E_BASE_URL` to test an already-running deployment.

## Production checklist

- Fill every production environment value and replace all placeholders.
- Run migrations and seed only the baseline content required for the venue.
- Create staff users individually and apply least-privilege roles.
- Enable Twilio, verify the sender, callback signature, and test messages to real international numbers.
- Configure the three scheduled jobs and alert on failed runs/outbox failures.
- Replace the in-process rate-limit store with a shared Redis/KV store if the deployment uses multiple server instances or receives material abuse traffic.
- Confirm backup/PITR settings and perform a restore drill before launch.
- Verify all table coordinates, capacities, accessible tables, areas, opening hours, visit duration, turnaround, notice window, and cancellation cutoff with restaurant staff.
- Confirm the menu prices highlighted in `docs/menu-migration-report.md`.
- Complete legal review of `/privacy`, including the controller’s full legal name, privacy email, retention periods, and marketing wording.
- Run the entire quality-check list against the production-like environment.

## Known business confirmations

The floor geometry was inferred from supplied venue photographs and is deliberately editable under `/staff/settings`. The seeded hours and booking policy are operational defaults, not final business decisions. Menu translation gaps and price differences inherited from the old pages are documented in `docs/menu-migration-report.md`.
