import EmbeddedPostgres from 'embedded-postgres';
import { readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = process.argv[2];
const dir = path.join(os.tmpdir(), 'gg-validate-' + Date.now());
const server = new EmbeddedPostgres({
  databaseDir: dir, user: 'postgres', password: 'postgres', port: 54777,
  persistent: false, onLog: () => {}, onError: () => {},
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});
await server.initialise();
await server.start();
const client = server.getPgClient();
await client.connect();

const mdir = path.join(ROOT, 'supabase', 'migrations');
const files = (await readdir(mdir)).filter(f => f.endsWith('.sql')).sort();
let failed = false;
for (const f of files) {
  const sql = await readFile(path.join(mdir, f), 'utf8');
  try { await client.query(sql); console.log('✓', f); }
  catch (e) { console.log('✗', f, '\n   ', e.message, e.position ? `(pos ${e.position}, line ${sql.slice(0,+e.position).split('\n').length})` : ''); failed = true; break; }
}
if (!failed) {
  for (const rel of ['supabase/seed.sql', 'supabase/seed_menu.sql']) {
    const sql = await readFile(path.join(ROOT, rel), 'utf8');
    try { await client.query(sql); console.log('✓', rel); }
    catch (e) { console.log('✗', rel, '\n   ', e.message, e.position ? `(pos ${e.position}, line ${sql.slice(0,+e.position).split('\n').length})` : ''); failed = true; break; }
  }
}
if (!failed) {
  const r = await client.query(`select
    (select count(*) from menu_categories) c,
    (select count(*) from menu_items) i,
    (select count(*) from restaurant_tables) t,
    (select count(*) from reservations) res,
    (select count(*) from table_allocations where status='active') alloc`);
  console.log('counts:', r.rows[0]);
}
await client.end();
await server.stop();
fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
