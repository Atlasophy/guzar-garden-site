# Guzar Garden deployment and recovery guide

This package contains the complete website, reservation platform, staff dashboard,
menu administration, database migrations, and test suite. It deliberately does not
contain `.env.local`, passwords, API secrets, `node_modules`, or generated build files.

The website and its data are separate:

- Vercel runs the Next.js website and API.
- Supabase stores reservations, staff accounts, settings, menu content, and images.
- Squarespace remains the domain registrar and DNS manager.
- Twilio sends reservation SMS messages — **not configured yet**. The site
  launched with `SMS_PROVIDER=disabled` and does not promise guests a text.
- Resend sends reservation confirmation emails — **not configured yet**. The
  site launched with `EMAIL_PROVIDER=disabled`, same contract as SMS: the
  booking form does not promise an email until it is turned on. The adapter,
  outbox, templates and staff-panel status/resend UI are already built; going
  live needs a verified sending domain and an API key in Vercel — see
  "First online deployment" step 7 below.

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
4. Set `APP_BASE_URL` to the final primary URL. **For the initial launch this is
   `https://guzargarden.pl`, not `.com`** — see "Domain status" below.
5. Leave `TWILIO_STATUS_CALLBACK_URL` unset while SMS is disabled. When Twilio is
   added, set it to `https://guzargarden.pl/api/webhooks/twilio` (matching
   whatever `APP_BASE_URL` is at that time).
6. Production accepts `SMS_PROVIDER=twilio` (with all three `TWILIO_*` values) or
   `SMS_PROVIDER=disabled`. It rejects `console`, which reports success for a
   message nobody sent. `disabled` is the honest launch setting: the booking form
   stops promising guests a confirmation text, and queued messages are recorded
   as `undelivered` rather than sent. Switching to `twilio` later needs only the
   environment values and a redeploy — no code change, and no backlog of stale
   confirmations goes out, because `undelivered` rows are terminal.
7. Same story for email, one provider over: production accepts
   `EMAIL_PROVIDER=resend` (with `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS`) or
   `EMAIL_PROVIDER=disabled`, and rejects `console`. To switch to `resend`,
   verify a sending domain at [resend.com/domains](https://resend.com/domains)
   first — an unverified `EMAIL_FROM_ADDRESS` fails every send. `disabled` is
   the honest launch setting here too.
8. Generate new production-only values for `RESERVATION_TOKEN_SECRET` and
   `CRON_SECRET`. Do not reuse an account password. In PowerShell:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```

   Run it twice and use a different output for each secret.

9. Deploy. Vercel will provide a temporary `*.vercel.app` address, which works
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

## Domain status

Checked 10 September 2026. Both names are registered in Squarespace under the
account `yvo.hakeem@gmail.com`, with **Ulugbek Halbekov (ulugbek43@gmail.com)**
as registrant on both.

- **`guzargarden.pl` — Active.** This is the launch domain. It was on the
  third-party nameservers `ns1/ns2.emailverification.info` and has no MX and no
  TXT records, so moving it to Squarespace nameservers breaks no email.
- **`guzargarden.com` — SUSPENDED.** Squarespace could not verify the registrant
  email, so ICANN verification is outstanding and the name cannot serve traffic.
  **Only Ulugbek can clear this**, by completing the verification email sent to
  `ulugbek43@gmail.com`. Once it is Active, add it in Vercel and redirect it to
  the primary domain — or promote it to primary and update `APP_BASE_URL`.

## Connect the Squarespace domains

After Vercel is deployed:

1. In Squarespace, switch `guzargarden.pl` to **Squarespace nameservers**
   (Domain → DNS → Domain Nameservers → "Use Squarespace nameservers"). The
   panel's DNS records are inert until this is done.
2. Add `guzargarden.pl` and `www.guzargarden.pl` in
   **Vercel → Project → Settings → Domains**, and make `guzargarden.pl` primary.
3. Add the `.com` pair only once its suspension is cleared, and redirect it to
   the primary domain.
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
has a `CRON_SECRET` environment variable.

**Vercel Hobby (daily-only cron) is sufficient for the initial launch**, because
neither per-minute job is load-bearing in this configuration:

- `expire-holds` is a backstop, not a correctness requirement. `gg_expire_stale_holds`
  is called opportunistically inside the database before every availability read and
  before every hold, confirm, move and staff write (see
  `supabase/migrations/0007_reservation_functions.sql`). Availability also ignores
  any hold whose `hold_expires_at` has passed. An abandoned hold therefore never
  blocks a table and never collides with the overlap constraint, even if the job
  has not run for a day.
- `process-outbox` has nothing to send while `SMS_PROVIDER=disabled` and
  `EMAIL_PROVIDER=disabled`.
- `cleanup-images` is daily anyway, which Hobby supports.

This changes the moment Twilio or Resend is enabled: `process-outbox` then
becomes the thing standing between a confirmed booking and the guest's phone
or inbox, and it needs a per-minute scheduler. At that point move to Vercel
Pro or another trusted scheduler that can call these HTTPS routes with the
Bearer header. A ready-to-copy Vercel Pro configuration is included at
`docs/vercel-cron.pro.example.json`; copy it to the project root as
`vercel.json` and redeploy only after the project supports per-minute
schedules.

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
3. SMS delivery to a real Polish and international phone number, and — once
   Resend is configured — confirmation email delivery to a real inbox
   (check spam placement too).
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
