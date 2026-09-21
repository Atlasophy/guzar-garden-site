import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getTestDatabase, type TestDatabase } from '../helpers/database';

/**
 * The boundary that actually broke.
 *
 * `lib/menu/price.ts` promises that a price is a decimal *string* everywhere in
 * TypeScript, and never a float, because that is the whole reason the column is
 * `numeric(10,2)`. The unit suite fed it strings and agreed. The integration
 * suite used node-postgres, which returns `numeric` as a string, and agreed.
 *
 * The running site does neither. It reads through PostgREST, which serialises a
 * row to JSON — and `numeric` becomes a JSON *number* there, which `supabase-js`
 * parses into a float. `minPrice()` called `.replace()` on it, threw, and the
 * whole menu rendered as "temporarily unavailable" in every language.
 *
 * So the assertion that matters is about the *wire format*, not about
 * node-postgres's return type. `row_to_json` is the same transformation
 * PostgREST performs: a numeric column emits `29.00` (a JSON number), a text
 * column emits `"29.00"` (a JSON string). Asserting on that reproduces the
 * failure mode without needing a live PostgREST, and fails if migration 0012's
 * cast is ever dropped or a later migration rebuilds the view without it.
 */

let db: TestDatabase | undefined;
const databaseDescribe =
  process.platform === 'win32' && !process.env.TEST_DATABASE_URL ? describe.skip : describe;

databaseDescribe('public menu wire format', () => {
  beforeAll(async () => {
    db = await getTestDatabase();
    await db.reset();
    await db.seed();
  });

  afterAll(async () => {
    await db?.close();
  });

  it('exposes price as text, not numeric, on the public view', async () => {
    const { rows } = await db!.pool.query<{ data_type: string }>(
      `select data_type from information_schema.columns
        where table_schema = 'public'
          and table_name = 'public_menu_items'
          and column_name = 'price'`,
    );
    expect(rows[0]?.data_type).toBe('text');
  });

  it('serialises price as a JSON string the way PostgREST does', async () => {
    // row_to_json is the transformation PostgREST applies. If price were still
    // numeric this value would be a JS number after JSON.parse, which is
    // precisely what crashed the menu.
    const { rows } = await db!.pool.query<{ doc: Record<string, unknown> }>(
      `select row_to_json(t) as doc
         from (select slug, price from public_menu_items where price is not null limit 1) t`,
    );

    const price = rows[0]?.doc.price;
    expect(price).toBeDefined();
    expect(typeof price).toBe('string');
    // Two decimal places are preserved, so "29" never reaches the client as "29".
    expect(price as string).toMatch(/^\d+\.\d{2}$/);
  });

  it('keeps every published price parseable as an exact decimal string', async () => {
    const { rows } = await db!.pool.query<{ doc: { slug: string; price: string | null } }>(
      `select row_to_json(t) as doc from (select slug, price from public_menu_items) t`,
    );

    expect(rows.length).toBeGreaterThan(0);
    const malformed = rows
      .map((row) => row.doc)
      .filter((doc) => doc.price !== null && !/^\d+\.\d{2}$/.test(doc.price as string));

    expect(malformed).toEqual([]);
  });

  it('still hides unpublished dishes from the public view', async () => {
    // The view was dropped and recreated by 0012. Its WHERE clause is the only
    // thing stopping a draft price reaching the public menu, so it is worth
    // asserting alongside the column type it was rebuilt for.
    const { rows: before } = await db!.pool.query<{ n: string }>(
      'select count(*)::text n from public_menu_items',
    );

    await db!.pool.query(
      `update menu_items set is_published = false
        where id = (select id from menu_items where is_published order by id limit 1)`,
    );

    const { rows: after } = await db!.pool.query<{ n: string }>(
      'select count(*)::text n from public_menu_items',
    );

    expect(Number(after[0]!.n)).toBe(Number(before[0]!.n) - 1);

    await db!.pool.query('update menu_items set is_published = true where is_published = false');
  });
});
