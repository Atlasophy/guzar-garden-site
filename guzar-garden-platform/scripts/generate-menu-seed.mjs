#!/usr/bin/env node
/**
 * Migrates the menu out of legacy/menu.html and into SQL.
 *
 * The old page carried 14 categories and 127 dishes in a `SECTIONS` array, with
 * a name, a price string, a portion note and four-language descriptions each.
 * This script reads that array (by evaluating the original source, so nothing is
 * re-typed and nothing can drift), and writes:
 *
 *   supabase/seed_menu.sql            — categories and items, prices as numerics
 *   docs/menu-migration-report.md     — what moved, and what the restaurant needs
 *                                       to confirm (chiefly the landing page's
 *                                       signature prices, which disagree with the
 *                                       menu's own)
 *
 * Re-run it after editing legacy/menu.html; it is deterministic.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MENU_HTML = path.join(ROOT, 'legacy', 'menu.html');
const INDEX_HTML = path.join(ROOT, 'legacy', 'index.html');
const OUT_SQL = path.join(ROOT, 'supabase', 'seed_menu.sql');
const OUT_REPORT = path.join(ROOT, 'docs', 'menu-migration-report.md');

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/** Pull `<literal>` out of `<declaration> = <literal>;` starting at `marker`. */
function extractLiteral(source, marker, openChar, closeChar) {
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Could not find "${marker}" in the source.`);
  const from = source.indexOf(openChar, start);
  let depth = 0;
  let inString = null;
  for (let i = from; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return source.slice(from, i + 1);
    }
  }
  throw new Error(`Unbalanced literal after "${marker}".`);
}

function evaluateLiteral(literal) {
  return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 5000 });
}

/**
 * The category names in the source carry HTML entities ("Sides &amp; sauces")
 * because the old page assigned them through innerHTML. Stored as text they must
 * be the characters they denote, or the ampersand would be escaped twice.
 */
function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&nbsp;/g, ' ');
}

// ---------------------------------------------------------------------------
// Slugs and prices
// ---------------------------------------------------------------------------

const TRANSLITERATE = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
  Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n', Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z',
};

function slugify(value) {
  return String(value)
    .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (c) => TRANSLITERATE[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’‚‛′ʻʼ'`´]/g, '')
    .replace(/[“”„‟„”"]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * "26.99 zł" → { amount: '26.99', currency: 'PLN' }.
 * The amount stays a string all the way into the SQL literal: turning it into a
 * JavaScript number first is exactly the rounding risk the numeric column exists
 * to avoid.
 */
function parsePrice(raw) {
  const match = String(raw).match(/(\d+(?:[.,]\d+)?)/);
  // "Deser dnia" is priced '—' on the printed menu — ask your waiter. Null is the
  // honest representation of that; the public menu renders the dash back.
  if (!match) return { amount: null, currency: 'PLN' };
  const amount = match[1].replace(',', '.');
  const [whole, fraction = ''] = amount.split('.');
  return { amount: `${whole}.${fraction.padEnd(2, '0').slice(0, 2)}`, currency: 'PLN' };
}

function sqlString(value) {
  if (value === null || value === undefined || value === '') return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBool(value) {
  return value ? 'true' : 'false';
}

/** Like sqlString, but an empty value is the empty string, not NULL. */
function sqlTextNotNull(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// Signature-dish resolution — the exact algorithm the old pages used
// ---------------------------------------------------------------------------

function fold(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[‘’ʻʼ'`´]/g, '');
}

function resolveSignature(name, flat) {
  const target = fold(name);
  const exact = flat.find((entry) => fold(entry.item.n) === target);
  if (exact) return { match: exact, how: 'exact name' };
  const firstWord = fold(name.split(' ')[0]);
  const prefixed = flat.find((entry) => fold(entry.item.n).startsWith(firstWord));
  if (prefixed) return { match: prefixed, how: `first word "${name.split(' ')[0]}"` };
  return { match: null, how: 'no match' };
}

// ---------------------------------------------------------------------------

async function main() {
  const menuSource = await readFile(MENU_HTML, 'utf8');
  const indexSource = await readFile(INDEX_HTML, 'utf8');

  const sections = evaluateLiteral(extractLiteral(menuSource, 'const SECTIONS=', '[', ']'));
  const secAlias = evaluateLiteral(extractLiteral(menuSource, 'const SEC_ALIAS=', '{', '}'));
  const itemAlias = evaluateLiteral(extractLiteral(menuSource, 'const ITEM_ALIAS=', '{', '}'));
  const landingSignature = evaluateLiteral(extractLiteral(indexSource, 'var SIGNATURE=', '[', ']'));

  const flat = [];
  for (const section of sections) {
    for (const item of section.items) flat.push({ section, item });
  }

  // ---- slugs, unique across the venue -------------------------------------
  const usedSlugs = new Set();
  const slugFor = (section, item) => {
    const base = slugify(decodeEntities(item.n)) || 'dish';
    let candidate = base;
    let n = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${slugify(section.id)}`;
      if (usedSlugs.has(candidate)) candidate = `${base}-${n}`;
      n += 1;
    }
    usedSlugs.add(candidate);
    return candidate;
  };
  for (const entry of flat) entry.slug = slugFor(entry.section, entry.item);

  // ---- signature dishes ----------------------------------------------------
  const signatureRows = [];
  const discrepancies = [];
  landingSignature.forEach((sig, index) => {
    const { match, how } = resolveSignature(sig.pl, flat);
    if (!match) {
      discrepancies.push({
        landing: sig.pl,
        landingPrice: sig.price,
        menuName: '—',
        menuPrice: '—',
        note: 'No dish on the menu matches this name at all.',
      });
      return;
    }
    signatureRows.push({ slug: match.slug, order: index });
    const landingAmount = parsePrice(sig.price).amount;
    const menuAmount = parsePrice(match.item.p).amount;
    if (landingAmount !== menuAmount || fold(sig.pl) !== fold(match.item.n)) {
      discrepancies.push({
        landing: sig.pl,
        landingPrice: sig.price,
        menuName: match.item.n,
        menuPrice: match.item.p,
        note:
          fold(sig.pl) !== fold(match.item.n)
            ? `Names differ — resolved by ${how}.`
            : 'Prices differ.',
      });
    }
  });

  // Dishes the menu source already flagged with `hl:1` stay flagged, ranked
  // after the five the landing page showed.
  let extraRank = landingSignature.length;
  for (const entry of flat) {
    if (entry.item.hl && !signatureRows.some((s) => s.slug === entry.slug)) {
      signatureRows.push({ slug: entry.slug, order: extraRank });
      extraRank += 1;
    }
  }
  const signatureBySlug = new Map(signatureRows.map((s) => [s.slug, s.order]));

  // ---- missing translations -----------------------------------------------
  const missing = [];
  for (const entry of flat) {
    const gaps = [];
    for (const lang of ['en', 'ru', 'uz']) {
      if (!entry.item.d?.[lang] || !String(entry.item.d[lang]).trim()) gaps.push(lang);
    }
    if (!entry.item.d?.pl || !String(entry.item.d.pl).trim()) gaps.push('pl');
    if (gaps.length) missing.push({ name: entry.item.n, section: entry.section.id, gaps });
  }

  // ---- SQL -----------------------------------------------------------------
  const lines = [];
  lines.push('-- =============================================================================');
  lines.push('-- Menu seed — GENERATED, do not edit by hand.');
  lines.push('--');
  lines.push('-- Produced by `npm run menu:generate-seed` from legacy/menu.html, which is the');
  lines.push('-- original hardcoded SECTIONS array. Every name, price, portion note and');
  lines.push('-- description is carried across verbatim; see docs/menu-migration-report.md');
  lines.push('-- for what needs the restaurant to confirm it.');
  lines.push(`-- ${sections.length} categories, ${flat.length} dishes.`);
  lines.push('-- =============================================================================');
  lines.push('');
  lines.push('do $$');
  lines.push('declare');
  lines.push('  v_venue uuid;');
  lines.push('  v_cat   uuid;');
  lines.push('begin');
  lines.push("  select id into v_venue from venues where slug = 'guzar-garden';");
  lines.push('  if v_venue is null then');
  lines.push("    raise exception 'Seed the venue before the menu (supabase/seed.sql).';");
  lines.push('  end if;');
  lines.push('');

  sections.forEach((section, categoryIndex) => {
    const slug = slugify(section.id);
    lines.push(`  -- ---- ${decodeEntities(section.t.pl)} (${section.items.length} dishes) ----`);
    lines.push('  insert into menu_categories (');
    lines.push('    venue_id, slug, name_pl, name_en, name_ru, name_uz,');
    lines.push('    search_aliases, display_order, is_published');
    lines.push('  ) values (');
    lines.push(
      `    v_venue, ${sqlString(slug)}, ${sqlString(decodeEntities(section.t.pl))}, ` +
        `${sqlString(decodeEntities(section.t.en))}, ${sqlString(decodeEntities(section.t.ru))}, ` +
        `${sqlString(decodeEntities(section.t.uz))},`,
    );
    lines.push(`    ${sqlTextNotNull(secAlias[section.id])}, ${categoryIndex}, true`);
    lines.push('  )');
    lines.push('  on conflict (venue_id, slug) do update set');
    lines.push('    name_pl = excluded.name_pl, name_en = excluded.name_en,');
    lines.push('    name_ru = excluded.name_ru, name_uz = excluded.name_uz,');
    lines.push('    search_aliases = excluded.search_aliases,');
    lines.push('    display_order = excluded.display_order');
    lines.push('  returning id into v_cat;');
    lines.push('');

    section.items.forEach((item, itemIndex) => {
      const entry = flat.find((e) => e.section === section && e.item === item);
      const { amount, currency } = parsePrice(item.p);
      const isSignature = signatureBySlug.has(entry.slug);
      lines.push('  insert into menu_items (');
      lines.push('    venue_id, category_id, slug,');
      lines.push('    name_pl, name_en, name_ru, name_uz,');
      lines.push('    description_pl, description_en, description_ru, description_uz,');
      lines.push('    price, currency, portion_text,');
      lines.push('    is_signature, signature_order, is_available, is_published,');
      lines.push('    display_order, dietary_tags, search_aliases');
      lines.push('  ) values (');
      lines.push(`    v_venue, v_cat, ${sqlString(entry.slug)},`);
      // The dish name is a single string on the old menu (Latin script for every
      // language); it is stored in all four columns so a later translation has
      // somewhere to go without changing what is shown today.
      const name = decodeEntities(item.n);
      lines.push(`    ${sqlString(name)}, ${sqlString(name)}, ${sqlString(name)}, ${sqlString(name)},`);
      lines.push(
        `    ${sqlString(item.d?.pl)}, ${sqlString(item.d?.en)}, ` +
          `${sqlString(item.d?.ru)}, ${sqlString(item.d?.uz)},`,
      );
      lines.push(`    ${amount ?? 'null'}, '${currency}', ${sqlString(item.u ?? null)},`);
      lines.push(
        `    ${sqlBool(isSignature)}, ${signatureBySlug.get(entry.slug) ?? 0}, true, true,`,
      );
      lines.push(`    ${itemIndex}, '{halal}', ${sqlTextNotNull(itemAlias[item.n])}`);
      lines.push('  )');
      lines.push('  on conflict (venue_id, slug) do update set');
      lines.push('    category_id = excluded.category_id,');
      lines.push('    name_pl = excluded.name_pl, name_en = excluded.name_en,');
      lines.push('    name_ru = excluded.name_ru, name_uz = excluded.name_uz,');
      lines.push('    description_pl = excluded.description_pl,');
      lines.push('    description_en = excluded.description_en,');
      lines.push('    description_ru = excluded.description_ru,');
      lines.push('    description_uz = excluded.description_uz,');
      lines.push('    price = excluded.price, portion_text = excluded.portion_text,');
      lines.push('    is_signature = excluded.is_signature,');
      lines.push('    signature_order = excluded.signature_order,');
      lines.push('    display_order = excluded.display_order,');
      lines.push('    search_aliases = excluded.search_aliases;');
      lines.push('');
    });
  });

  lines.push('end $$;');
  lines.push('');

  await writeFile(OUT_SQL, lines.join('\n'), 'utf8');

  // ---- report --------------------------------------------------------------
  await mkdir(path.dirname(OUT_REPORT), { recursive: true });
  const report = [];
  report.push('# Menu migration report');
  report.push('');
  report.push('_Generated by `npm run menu:generate-seed`. Do not edit by hand._');
  report.push('');
  report.push(
    `Migrated **${sections.length} categories** and **${flat.length} dishes** from the hardcoded ` +
      '`SECTIONS` array in `legacy/menu.html` into `menu_categories` / `menu_items`.',
  );
  report.push('');
  report.push('## Prices needing the restaurant to confirm');
  report.push('');
  if (discrepancies.length === 0) {
    report.push('None — the landing page and the menu agreed on every signature dish.');
  } else {
    report.push(
      'The old landing page kept its five signature dishes in a **separate array** with its own ' +
        'prices, which had drifted from the menu. The database now has one source of truth: the ' +
        'menu item. These are the differences that were resolved in the menu’s favour and ' +
        'that the restaurant should check.',
    );
    report.push('');
    report.push('| Landing page said | Landing price | Matched menu dish | Menu price | Note |');
    report.push('| --- | --- | --- | --- | --- |');
    for (const d of discrepancies) {
      report.push(
        `| ${d.landing} | ${d.landingPrice} | ${d.menuName} | ${d.menuPrice} | ${d.note} |`,
      );
    }
  }
  report.push('');
  report.push('## Signature dishes on the homepage');
  report.push('');
  report.push(
    'These are now `menu_items.is_signature = true`, ordered by `signature_order`. The homepage ' +
      'renders the first five published ones; a manager can change the selection in ' +
      '`/staff/menu` without touching code.',
  );
  report.push('');
  report.push('| # | Dish slug |');
  report.push('| --- | --- |');
  for (const s of [...signatureRows].sort((a, b) => a.order - b.order)) {
    report.push(`| ${s.order + 1} | \`${s.slug}\` |`);
  }
  report.push('');
  report.push('## Incomplete translations');
  report.push('');
  if (missing.length === 0) {
    report.push('Every dish has a description in all four languages.');
  } else {
    report.push(
      `${missing.length} dish description(s) are missing at least one language. They fall back to ` +
        'Polish on the public menu and are flagged as incomplete in the staff editor — nothing ' +
        'pretends the translation exists.',
    );
    report.push('');
    report.push('| Dish | Category | Missing |');
    report.push('| --- | --- | --- |');
    for (const m of missing) {
      report.push(`| ${m.name} | \`${m.section}\` | ${m.gaps.join(', ')} |`);
    }
  }
  report.push('');
  report.push('## Known transformations');
  report.push('');
  report.push(
    '- **Dish names** are a single Latin-script string on the old menu, identical in every ' +
      'language. All four name columns were seeded with it so a future translation has a home; ' +
      'nothing on the page changes today.',
  );
  report.push(
    '- **HTML entities in category names** (`Sides &amp; sauces`, `Tea &amp; coffee`) were ' +
      'decoded to the characters they denote. The old page escaped them a second time on the ' +
      'category cards, so `&` rendered as `&amp;amp;`; it now renders as `&`.',
  );
  report.push(
    '- **Prices** moved from formatted strings (`"26.99 zł"`) to `numeric(10,2)` plus a currency ' +
      'column. Formatting happens at render time in `lib/menu/price.ts`, so the stored value is ' +
      'exact.',
  );
  report.push(
    '- **Portion notes** (`450 g`, `6 zł / szt`, `na 3 osoby / for 3`) moved to `portion_text` ' +
      'unchanged.',
  );
  report.push(
    '- **Search aliases** (`SEC_ALIAS`, `ITEM_ALIAS`) moved to `search_aliases`, so typing ' +
      '"шашлык" or "skewer" still finds the grill.',
  );

  await writeFile(OUT_REPORT, `${report.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${path.relative(ROOT, OUT_SQL)}`);
  console.log(`Wrote ${path.relative(ROOT, OUT_REPORT)}`);
  console.log(
    `${sections.length} categories, ${flat.length} dishes, ` +
      `${signatureRows.length} signature, ${discrepancies.length} price discrepancies.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
