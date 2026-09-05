# Guzar Garden deployment and recovery guide

This package contains the complete website, reservation platform, staff dashboard,
menu administration, database migrations, and test suite. It deliberately does not
contain `.env.local`, passwords, API secrets, `node_modules`, or generated build files.

The website and its data are separate:

- Vercel runs the Next.js website and API.
- Supabase stores reservations, staff accounts, settings, menu content, and images.
- Squarespace remains the domain registrar and DNS manager.
- Twilio sends reservation SMS messages.

Restarting or redeploying Vercel does not erase Supabase data. Do not delete the
Supabase project, and never run `npm run db:reset` against the live database.

## Run it on this Windows computer

Requirements: Node.js 20.9 or newer and the private `.env.local` configuration.

```powershell
cd "C:\path\to\guzar-garden-platform"
npm ci
Copy-Item .env.example .env.local
```

Fill `.env.local` with the existing Supabase and application secrets. Then:

```powershell
npm run dev
```

Open:

- Website: `http://localhost:3000`
- Staff login: `http://localhost:3000/staff/login`

To test the same optimized build used online:

```powershell
npm run build
npm run start
```

Stop either server with `Ctrl+C`.

## First online deployment (recommended: GitHub + Vercel)

1. Create a private GitHub repository and upload the extracted project files.
   Never upload `.env.local`.
2. In Vercel, choose **Add New → Project**, import that repository, and leave the
   detected framework as Next.js.
3. In **Project → Settings → Environment Variables**, add the variables listed in
   `.env.example`. Apply them to Production and Preview where appropriate.
4. Set `APP_BASE_URL` to the final primary URL, normally
   `https://guzargarden.com`.
5. Set `TWILIO_STATUS_CALLBACK_URL` to
   `https://guzargarden.com/api/webhooks/twilio`.
6. Production requires Twilio credentials and `SMS_PROVIDER=twilio`. Until these
   exist, use the local development server for reservation testing; production is
   intentionally configured not to pretend an SMS was delivered.
7. Generate new production-only values for `RESERVATION_TOKEN_SECRET` and
   `CRON_SECRET`. Do not reuse an account password. In PowerShell:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```

   Run it twice and use a different output for each secret.
8. Deploy. Vercel will provide a temporary `*.vercel.app` address, which works
   before Squarespace DNS is ready.

The current Supabase database has already been migrated and seeded. For future code
updates, run only the safe migration command before deployment:

```powershell
npm ci
npm run db:migrate
```

`db:migrate` is repeatable and applies only new migrations. Do not rerun `db:seed`
after staff begin editing live hours, tables, settings, or menu content because the
seed represents the original baseline and can overwrite those baseline values.

## Connect the Squarespace domains

After Vercel is deployed:

1. Add `guzargarden.com`, `www.guzargarden.com`, `guzargarden.pl`, and
   `www.guzargarden.pl` in **Vercel → Project → Settings → Domains**.
2. Make `guzargarden.com` the primary domain.
3. Redirect the other three names to the primary domain.
4. Copy the exact DNS records shown by Vercel into Squarespace DNS. Use Vercel's
   displayed records rather than guessing them.
5. Wait for Vercel to show each domain as valid and for its HTTPS certificate to
   become active.
6. If the primary address changes, update `APP_BASE_URL` and
   `TWILIO_STATUS_CALLBACK_URL` in Vercel and redeploy.

## Scheduled jobs required for launch

The application needs these authenticated jobs:

- Every minute: `/api/jobs/expire-holds`
- Every minute: `/api/jobs/process-outbox`
- Daily: `/api/jobs/cleanup-images`

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when the project
has a `CRON_SECRET` environment variable. Vercel Hobby currently permits only daily
jobs, while the two operational jobs require a per-minute scheduler. Before the real
public launch, use Vercel Pro or another trusted scheduler that can call these HTTPS
routes with the Bearer header. A ready-to-copy Vercel Pro configuration is included
at `docs/vercel-cron.pro.example.json`; copy it to the project root as `vercel.json`
and redeploy only after the Vercel project supports per-minute schedules.

## How to put it back online later

Normally nothing needs to run on this computer. Vercel and Supabase stay online.

- After changing code: push the change to the GitHub `main` branch. Vercel deploys
  it automatically.
- To repeat the current deployment without changing code: open the latest successful
  production deployment in Vercel and choose **Redeploy**.
- If a new deployment is broken: use Vercel's deployment history to restore the
  previous successful production deployment.
- If the custom domain fails: first open the `*.vercel.app` address. If it works,
  the application is online and only Squarespace DNS needs attention.
- If Supabase is paused: restore the project in Supabase, confirm its URL and keys
  have not changed, and redeploy Vercel if any environment value changed.

## Pre-launch verification

Run locally before every important release:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Then verify on the Vercel production address:

1. Public homepage and menu in all four languages.
2. Reservation availability, table selection, confirmation, reschedule, and cancel.
3. SMS delivery to a real Polish and international phone number.
4. Staff login, calendar, live floor, and reservation status changes.
5. Menu image upload, edit, publish/unpublish, and price change.
6. Opening hours, exception dates, table capacities, booking duration, and notice
   rules against the restaurant's real operating policy.
7. Privacy page details and restaurant contact information.
8. Vercel function/cron logs and the staff notification-failure view.

## Backups and secrets

- Keep this source ZIP and the private repository as code backups.
- Database reservations and menu changes are not stored in the ZIP. Manage database
  backups in Supabase and export them regularly, especially on the Free plan.
- Supabase database backups do not include deleted Storage objects, so retain original
  menu photographs separately.
- Keep one secure password-manager record containing the Squarespace, Vercel,
  Supabase, Twilio, and GitHub ownership/recovery details.
- Never send `.env.local` in chat, email, or a ZIP. If a secret is exposed, rotate it
  in its provider dashboard and update Vercel immediately.

