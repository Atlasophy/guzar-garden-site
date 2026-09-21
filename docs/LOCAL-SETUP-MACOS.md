# Running Guzar Garden on a Mac

This sets up a complete, self-contained copy on one MacBook: the website, the
booking flow, the staff dashboard and menu administration, with its own database
full of sample data.

**It never touches the restaurant's real data.** Everything runs on the laptop.
Bookings made here are not real bookings, and nothing here can change the live
site.

## Why a local Supabase is required

The application does not talk to PostgreSQL directly. It calls Supabase's REST
and RPC API for data (`lib/supabase/admin.ts`), Supabase Auth for staff login
(`scripts/create-admin.mjs`), and Supabase Storage for menu images. Installing
plain PostgreSQL is therefore not enough — none of those endpoints would exist.

The Supabase CLI runs all of it locally in Docker. That is what the steps below
set up.

## What to install first

| Tool           | Check it works       | If missing                                                                          |
| -------------- | -------------------- | ----------------------------------------------------------------------------------- |
| Node.js 20.9+  | `node -v`            | [nodejs.org](https://nodejs.org) or `brew install node`                             |
| Docker Desktop | `docker info`        | [docker.com](https://www.docker.com/products/docker-desktop/) — **must be running** |
| Supabase CLI   | `supabase --version` | `brew install supabase/tap/supabase`                                                |
| Git            | `git --version`      | `xcode-select --install`                                                            |

Apple Silicon (M1–M4) and Intel Macs both work. Docker Desktop must be actually
started — its whale icon visible in the menu bar — not merely installed.

Expect roughly 3 GB of disk for the Docker images the first time.

## Setup

### 1. Get the code and its dependencies

The repository is public, so this needs no GitHub account and no access
request. (Pushing branches back still requires being added as a collaborator;
running it does not.)

```bash
git clone https://github.com/Atlasophy/guzar-garden-site.git
cd guzar-garden-site
npm ci
```

### 2. Start the local Supabase stack

```bash
supabase start
```

The first run downloads several Docker images and takes a few minutes. Later
runs take seconds.

This one command creates the database, applies all thirteen migrations, and
loads the seed: the venue, its opening hours and booking policy, four dining
areas, 40 tables and the full 127-dish menu.

When it finishes it prints a block of values. Keep that terminal — the next step
needs it. To print it again at any time:

```bash
supabase status
```

### 3. Create the configuration file

```bash
cp .env.example .env.local
```

Open `.env.local` and set these five. The first two are the same on every
machine; the other three come from what `supabase status` printed.

| Variable                               | Value                                                     |
| -------------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `http://127.0.0.1:54321`                                  |
| `DATABASE_URL`                         | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `anon key` / `publishable key`                        |
| `SUPABASE_SERVICE_ROLE_KEY`            | the `service_role key` / `secret key`                     |
| `APP_BASE_URL`                         | `http://localhost:3000`                                   |

Then replace the two placeholder secrets with real random values:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"  # RESERVATION_TOKEN_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # CRON_SECRET
```

Leave `SMS_PROVIDER=console` and every `TWILIO_*` value empty. No text message
is sent; the console adapter prints a redacted preview instead.

### 4. Create a staff account

```bash
npm run staff:create-admin -- \
  --email you@example.com \
  --password "choose-a-long-password" \
  --name "Your Name"
```

The password must be at least 12 characters.

### 5. Run it

```bash
npm run dev
```

|                                    |                                     |
| ---------------------------------- | ----------------------------------- |
| Website                            | <http://localhost:3000>             |
| Staff login                        | <http://localhost:3000/staff/login> |
| Database browser (Supabase Studio) | <http://127.0.0.1:54323>            |

Stop the site with `Ctrl+C`. Stop the database with `supabase stop` — its
contents survive until the next `supabase db reset`.

## Everyday commands

| Command                              | What it does                                                  |
| ------------------------------------ | ------------------------------------------------------------- |
| `supabase start` / `supabase stop`   | Bring the database up or down                                 |
| `supabase status`                    | Print the local URLs and keys again                           |
| `supabase db reset`                  | Wipe the local database and rebuild it from migrations + seed |
| `npm run dev`                        | Run the site                                                  |
| `npm test`                           | Unit tests                                                    |
| `npm run typecheck` / `npm run lint` | The same checks CI runs                                       |

## Important: do not run the database scripts here

`npm run db:migrate`, `npm run db:seed` and `npm run db:reset` are for a **hosted
Supabase project**. The CLI already applied the migrations and the seed in
step 2, using its own ledger.

Running `db:migrate` against the local stack makes it try to apply every
migration a second time, and it fails — the migrations use plain `create table`,
not `create table if not exists`.

Use `supabase db reset` to start the local database over. It is the local
equivalent and it is safe.

## If something goes wrong

**`supabase start` fails on this config file.** CLI versions differ in which
keys they accept. Update first (`brew upgrade supabase`). If it still fails,
rename `supabase/config.toml`, run `supabase init` to generate one for your
version, then copy the `[db.seed]` block from the old file into the new one —
that block is what loads the menu.

**`Cannot connect to the Docker daemon`.** Docker Desktop is not running. Start
it and wait for the whale icon to stop animating.

**Port already in use.** Something else holds 54321–54324 or 3000. Find it with
`lsof -i :54322`, or change the ports in `supabase/config.toml`.

**The menu page says the menu is unavailable.** The site cannot reach Supabase.
Check `supabase status` shows it running, and that `NEXT_PUBLIC_SUPABASE_URL`
and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` match what it prints. Restart
`npm run dev` after editing `.env.local` — it reads the file only at startup.

**Staff login rejects a correct password.** The account belongs to one database.
If `supabase db reset` ran since, it was wiped — create it again with step 4.

**`npm ci` fails building `sharp` or `three`.** Run `xcode-select --install`,
then delete `node_modules` and retry.

## What will not work locally, and that is expected

- **SMS.** `SMS_PROVIDER=console` prints a redacted preview instead of texting.
- **Google review refresh.** Needs credentials the project does not have; the
  page falls back to the dated snapshot. See `docs/google-reviews.md`.
- **Scheduled jobs.** `vercel.json` only applies to a real deployment. Trigger
  them by hand if needed: `npm run jobs:expire-holds`, `npm run jobs:process-outbox`.
- **Real photographs.** Seeded menu items have no images until some are
  uploaded through the staff dashboard.

## Do not copy the real credentials onto this machine

This setup deliberately uses a throwaway local database, so the production
Supabase keys are never needed and should not be pasted into `.env.local`.

The `SUPABASE_SERVICE_ROLE_KEY` of the hosted project bypasses row-level
security entirely: it grants unrestricted read and write access to real guests'
names and phone numbers. Never send it over chat or email, and never commit an
`.env.local`. `.gitignore` already excludes it.
