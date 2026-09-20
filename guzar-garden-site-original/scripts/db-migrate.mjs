#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql in filename order.
 *
 * Each file runs inside its own transaction and is recorded in
 * `schema_migrations`, so re-running is a no-op and a failure never leaves half
 * a migration behind.
 *
 *   node scripts/db-migrate.mjs            apply anything outstanding
 *   node scripts/db-migrate.mjs --reset    drop and recreate the public schema first
 *   node scripts/db-migrate.mjs --status   list what is applied
 *
 * Reads DATABASE_URL from the environment or .env.local.
 */
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnv } from './lib/load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

loadEnv();

const args = new Set(process.argv.slice(2));
const RESET = args.has('--reset');
const STATUS_ONLY = args.has('--status');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    'DATABASE_URL is not set.\n' +
      'Copy .env.example to .env.local and point DATABASE_URL at your Supabase database\n' +
      '(Project Settings ▸ Database ▸ Connection string).',
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: /supabase\.(co|com)/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  await client.connect();

  if (RESET) {
    console.warn('⚠  --reset: dropping and recreating schema "public".');
    await client.query('drop schema if exists public cascade');
    await client.query('create schema public');
    // The compat shim owns the auth schema on plain PostgreSQL; on Supabase this
    // is skipped because auth.users has real data behind it.
    const { rows } = await client.query(
      `select count(*)::int as n from information_schema.tables
        where table_schema = 'auth' and table_name = 'identities'`,
    );
    if (rows[0].n === 0) {
      await client.query('drop schema if exists auth cascade');
    }
  }

  await client.query(`
    create table if not exists schema_migrations (
      version    text primary key,
      checksum   text not null,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const { rows: applied } = await client.query('select version, checksum from schema_migrations');
  const appliedMap = new Map(applied.map((r) => [r.version, r.checksum]));
  // Supabase owns and protects the auth schema. The first migration only
  // supplies auth.users/auth.uid/auth.role shims for plain PostgreSQL tests and
  // must never attempt to replace those hosted objects.
  const { rows: platformRows } = await client.query(
    `select to_regclass('auth.identities') is not null as is_supabase`,
  );
  const isSupabase = platformRows[0]?.is_supabase === true;

  if (STATUS_ONLY) {
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      console.log(`${appliedMap.has(version) ? '✓' : '·'} ${version}`);
    }
    return;
  }

  let count = 0;
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 16);

    if (appliedMap.has(version)) {
      if (appliedMap.get(version) !== checksum) {
        console.warn(
          `⚠  ${version} has changed since it was applied. Migrations are append-only —\n` +
            `   add a new file rather than editing one that is already in a database.`,
        );
      }
      continue;
    }

    if (file === '0000_supabase_compat.sql' && isSupabase) {
      await client.query('insert into schema_migrations (version, checksum) values ($1, $2)', [
        version,
        checksum,
      ]);
      appliedMap.set(version, checksum);
      console.log(`→ ${version} … skipped (Supabase provides auth)`);
      continue;
    }

    process.stdout.write(`→ ${version} … `);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (version, checksum) values ($1, $2)', [
        version,
        checksum,
      ]);
      await client.query('commit');
      console.log('ok');
      count += 1;
    } catch (error) {
      await client.query('rollback');
      console.log('failed');
      console.error(`\n${error.message}\n`);
      if (error.position) {
        const pos = Number(error.position);
        const line = sql.slice(0, pos).split('\n').length;
        console.error(`  near line ${line} of ${file}`);
      }
      process.exitCode = 1;
      return;
    }
  }

  console.log(count === 0 ? 'Already up to date.' : `Applied ${count} migration(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
