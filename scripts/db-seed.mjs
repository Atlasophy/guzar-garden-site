#!/usr/bin/env node
/**
 * Applies the development seed: venue, floor plan, policy, then the menu that
 * `npm run menu:generate-seed` produced from the original menu.html.
 *
 * Order matters — the menu seed looks the venue up by slug.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnv } from './lib/load-env.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. See .env.example.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: /supabase\.(co|com)/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
});

const FILES = ['supabase/seed.sql', 'supabase/seed_menu.sql'];

async function main() {
  await client.connect();
  for (const relative of FILES) {
    const sql = await readFile(path.join(ROOT, relative), 'utf8');
    process.stdout.write(`→ ${relative} … `);
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('commit');
      console.log('ok');
    } catch (error) {
      await client.query('rollback');
      console.log('failed');
      throw error;
    }
  }

  const { rows } = await client.query(`
    select
      (select count(*) from menu_categories)   as categories,
      (select count(*) from menu_items)        as items,
      (select count(*) from restaurant_tables) as tables,
      (select count(*) from reservations)      as reservations
  `);
  const r = rows[0];
  console.log(
    `Seeded: ${r.categories} categories, ${r.items} dishes, ` +
      `${r.tables} tables, ${r.reservations} sample reservations.`,
  );
  console.log('Next: npm run staff:create-admin -- --email you@example.com');
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
