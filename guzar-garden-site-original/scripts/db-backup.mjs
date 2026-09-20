#!/usr/bin/env node
/**
 * Export the application's data as SQL INSERT statements.
 *
 * Why this exists rather than `pg_dump`: Supabase's Free plan offers no
 * downloadable backups and no Point-in-Time Recovery, and the embedded
 * PostgreSQL used by the test suite ships `initdb`, `pg_ctl` and `postgres` but
 * not `pg_dump`. Without this script the reservation data on the Free plan has
 * no recovery path at all.
 *
 * Schema is deliberately not exported. The schema is `supabase/migrations/*.sql`
 * and is proven to rebuild the live one; duplicating it here would create a
 * second source of truth that could drift.
 *
 *   node scripts/db-backup.mjs                  → ../guzar-backup-<timestamp>.sql
 *   node scripts/db-backup.mjs --out path.sql
 *
 * The output contains guest names, emails and phone numbers. It is personal data
 * under GDPR: store it encrypted, keep it off shared drives, and delete it on the
 * retention schedule the privacy policy promises.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import { loadEnv } from './lib/load-env.mjs';

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

/**
 * Order matters: parents before children, so replaying the file against a
 * freshly migrated database satisfies the foreign keys as it goes.
 */
const TABLES = [
  'venues',
  'dining_areas',
  'restaurant_tables',
  'business_hours',
  'reservation_settings',
  'service_exceptions',
  'menu_categories',
  'menu_items',
  'staff_profiles',
  'reservations',
  'table_allocations',
  'notification_outbox',
  'audit_log',
];

const outFlag = process.argv.indexOf('--out');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outPath =
  outFlag !== -1 && process.argv[outFlag + 1]
    ? process.argv[outFlag + 1]
    : path.join(process.cwd(), '..', `guzar-backup-${stamp}.sql`);

const client = new pg.Client({
  connectionString,
  ssl: /supabase\.(co|com)/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
});

/**
 * Render one value as a SQL literal.
 *
 * Arrays and objects both arrive from node-postgres as JavaScript objects, but
 * they are not interchangeable in the target: `allergens`, `dietary_tags` and
 * `search_aliases` are `text[]`, and casting those to jsonb fails with
 * "column is of type text[] but expression is of type jsonb". An untyped array
 * literal — '{"a","b"}' — assigns correctly to any array column, so the script
 * does not need to know the element type.
 *
 * This was caught by actually restoring a backup rather than by reading it.
 */
function literal(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return `'${value.toISOString()}'`;

  if (Array.isArray(value)) {
    if (value.length === 0) return `'{}'`;
    const elements = value
      .map((element) => {
        if (element === null || element === undefined) return 'NULL';
        // Inside an array literal, backslashes and double quotes are escaped
        // with a backslash; the whole literal is then single-quoted for SQL.
        const escaped = String(element).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${escaped}"`;
      })
      .join(',');
    return `'{${elements.replace(/'/g, "''")}}'`;
  }

  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  await client.connect();

  const lines = [
    '-- Guzar Garden data backup',
    `-- Taken ${new Date().toISOString()}`,
    '--',
    '-- Restore into a database that has already had supabase/migrations applied:',
    '--   npm run db:migrate   (against the empty target)',
    '--   psql "<target>" -f this-file.sql',
    '--',
    '-- CONTAINS PERSONAL DATA (guest names, emails, phone numbers).',
    '',
    'begin;',
    '',
  ];

  let grandTotal = 0;

  for (const table of TABLES) {
    let rows;
    try {
      ({ rows } = await client.query(`select * from ${table}`));
    } catch (error) {
      lines.push(`-- ${table}: SKIPPED (${error.message})`, '');
      console.warn(`  ${table}: skipped — ${error.message}`);
      continue;
    }

    lines.push(`-- ${table}: ${rows.length} row(s)`);
    if (rows.length === 0) {
      lines.push('');
      console.log(`  ${table}: 0`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    for (const row of rows) {
      const values = columns.map((column) => literal(row[column])).join(', ');
      // Idempotent on primary key, so replaying a backup twice is not an error.
      lines.push(
        `insert into ${table} (${columns.join(', ')}) values (${values}) on conflict do nothing;`,
      );
    }
    lines.push('');
    grandTotal += rows.length;
    console.log(`  ${table}: ${rows.length}`);
  }

  lines.push('commit;', '');
  writeFileSync(outPath, lines.join('\n'), 'utf8');

  console.log(`\nWrote ${grandTotal} row(s) to ${outPath}`);
  console.log('This file contains personal data. Store it encrypted.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
