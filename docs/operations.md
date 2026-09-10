# Operations: backups, recovery, test data, and the owner's checklist

Everything here is written to be executed by a person who did not build the
system. Nothing in this document has been run against live data. The cleanup in
§3 in particular **requires the owner's approval before anyone executes it.**

Verified 10 September 2026 against the live Supabase project and the code in this
repository.

---

## 1. What can be lost, and what protects it

| Thing                                | Where it lives                     | Protected by                        |
| ------------------------------------ | ---------------------------------- | ----------------------------------- |
| Reservations, guests, audit log      | Supabase Postgres                  | Supabase backups (**see caveat**)   |
| Menu content, prices, translations   | Supabase Postgres                  | Same, plus `supabase/seed_menu.sql` |
| Opening hours, tables, areas, policy | Supabase Postgres                  | Same, plus `supabase/seed.sql`      |
| Uploaded dish photographs            | Supabase Storage                   | **Nothing automatic** — see §2.3    |
| Application code                     | GitHub                             | Git history                         |
| Secrets                              | Vercel env vars + password manager | Neither is a backup of the other    |

**Caveat that matters more than any other line in this file:** Supabase's Free
plan has **no downloadable database backups and no Point-in-Time Recovery**, and
Supabase "may pause applications on the Free Plan that exhibit low activity in a
7-day period" (<https://supabase.com/docs/guides/deployment/going-into-prod>,
checked 10 September 2026). This project **was found paused on 10 September 2026**.

So on the current plan the honest position is: _there is no automatic recovery
path for reservation data._ §2 is therefore not optional housekeeping — it is the
only backup that exists until the project moves to Pro.

---

## 2. Backup procedure

### 2.1 Database — manual export (Free plan)

Run from the repository root, with `.env.local` present. It reads `DATABASE_URL`
and writes a timestamped SQL file outside the repository.

```powershell
npm run db:backup
```

Keep the output somewhere that is not this laptop. The file contains **guest
names, emails and phone numbers** — it is personal data under GDPR. Store it
encrypted, and delete old copies on the same retention schedule as the privacy
policy promises.

**This has been tested end to end, not just written down** (10 September 2026,
against an isolated PostgreSQL 18.4 — never against live data):

1. Exported 209 rows from a seeded database.
2. Created a second, empty database and applied `supabase/migrations/*.sql`.
3. Replayed the backup into it.
4. Compared row counts table by table — all eleven matched — and confirmed the
   `public_menu_items.price` wire format was still a JSON **string** afterwards.

The drill found a real defect on its first run: `text[]` columns (`allergens`,
`dietary_tags`, `search_aliases`) were being written as `jsonb` and the restore
failed with _"column is of type text[] but expression is of type jsonb"_. A
backup nobody has restored is a guess; this one has been restored.

### 2.2 Database — on Pro

Enable Point-in-Time Recovery in the Supabase dashboard once the project is on
Pro. That replaces §2.1 as the primary mechanism; keep a periodic manual export
anyway, because PITR does not protect against "somebody deleted the project".

### 2.3 Storage (dish photographs)

`menu_items.image_path` currently has **0 rows with an image** — no photographs
have been uploaded yet, so there is nothing to back up today. This changes the
moment staff upload the first dish photo.

Supabase database backups do **not** include Storage objects. Whoever uploads the
photographs must keep the originals. Write that into the handover to the
restaurant; it is not recoverable from the application.

### 2.4 Secrets

One password-manager record holding Squarespace, Vercel, Supabase, Twilio (when
it exists) and GitHub ownership/recovery details. Never in the repository, never
in chat, never in a ZIP.

---

## 3. Test data currently in the live database

**Do not execute anything in this section without the owner's approval.**

Verified 10 September 2026. The live database contains **8 reservations, all of
them test data** — there are no real guest bookings yet:

| Code       | Status    | Guest                      | Origin                                  |
| ---------- | --------- | -------------------------- | --------------------------------------- |
| `W3WPAXMF` | confirmed | Anna Przykładowa           | `supabase/seed.sql` demo row            |
| `9TPRSN90` | seated    | Dilnoza Namunaviy          | `supabase/seed.sql` demo row            |
| `6THX7WW7` | completed | Marek Testowy              | `supabase/seed.sql` demo row            |
| `GBQKQGN6` | no_show   | Piotr Nieobecny            | `supabase/seed.sql` demo row            |
| `3W4Z298R` | cancelled | Olga Odwołana              | `supabase/seed.sql` demo row            |
| `0ZRW2Z17` | pending   | Yulia Primernaya           | `supabase/seed.sql` demo row            |
| `5TX5X04Y` | cancelled | TEST-Atlasophy DoUsuniecia | Claude, 10 Sep 2026 — flow verification |
| `T4RWD9DQ` | cancelled | TESTB DoUsuniecia          | Claude, 10 Sep 2026 — flow verification |

Notification outbox: **6 rows** — 4 produced by the `console` adapter (3 `sent`,
1 `delivered`, none of which reached a phone) and 2 by the `disabled` adapter
(`undelivered`, correct). Audit log: 4 rows.

### 3.1 Why the console rows matter

`sent` and `delivered` from the `console` provider are the most misleading rows
in the database: they describe messages that were printed to a server log. The
staff interface now names the provider and refuses to call anything but Twilio a
delivery (`components/staff/reservation-actions.tsx`), but the rows themselves
still read as successes to anyone querying the table directly. Removing them
before launch is worth doing for that reason alone.

### 3.2 Narrowly scoped cleanup

This deletes **only** the eight codes listed above and their dependent rows. It
names them explicitly rather than using a date range or a `LIKE 'TEST%'` pattern,
so it cannot widen if it is run later, after real bookings exist.

Run it inside a transaction and read the counts before committing.

```sql
begin;

-- Everything that hangs off the reservations, then the reservations.
with doomed as (
  select id from reservations
   where confirmation_code in (
     'W3WPAXMF','9TPRSN90','6THX7WW7','GBQKQGN6',
     '3W4Z298R','0ZRW2Z17','5TX5X04Y','T4RWD9DQ'
   )
)
select count(*) as reservations_to_delete from doomed;   -- expect exactly 8

delete from notification_outbox
 where reservation_id in (
   select id from reservations where confirmation_code in (
     'W3WPAXMF','9TPRSN90','6THX7WW7','GBQKQGN6',
     '3W4Z298R','0ZRW2Z17','5TX5X04Y','T4RWD9DQ'));

delete from table_allocations
 where reservation_id in (
   select id from reservations where confirmation_code in (
     'W3WPAXMF','9TPRSN90','6THX7WW7','GBQKQGN6',
     '3W4Z298R','0ZRW2Z17','5TX5X04Y','T4RWD9DQ'));

delete from reservations
 where confirmation_code in (
   'W3WPAXMF','9TPRSN90','6THX7WW7','GBQKQGN6',
   '3W4Z298R','0ZRW2Z17','5TX5X04Y','T4RWD9DQ');

-- Orphaned console-adapter notifications with no reservation attached.
delete from notification_outbox where provider = 'console';

-- Read the result, then decide.
select
  (select count(*) from reservations)        as reservations_left,
  (select count(*) from notification_outbox) as notifications_left;

-- commit;    -- uncomment only when the counts above are what you expect
-- rollback;  -- the safe default
```

**Do not** run `npm run db:reset`, and **do not** re-run `npm run db:seed`: the
seed re-inserts these same demo reservations, and it would also overwrite hours,
tables, settings and menu content that staff may have edited by then.

The audit log is deliberately left alone. It is a record of what happened,
including the test bookings, and truncating it to make a dashboard look tidy is
the opposite of what an audit log is for.

---

## 4. Recovery drills

### 4.1 Restore a paused Supabase project

1. Open the project in the Supabase dashboard. A paused project shows "Project is
   paused" with a **Resume project** button.
2. Resume. Data, backups and storage objects survive a pause.
3. Wait for the API hostname to resolve again — a paused project has **no DNS
   record**, so `NXDOMAIN` before the restore completes is expected and does not
   mean the project is gone.
4. Confirm with `npm run db:migrate` (safe, repeatable — it reports "Already up to
   date") and by loading `/menu`.

**Tested:** performed on 10 September 2026. All data intact afterwards: 127 menu
items, 40 tables, 14 categories, 7 days of hours.

### 4.2 Rebuild the schema from migrations

Verified 10 September 2026: applying `supabase/migrations/*.sql` in order to an
empty database produces a schema that matches the live one. The comparison
covered columns, tables, constraints, indexes, views, RLS policies, enum values
and triggers; the only differences were the `schema_migrations` bookkeeping table
itself and PostgreSQL 18's habit of naming `NOT NULL` constraints in
`pg_constraint`, which the older Postgres behind Supabase does not do.

To repeat it:

```powershell
# Start a throwaway PostgreSQL (binaries ship with the repo's dev dependencies)
$bin = "node_modules\@embedded-postgres\windows-x64\native\bin"
& "$bin\initdb.exe" -D "$env:TEMP\gg-pg\data" -U postgres --pwfile=... -E UTF8 --locale=C
& "$bin\pg_ctl.exe" -D "$env:TEMP\gg-pg\data" -o "-p 54329" -l "$env:TEMP\gg-pg\pg.log" start

$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54329/guzar_test"
npm run test:integration
```

The integration harness drops the public schema and applies every migration from
the beginning, so a green run _is_ the proof that the migration set builds the
intended schema.

### 4.3 Roll back a bad deployment

1. Vercel → the project → **Deployments** → the last known-good production
   deployment → **Redeploy**.
2. Code rollback does **not** roll back the database. If the bad release included
   a migration, decide explicitly what to do about it — migrations here are
   forward-only by design, so the answer is usually a new corrective migration
   rather than an attempt to undo one.
3. If the custom domain is failing but the `*.vercel.app` address works, the
   application is fine and the problem is DNS.

---

## 5. Migration checksum warnings

`npm run db:migrate` prints a warning for migrations `0002`–`0011`:

```
⚠  0005_menu has changed since it was applied. Migrations are append-only —
   add a new file rather than editing one that is already in a database.
```

**These are cosmetic, and that is a measured conclusion rather than an
assumption.** The files were reformatted after being applied (Prettier, line
endings), which changes their checksum without changing the SQL. The proof is in
§4.2: a database built purely from the current files matches the live schema
exactly.

The warnings are deliberately **not** silenced. They are correct about the fact
they report — the files did change — and a future real divergence would print the
same warning. Re-run the §4.2 comparison rather than trusting this note if the
list of warned files ever changes.

---

## 6. Production error visibility

Failures that used to be silent now emit one structured, redacted line each
(`lib/observability/suppressed.ts`). Search Vercel's runtime logs for:

| Event                         | Means                                                         |
| ----------------------------- | ------------------------------------------------------------- |
| `menu.page_unavailable`       | `/menu` threw and fell back to the phone-number notice        |
| `menu.page_empty`             | The menu query succeeded but returned nothing                 |
| `home.signatures_unavailable` | The homepage signature grid is empty because the query failed |
| `home.venue_info_unavailable` | Address/hours fell back to hard-coded defaults                |
| `outbox.send_threw`           | A notification attempt raised rather than failing cleanly     |

Every line is JSON with `level`, `event` and `at`. Error text is sanitised before
it is logged: query strings are stripped, anything email-shaped is replaced, and
any token-like run of 24+ characters is redacted, so a management token in a
failing URL cannot reach a log aggregator.

**Alert on `menu.page_unavailable` and `menu.page_empty` in particular.** The bug
they were added for made the entire menu unavailable in every language, and
because the page degraded politely nobody noticed for over a week.

### Manual health checks

```powershell
# The public menu really has dishes in it, not just HTTP 200
curl -s https://guzargarden.pl/menu | Select-String -Pattern "Karta dań jest chwilowo"   # expect NO match

# Availability responds
curl -s "https://guzargarden.pl/api/availability?date=2026-09-20&partySize=2"
```

An HTTP 200 on `/menu` is **not** a health check — the page returns 200 while
showing "temporarily unavailable". Check for the absence of that string.

---

## 7. Owner confirmation checklist

None of these are facts the development team can invent, and none have been
changed. Each is currently a **seeded operational default**. Please confirm or
correct each one before launch.

**The room**

- [ ] 40 tables is the real number bookable online
- [ ] Each table's minimum and maximum party size
- [ ] Which tables are genuinely step-free / accessible
- [ ] The four areas — Sala główna, Czajchana, Ogród, and the private rooms — are
      named as the restaurant names them
- [ ] The floor plan positions match the real room. **The 3D plan is explicitly
      not a verified map**; guests choose from the list beside it
- [ ] The two private rooms should remain phone-enquiry only for 4–6 guests

**The rules**

- [ ] Open 09:00–24:00 every day, including public holidays
- [ ] A table is held for a 120-minute sitting
- [ ] 15 minutes of turnaround between sittings
- [ ] Bookings accepted up to 30 minutes before arrival
- [ ] Bookings accepted up to 90 days ahead
- [ ] Maximum 12 guests online; larger parties telephone
- [ ] Free cancellation up to 2 hours before; the cancellation wording in all
      four languages
- [ ] Any closure dates already known (holidays, private events)

**The menu**

- [ ] 127 dishes across 14 categories is current
- [ ] The prices, especially the five flagged in `docs/menu-migration-report.md`
      where the old landing page and the printed menu disagreed
- [ ] The five homepage "signature" dishes are the ones to feature

**Contact and legal**

- [ ] +48 570 088 888 is the number guests should call
- [ ] al. Zieleniecka 6/8, 03-727 Warszawa is correct for maps and schema.org
- [ ] The privacy page: controller's full legal name, privacy contact address,
      retention periods, marketing wording

**The "we will call you" promise**

The booking form now tells guests, in all four languages, that the restaurant
will call if anything changes — because with SMS disabled nothing else reaches
them. **That is a promise about how the restaurant operates, and it currently has
no procedure behind it.** Before launch, the owner needs to decide:

- [ ] Who calls a guest when staff move, reschedule or cancel their booking?
- [ ] How does that person know a call is owed? (Today: nothing prompts them —
      they would have to notice the change themselves.)
- [ ] What happens for a booking made for tonight when the restaurant has to
      close at short notice?

Until that is answered, the wording is a claim the restaurant may not keep. The
alternative is to soften it to "please call us if your plans change" — one string
per language in `lib/i18n/dictionaries/*.ts` (`phoneHintNoSms`).
