/* eslint-disable no-console */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';

/**
 * A real PostgreSQL for the integration suite.
 *
 * Order of preference:
 *   1. `TEST_DATABASE_URL` / `DATABASE_URL` — a database you already have.
 *   2. An embedded PostgreSQL started on a free port into a temporary data
 *      directory and thrown away afterwards.
 *
 * It has to be real PostgreSQL rather than a stub: the guarantees under test —
 * the GiST exclusion constraint, half-open range semantics, `for update skip
 * locked`, timezone conversion across a DST boundary — are the database's
 * behaviour, and a fake would only ever confirm my own assumptions about it.
 */

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
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
  const external = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (external) {
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

async function applyMigrations(pool: pg.Pool): Promise<void> {
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
