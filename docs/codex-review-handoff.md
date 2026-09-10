# Release candidate for independent Codex review

**Branch:** `release/pre-codex-review`
**Release commit:** `8a0643b`
**Base:** `fix/line-endings-format-check` (`6a4516d`), which contains all of `main` (`4d6e587`)
**Working tree:** clean at the time of the final check run
**Date:** 10 September 2026

Everything below was verified by Claude. **Codex has verified none of it.** That is
the point of this document: it says precisely what was run and what was not, so the
review can be independent rather than a re-reading of these claims.

Nothing has been deployed. No DNS record has been changed. No hosting account,
subscription or production setting has been touched.

---

## 1. What changed and why

Four commits on top of the formatting branch.

### `e9a1a2b` — Unblock the integration suite; stop losing focus between steps

**The integration suite was never running on this machine.** It self-skips on
Windows unless `TEST_DATABASE_URL` is set, and the README explains that `initdb`
cannot create its restricted process token on Windows. **That is not true here:**
`@embedded-postgres/windows-x64` ships PostgreSQL 18.4 and `initdb` runs fine. With
a local cluster the suite went from _2 skipped_ to _24 passing_.

**The harness could not run twice.** `applyMigrations` replays every migration
against whatever database it is given, so on a second run `0005` tried to recreate
`public_menu_items` with a numeric price over `0012`'s text one and died with
_"cannot change data type of view column"_. It now drops the `public` schema first,
which is what replaying a history requires. Added `assertDisposable()`, which
refuses to run against any `*.supabase.co` host.

**Focus was dropped at every step of the booking flow.** Verified in the browser:
`document.activeElement` was `<body>` after choosing a party size. Keyboard users
restarted from the top of the document five times per booking; screen-reader users
were told nothing. Focus now moves to the new step's heading.

> My first version of that fix used a "have I rendered before" boolean and **stole
> focus on page load**, because React Strict Mode double-invokes effects in
> development and the flag was already spent. Caught by testing it, then rewritten
> to compare against the previous step value.

### `2e811aa` — Make the no-SMS launch survivable; correct the hosting advice

- **Guests could lose their booking.** With SMS disabled the management link exists
  only in the tab's address bar. The confirmation now shows the link as selectable
  text with a copy button, and says it is the only copy. The clipboard fallback
  selects the link instead of falsely claiming success.
- **Staff could not tell a real delivery from a test.** The outbox stores `sent` for
  console-adapter messages that were only printed to a log. The staff view now names
  the provider and only calls Twilio a delivery. The "resend SMS" button is offered
  only when a resend could actually reach a phone — otherwise it appeared on _every_
  booking and failed every time.
- **Vercel Hobby is not valid for this project** — not on cron grounds, on licensing.
  Vercel's docs: _"the Hobby plan restricts users to non-commercial, personal use
  only"_. A restaurant taking bookings is commercial. **Pro is required.**
- **Supabase Free pauses projects** after low activity in a 7-day period, and a
  paused project loses its DNS record (hence the `NXDOMAIN` that read as "deleted"
  earlier in this project). Pro recommended; nothing purchased.
- `scripts/db-backup.mjs` + `npm run db:backup`, plus `docs/operations.md`.

### `8a0643b` — `/menu` landmark and skip link

`/menu` had **no `<main>` element** in either branch, and its skip link pointed at
`#menu-content`, an id that existed only inside `<noscript>` — so it jumped nowhere
for every visitor with JavaScript. Found by running the browser suite, which had
never run here because Playwright's browsers were not installed.

---

## 2. Changed files

| File                                            | Change                                               |
| ----------------------------------------------- | ---------------------------------------------------- |
| `tests/helpers/database.ts`                     | Schema reset before migrations; `assertDisposable()` |
| `tests/integration/reservation-rules.test.ts`   | **New.** 18 cases                                    |
| `tests/integration/menu-wire-format.test.ts`    | **New.** 4 cases                                     |
| `tests/unit/staff-permissions.test.ts`          | **New.** Role matrix + route authorisation           |
| `tests/e2e/accessibility.spec.ts`               | **New.** 6 cases × 2 devices                         |
| `components/reservation/booking-flow.tsx`       | Focus management; `tabIndex={-1}` headings           |
| `components/reservation/manage-reservation.tsx` | Copy-link block, no-SMS wording                      |
| `components/staff/reservation-actions.tsx`      | `NotificationStatus`; gated resend                   |
| `lib/staff/reservations.ts`                     | `provider` + `deliveredToPhone` on the view model    |
| `lib/observability/suppressed.ts`               | **New.** Redacted reporting of swallowed failures    |
| `app/(menu)/menu/page.tsx`                      | `<main>`, skip-link target, reported fallback        |
| `app/(site)/page.tsx`                           | Reported fallbacks instead of `.catch(() => …)`      |
| `app/(site)/manage/[token]/page.tsx`            | Passes `smsEnabled`                                  |
| `app/styles/reserve.css`                        | Focus ring for step headings; save-link block        |
| `lib/i18n/dictionaries/{pl,en,ru,uz}.ts`        | 8 new keys each                                      |
| `scripts/db-backup.mjs`, `package.json`         | **New.** `npm run db:backup`                         |
| `docs/operations.md`                            | **New.** Backups, recovery, cleanup, owner checklist |
| `DEPLOYMENT-GUIDE.md`                           | Plans, preview hostnames, DNS sequence, rollback     |

---

## 3. Check results — exact

Run on `8a0643b`, working tree clean.

| Check                      | Result                                                      |
| -------------------------- | ----------------------------------------------------------- |
| `npm run typecheck`        | **PASS** — no errors                                        |
| `npm run lint`             | **PASS** — no errors or warnings                            |
| `npm test` (unit)          | **PASS** — 45/45, 7 files                                   |
| `npm run format:check`     | **PASS** — all files                                        |
| `npm run build`            | **PASS** — compiled successfully                            |
| `npm run test:integration` | **PASS** — 24/24, 3 files, against isolated PostgreSQL 18.4 |
| `npm run test:e2e`         | **PASS** — 14/14, Chromium + iPhone 13                      |

Counts before this session: 24 unit, **2 integration (both skipped on Windows)**,
e2e never executed.

### Not run

- **`npm run test:e2e` via its own `webServer`.** It starts `next dev` on port 3000
  and collides with the preview that must stay on 3001. Run it with
  `E2E_BASE_URL=http://localhost:3001` instead — that is how the 14 passes above
  were obtained.
- **No axe-core or Lighthouse audit.** The accessibility work here was targeted at
  specific defects; it is not a full WCAG audit and should not be read as one.
- **No load or soak testing.**
- **No test against a real Supabase/PostgREST instance in CI.** The wire-format
  regression is covered via `row_to_json`, which is the transformation PostgREST
  performs, against local PostgreSQL.

---

## 4. Coverage: devices and languages

|                           | Verified                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Desktop                   | Chromium 1280×900 (e2e) and the browser panel at 1280×900                                                                       |
| Mobile                    | iPhone 13 via Playwright; 375×812 manually — **no horizontal overflow**, copy button within viewport                            |
| Polish                    | Booking flow, menu, confirmation, copy-link block                                                                               |
| English / Russian / Uzbek | `phoneHintNoSms` verified rendering in-browser by switching locale; new `manage` strings typecheck across all four dictionaries |

**Not verified per-language:** the full booking flow end to end in RU and UZ. Only
the strings were checked, not the whole journey.

---

## 5. Remaining issues

### Launch blockers (owner/account action — none are code)

1. **No Vercel account exists**, and Hobby would not be valid anyway — **Pro required**.
2. **Supabase is on Free**, which pauses after ~7 days of low activity and has no
   downloadable backups or PITR. It already paused once. **Pro recommended before launch.**
3. **No real staff admin account.** The only profile is `halilvdemir@example.com`, a
   placeholder that cannot receive a password reset. See §7.
4. **`guzargarden.com` is suspended.** Only the registrant can clear it. Not on the
   `.pl` critical path.
5. **The "we will call you if anything changes" promise has no procedure behind it.**
   The site now tells guests this in four languages. Who calls, and how do they know
   a call is owed? Nothing prompts staff today. Owner decision — `docs/operations.md` §7.

### Later improvements

6. **8 test reservations and 6 notification rows are in the live database.** Cleanup
   SQL is prepared and scoped to eight named codes; **not executed**, awaiting approval.
7. **4 outbox rows say `sent`/`delivered` but came from the console adapter.** The UI
   now explains this; the rows themselves still read as successes to anyone querying
   the table directly.
8. **Supabase Storage has no backup story.** Currently moot — 0 dish photographs
   uploaded — but it becomes real the moment staff upload one.
9. **One Supabase project serves both Production and Preview** unless a second is
   created. See `DEPLOYMENT-GUIDE.md`.
10. **Staff dashboard was not exercised through a real login.** See §7 — I did not
    create staff accounts. Permissions were verified structurally and by unit test,
    not by signing in as a host and being refused.

---

## 6. Owner decisions and account actions still required

- [ ] Create a Vercel account and choose **Pro** (commercial use)
- [ ] Decide whether to move Supabase to **Pro** before launch
- [ ] Provide a real email address for the staff admin account
- [ ] Approve the test-data cleanup in `docs/operations.md` §3
- [ ] Answer the "who calls the guest" question
- [ ] Confirm the 40 tables, capacities, areas, hours, prices, booking rules,
      cancellation policy and contact details — the full checklist is
      `docs/operations.md` §7. **None of these were changed.**
- [ ] Ask Ulugbek to complete ICANN verification for `.com`

---

## 7. How Codex can reproduce this

### Restart the preview on port 3001

```powershell
cd "C:\Users\halil\Desktop\Desktop\Work\Guzar\guzar-garden-site"
npm run dev -- --port 3001
```

It should already be running. If port 3001 is occupied by a stale server,
`taskkill /PID <pid> /F` after checking with
`Get-NetTCPConnection -LocalPort 3001 -State Listen`.

### Unit, lint, typecheck, format, build — no setup needed

```powershell
npm run typecheck; npm run lint; npm test; npm run format:check; npm run build
```

### Integration tests — isolated database, never live

The suite refuses to run against a `*.supabase.co` host and never reads
`DATABASE_URL`. Start a throwaway PostgreSQL from the bundled binaries:

```powershell
$bin = "node_modules\@embedded-postgres\windows-x64\native\bin"
$data = "$env:TEMP\gg-pg"
Remove-Item -Recurse -Force $data -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $data | Out-Null
"postgres" | Out-File -Encoding ascii "$data\pw.txt"
& "$bin\initdb.exe" -D "$data\data" -U postgres --pwfile="$data\pw.txt" -E UTF8 --locale=C
& "$bin\pg_ctl.exe" -D "$data\data" -l "$data\pg.log" -o "-p 54329" start

node -e "const pg=require('pg');(async()=>{const c=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:54329/postgres'});await c.connect();await c.query('drop database if exists guzar_test');await c.query('create database guzar_test');await c.end();console.log('ready')})()"

$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54329/guzar_test"
npm run test:integration
```

The harness drops the public schema and applies every migration from the beginning,
so a green run is also proof that the migration set builds the intended schema.

Stop it afterwards: `& "$bin\pg_ctl.exe" -D "$data\data" stop`

### Browser tests — against the running preview

```powershell
npx playwright install chromium webkit   # once
$env:E2E_BASE_URL = "http://localhost:3001"
npx playwright test
```

**Do not** run `npm run test:e2e` without `E2E_BASE_URL`: it starts its own dev
server on port 3000 and collides with the preview.

### Isolated test data

The integration suite seeds and truncates its own database and touches nothing else.

If you need to exercise the booking flow against the **live** preview (which writes
to the live Supabase project), use an obviously-marked name such as
`CODEX / DoUsuniecia`, **cancel the booking afterwards**, and add its confirmation
code to the cleanup list in `docs/operations.md` §3. Two such bookings from this
session (`5TX5X04Y`, `T4RWD9DQ`) are already cancelled and listed there.

**Never** run `npm run db:reset` or `npm run db:seed` against the live database.

---

## 8. Launch checklist

1. Owner confirms `docs/operations.md` §7 (tables, hours, prices, rules, contact)
2. Vercel **Pro** account created; repository imported
3. Environment variables set — `APP_BASE_URL` **per environment** (§ "Testing on a
   preview hostname" in `DEPLOYMENT-GUIDE.md`); `SMS_PROVIDER=disabled`; fresh
   production `RESERVATION_TOKEN_SECRET` and `CRON_SECRET`
4. Deploy; verify the `*.vercel.app` address against the post-deployment list
5. Decide on Supabase Pro; take a backup (`npm run db:backup`) either way
6. Create the real staff admin; verify login
7. Approve and run the test-data cleanup
8. Re-check DNS (`MX`, `TXT`, `NS`) **before** touching nameservers
9. Switch `.pl` to Squarespace nameservers; add the domain in Vercel; copy Vercel's
   records; wait for HTTPS
10. Post-deployment verification on the real domain, including a real booking that
    is then cancelled
11. `.com` later, once the registrant clears the suspension

## 9. Rollback

| Symptom                            | Action                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| Bad deploy                         | Vercel → Deployments → last good → **Redeploy**                       |
| Domain broken, `*.vercel.app` fine | DNS only; do not redeploy                                             |
| Menu blank                         | Runtime logs: `menu.page_unavailable`, `menu.page_empty`              |
| Database unreachable               | Supabase may have paused — resume (`docs/operations.md` §4.1)         |
| Bad migration                      | Forward-only; write a corrective migration, never edit an applied one |

A code rollback does **not** roll back the database.
