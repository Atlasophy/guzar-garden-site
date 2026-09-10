import { readdir, readFile } from 'node:fs/promises';
import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

/**
 * A real PostgreSQL for the integration suite.
 *
 * Order of preference:
 *   1. `TEST_DATABASE_URL` — an explicitly disposable database you provide.
 *   2. An embedded PostgreSQL started on a free port into a temporary data
 *      directory and thrown away afterwards.
 *
 * It has to be real PostgreSQL rather than a stub: the guarantees under test —
 * the GiST exclusion constraint, half-open range semantics, `for update skip
 * locked`, timezone conversion across a DST boundary — are the database's
 * behaviour, and a fake would only ever confirm my own assumptions about it.
 */

const ROOT = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
  '..',
);
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

export interface TestDatabase {
  pool: pg.Pool;
  connectionString: string;
  /** Truncate every data table, keeping the schema. */
  reset(): Promise<void>;
  seed(): Promise<void>;
  close(): Promise<void>;
}

let shared: Promise<TestDatabase> | null = null;

/** Cached across the whole vitest run — starting PostgreSQL is not cheap. */
export function getTestDatabase(): Promise<TestDatabase> {
  shared ??= createTestDatabase();
  return shared;
}

async function createTestDatabase(): Promise<TestDatabase> {
  // Never fall back to DATABASE_URL: integration tests truncate every table,
  // and an ordinary development/production connection must never be targeted.
  const external = process.env.TEST_DATABASE_URL;
  if (external) {
    assertDisposable(external);
    const pool = new pg.Pool({ connectionString: external, max: 8 });
    await applyMigrations(pool);
    return makeHandle(pool, external, async () => {
      await pool.end();
    });
  }

  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const port = 54000 + Math.floor(Math.random() * 900);
  const dataDir = path.join(os.tmpdir(), `guzar-test-pg-${process.pid}-${port}`);
  if (existsSync(dataDir)) rmSync(dataDir, { recursive: true, force: true });

  const server = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
    // The seed carries Polish, Russian and Uzbek text; a WIN1252 cluster (what
    // initdb picks by default on a Polish Windows) cannot store it.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });

  await server.initialise();
  await server.start();

  const connectionString = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
  const pool = new pg.Pool({ connectionString, max: 8 });
  await applyMigrations(pool);

  return makeHandle(pool, connectionString, async () => {
    await pool.end();
    await server.stop();
    rmSync(dataDir, { recursive: true, force: true });
  });
}

function makeHandle(
  pool: pg.Pool,
  connectionString: string,
  teardown: () => Promise<void>,
): TestDatabase {
  return {
    pool,
    connectionString,
    async reset() {
      await pool.query(`
        truncate
          audit_log, notification_outbox, table_allocations, reservations,
          service_exceptions, menu_items, menu_categories,
          restaurant_tables, dining_areas, business_hours,
          reservation_settings, staff_profiles, venues
        restart identity cascade
      `);
      await pool.query('delete from auth.users');
    },
    async seed() {
      for (const relative of ['supabase/seed.sql', 'supabase/seed_menu.sql']) {
        const sql = await readFile(path.join(ROOT, relative), 'utf8');
        await pool.query(sql);
      }
    },
    close: teardown,
  };
}

/**
 * Refuse to run against anything that is not obviously disposable.
 *
 * This helper truncates every table and drops the public schema. `DATABASE_URL`
 * is already excluded by never being read here, but `TEST_DATABASE_URL` is
 * supplied by hand and a paste error is cheap to make and expensive to survive.
 * A hosted Supabase project is never a valid target.
 */
function assertDisposable(connectionString: string): void {
  const host = (() => {
    try {
      return new URL(connectionString).hostname;
    } catch {
      return '';
    }
  })();

  if (/supabase\.(co|com)$/i.test(host) || /\bpooler\.supabase\b/i.test(host)) {
    throw new Error(
      `Refusing to run the integration suite against ${host}. ` +
        'TEST_DATABASE_URL must point at a disposable local database — this suite ' +
        'drops the public schema and truncates every table.',
    );
  }
}

/**
 * Apply the whole migration set to an empty public schema.
 *
 * The schema is dropped first because the migrations are a history, not a set
 * of idempotent statements: 0005 creates `public_menu_items` with a numeric
 * price and 0012 rebuilds it with a text price, so replaying 0005 over an
 * already-migrated database fails with "cannot change data type of view column".
 * Production never hits this — `db:migrate` records what it has applied and
 * skips it — but a test database is reused across runs, so it did, and the
 * whole suite refused to start on the second run.
 *
 * Dropping only `public` is deliberate: 0000's shims live in `auth` and are all
 * guarded with `if not exists`, so they survive and are reused.
 */
async function applyMigrations(pool: pg.Pool): Promise<void> {
  await pool.query('drop schema if exists public cascade');
  await pool.query('create schema public');
  await pool.query('grant all on schema public to public');

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await pool.query(sql);
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
}

/** The Guzar Garden venue id, after seeding. */
export async function venueId(db: TestDatabase): Promise<string> {
  const { rows } = await db.pool.query<{ id: string }>(
    `select id from venues where slug = 'guzar-garden'`,
  );
  if (!rows[0]) throw new Error('Venue not seeded.');
  return rows[0].id;
}

export async function tableIdByCode(db: TestDatabase, code: string): Promise<string> {
  const { rows } = await db.pool.query<{ id: string }>(
    `select id from restaurant_tables where code = $1`,
    [code],
  );
  if (!rows[0]) throw new Error(`No table ${code}.`);
  return rows[0].id;
}

/**
 * A Warsaw-local wall time on a given day, as an absolute instant.
 * Tests express intent the way the restaurant does ("next Tuesday at 19:00").
 */
export async function warsawInstant(
  db: TestDatabase,
  dayOffset: number,
  time: string,
): Promise<Date> {
  const { rows } = await db.pool.query<{ at: Date }>(
    `select (((now() at time zone 'Europe/Warsaw')::date + $1::int + $2::time)::timestamp)
              at time zone 'Europe/Warsaw' as at`,
    [dayOffset, time],
  );
  return rows[0]!.at;
}
