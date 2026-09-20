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

## Testing on a preview hostname before the domain exists

The `*.vercel.app` address works before DNS does, but it is **not** simply
production with a different name. Three things behave differently, and only one
of them takes care of itself.

**Same-origin checks — already handled.** `isSameOrigin()` in
`lib/security/request.ts` allows both the configured `APP_BASE_URL` origin and
the `Host` the request actually arrived on, so state-changing requests work on a
preview host with no configuration change.

**Guest management links — needs configuration.** The link a guest uses to
reschedule or cancel is built from `APP_BASE_URL`
(`app/api/reservations/route.ts`, `app/api/staff/reservations/route.ts`). With
`APP_BASE_URL=https://guzargarden.pl` set on a preview deployment, every test
booking mints a link pointing at a domain that is not live yet — a dead link,
stored in the notification row.

So set `APP_BASE_URL` **per environment** in Vercel:

| Vercel environment | `APP_BASE_URL`                                  |
| ------------------ | ----------------------------------------------- |
| Production         | `https://guzargarden.pl`                        |
| Preview            | the preview deployment's own `*.vercel.app` URL |

`metadataBase` and the homepage's schema.org URLs read the same variable, so this
also stops preview deployments advertising canonical URLs for the real domain.

**Preview mode is not a deployment concern.** `RESERVATION_PREVIEW_MODE` is the
credential-free local design mode, and `lib/config/env.ts` refuses to boot in
production when it is enabled, so a production reservation cannot silently run
against the fake adapter. Do not set it in Vercel at all — in either environment.
There is a unit test covering this refusal in `tests/unit/env-sms-modes.test.ts`.

**Keep the databases separated.** There is one Supabase project. A preview
deployment pointed at it writes real rows into the same tables production uses.
Either accept that (and clean up afterwards, per `docs/operations.md` §3) or
create a second Supabase project for Preview and give the Preview environment its
own `NEXT_PUBLIC_SUPABASE_URL`, keys and `DATABASE_URL`. The integration suite
never touches either: it refuses to run against a `*.supabase.co` host.

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

**Vercel Hobby is not a valid plan for this project**, and the reason has nothing to
do with cron. Vercel's own plan documentation states that
"the Hobby plan restricts users to non-commercial, personal use only"
(<https://vercel.com/docs/plans/hobby>, checked 10 September 2026, and
<https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage>). A restaurant
taking bookings is commercial use. **Guzar Garden needs Vercel Pro** (currently
$20 per developer seat / month) or another commercial host, regardless of how the
scheduled jobs are configured.

An earlier revision of this guide claimed Hobby was sufficient for launch. That was
wrong, and it is recorded here rather than quietly deleted because the reasoning
behind it — that neither per-minute job is load-bearing — is still true and still
useful, but it is an argument about correctness, not about licensing.

Vercel's cron limits, for completeness
(<https://vercel.com/docs/cron-jobs/usage-and-pricing>, checked 10 September 2026):

| Plan  | Minimum interval | Scheduling precision |
| ----- | ---------------- | -------------------- |
| Hobby | Once per day     | Per-hour (±59 min)   |
| Pro   | Once per minute  | Per-minute           |

On Pro, deploy `docs/vercel-cron.pro.example.json` as `vercel.json` to get the
per-minute schedules.

**What the jobs actually require in the current, SMS-disabled configuration:**

- `expire-holds` is a backstop, not a correctness requirement. `gg_expire_stale_holds`
  is called opportunistically inside the database before every availability read and
  before every hold, confirm, move and staff write (see
  `supabase/migrations/0007_reservation_functions.sql`). Availability also ignores
  any hold whose `hold_expires_at` has passed. An abandoned hold therefore never
  blocks a table and never collides with the overlap constraint, even if the job
  has not run for a day.
- `process-outbox` has nothing to send while `SMS_PROVIDER=disabled`.
- `cleanup-images` is daily anyway, which Hobby supports.

So on Pro with SMS disabled, a daily `cleanup-images` is genuinely all that must
run; the other two are safety nets. The moment Twilio is enabled, `process-outbox`
becomes the thing standing between a confirmed booking and the guest's phone and
needs its per-minute schedule.

## Supabase plan

**Supabase Free pauses projects.** Supabase's production checklist states that they
"may pause applications on the Free Plan that exhibit low activity in a 7-day
period" (<https://supabase.com/docs/guides/deployment/going-into-prod> and
<https://supabase.com/docs/guides/platform/free-project-pausing>, checked
10 September 2026).

**This has already happened to this project once.** The `GuzarGarden` project was
found paused on 10 September 2026. A paused project also loses its DNS record, so
the API hostname returns `NXDOMAIN` and looks deleted rather than paused.

For a restaurant taking live bookings that is not acceptable: a paused database
means the menu, the booking flow and the staff dashboard all stop at once, and only
somebody with dashboard access can restore it.

Free also has no downloadable database backups and no Point-in-Time Recovery. On
Pro, projects are not paused for inactivity, and PITR is available as an add-on.

**Recommendation: move the Supabase project to Pro before launch.** This document
does not purchase or change anything — the decision and the payment are the owner's.
Until then, treat "the site is completely down" as a plausible weekly event and keep
the restore procedure in `docs/operations.md` to hand.

## DNS and HTTPS sequence

Do this only after the `*.vercel.app` deployment has been verified end to end.

1. **Re-check the existing DNS first.** It was last checked on 10 September 2026
   and it will not have stayed still. Do not skip this — the whole point is to
   know what you are about to replace:

   ```powershell
   nslookup -type=NS guzargarden.pl 8.8.8.8
   nslookup -type=MX guzargarden.pl 8.8.8.8
   nslookup -type=TXT guzargarden.pl 8.8.8.8
   nslookup -type=A guzargarden.pl 8.8.8.8
   ```

   On 10 September 2026 this returned nameservers `ns1/ns2.emailverification.info`
   and **no MX and no TXT records**, which is why switching nameservers was judged
   safe. **If MX or TXT records now exist, stop** — moving nameservers would break
   mail or domain verification. Copy them into Squarespace DNS first.

2. Switch `guzargarden.pl` to Squarespace nameservers (Domain → DNS → Domain
   Nameservers). Until this is done the Squarespace DNS panel is inert.
3. Add `guzargarden.pl` and `www.guzargarden.pl` in Vercel → Settings → Domains.
   Make the apex primary.
4. Copy the exact records Vercel displays into Squarespace DNS. Use Vercel's
   values; do not reuse the ones in this document.
5. Wait for Vercel to mark both names valid and for HTTPS certificates to issue.
6. Verify: `https://guzargarden.pl/menu` shows dishes, `https://www.guzargarden.pl`
   redirects to the apex, and a booking completes end to end.

`.com` stays out of this sequence entirely. It is suspended, only its registrant
can clear it, and nothing about launching `.pl` depends on it.

## Rollback

| Symptom                             | Action                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Bad code deployed                   | Vercel → Deployments → last good production deploy → **Redeploy**                         |
| Domain broken, `*.vercel.app` fine  | DNS only — the application is healthy. Fix records, do not redeploy                       |
| Menu blank / "chwilowo niedostępna" | Check runtime logs for `menu.page_unavailable` / `menu.page_empty`                        |
| Database unreachable                | Supabase may have paused the project — resume it (`docs/operations.md` §4.1)              |
| A migration made things worse       | Migrations are forward-only. Write a corrective migration; do **not** edit an applied one |

A code rollback does **not** roll back the database. If a release included a
migration, decide about the migration separately and explicitly.

## Post-deployment verification

Run against the real deployment, in this order:

1. `/` — homepage renders, signature dishes present (not an empty grid)
2. `/menu` — **check the absence of** "Karta dań jest chwilowo niedostępna"; 200 is not a health check
3. All four languages via the PL/EN/RU/UZ switcher
4. `/reserve` — complete a booking, confirm the code appears, then **cancel it**
5. The management link from that booking opens and the "keep this link" block appears
6. `/staff/login` — sign in, see the booking, change its status
7. Runtime logs — no `menu.*` or `home.*` suppressed-failure events
8. Mobile viewport — no horizontal scrolling on the homepage, menu or booking flow

Then delete the test booking (`docs/operations.md` §3).

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
3. SMS-disabled guest wording, on-screen management link, and undelivered outbox status.
4. Staff login, calendar, live floor, and reservation status changes.
5. Menu image upload, edit, publish/unpublish, and price change.
6. Opening hours, exception dates, table capacities, booking duration, and notice
   rules against the restaurant's real operating policy.
7. Privacy page details and restaurant contact information.
8. Vercel function/cron logs and the staff notification-failure view.
9. Sign in as an administrator, open `/staff/team`, and confirm account creation,
   role changes, password replacement and deactivation. Remove any test account
   immediately after this check.

For the initial published testing period, production must use
`SMS_PROVIDER=disabled`. Leave all `TWILIO_*` values empty and do not set
`RESERVATION_PREVIEW_MODE`. Configure Twilio and run real delivery tests only when
the restaurant decides to activate SMS.

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
