import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase/admin';
import type { PublicMenuItemRow, MenuCategoryRow, MenuItemRow } from '@/lib/database/types';
import { pickLocaleColumns, type LocalizedRecord } from '@/lib/i18n/fallback';
import { buildHaystack } from './search';
import { publicUrlFor } from '@/lib/storage/menu-images';
import { minPrice } from './price';

/**
 * The public menu, read from PostgreSQL.
 *
 * The whole menu — 14 categories, ~127 dishes — is one query against the
 * `public_menu_items` view, not a query per card. It is cached under a tag and
 * the tag is invalidated whenever staff change anything, so a published price
 * change appears on the next request rather than at the end of a TTL.
 *
 * Drafts, hidden categories and archived dishes are excluded by the view *and*
 * by RLS, so a mistake in this file cannot leak an unpublished price. A
 * sold-out dish is still returned, with `isAvailable: false`, because removing
 * it would look as though the kitchen never made it.
 */

export const MENU_CACHE_TAG = 'menu';

export interface MenuItemView {
  id: string;
  slug: string;
  categorySlug: string;
  categoryName: LocalizedRecord;
  name: LocalizedRecord;
  description: LocalizedRecord;
  /** Decimal string. Null = "ask your waiter". */
  price: string | null;
  currency: string;
  portionText: string | null;
  image: {
    /** Storage object path, for staff tooling. */
    path: string;
    /** Absolute public URL — what next/image loads. */
    url: string;
    width: number;
    height: number;
    alt: LocalizedRecord;
  } | null;
  isSignature: boolean;
  signatureOrder: number;
  isAvailable: boolean;
  displayOrder: number;
  allergens: string[];
  dietaryTags: string[];
  /** Pre-folded search text, so the client filters without re-normalising. */
  haystack: string;
}

export interface MenuCategoryView {
  slug: string;
  name: LocalizedRecord;
  description: LocalizedRecord;
  displayOrder: number;
  items: MenuItemView[];
  /** Lowest price in the category — the "from 8 zł" on a category card. */
  fromPrice: string | null;
}

export interface PublicMenu {
  categories: MenuCategoryView[];
  totalItems: number;
  /** Homepage signature dishes, already ordered and limited. */
  signatures: MenuItemView[];
}

function toItemView(row: PublicMenuItemRow): MenuItemView {
  const name = pickLocaleColumns(row, 'name');
  const description = pickLocaleColumns(row, 'description');

  return {
    id: row.id,
    slug: row.slug,
    categorySlug: row.category_slug,
    categoryName: {
      pl: row.category_name_pl,
      en: row.category_name_en,
      ru: row.category_name_ru,
      uz: row.category_name_uz,
    },
    name,
    description,
    price: row.price,
    currency: row.currency,
    portionText: row.portion_text,
    image:
      row.image_path && row.image_width && row.image_height
        ? {
            path: row.image_path,
            url: publicUrlFor(row.image_path),
            width: row.image_width,
            height: row.image_height,
            alt: pickLocaleColumns(row, 'image_alt'),
          }
        : null,
    isSignature: row.is_signature,
    signatureOrder: row.signature_order,
    isAvailable: row.is_available,
    displayOrder: row.display_order,
    allergens: row.allergens ?? [],
    dietaryTags: row.dietary_tags ?? [],
    haystack: buildHaystack([
      row.name_pl,
      row.name_en,
      row.name_ru,
      row.name_uz,
      row.description_pl,
      row.description_en,
      row.description_ru,
      row.description_uz,
      row.category_name_pl,
      row.category_name_en,
      row.category_name_ru,
      row.category_name_uz,
      row.search_aliases,
      row.category_search_aliases,
    ]),
  };
}

/** How many signature dishes the homepage grid shows. */
export const SIGNATURE_COUNT = 5;

async function fetchPublicMenu(venueSlug: string): Promise<PublicMenu> {
  const supabase = getAdminClient();

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id')
    .eq('slug', venueSlug)
    .eq('is_active', true)
    .maybeSingle<{ id: string }>();

  if (venueError) throw venueError;
  if (!venue) return { categories: [], totalItems: 0, signatures: [] };

  const { data, error } = await supabase
    .from('public_menu_items')
    .select('*')
    .eq('venue_id', venue.id)
    .order('category_display_order')
    .order('display_order')
    .returns<PublicMenuItemRow[]>();

  if (error) throw error;

  const rows = data ?? [];
  const byCategory = new Map<string, MenuCategoryView>();

  for (const row of rows) {
    let category = byCategory.get(row.category_slug);
    if (!category) {
      category = {
        slug: row.category_slug,
        name: {
          pl: row.category_name_pl,
          en: row.category_name_en,
          ru: row.category_name_ru,
          uz: row.category_name_uz,
        },
        description: {},
        displayOrder: row.category_display_order,
        items: [],
        fromPrice: null,
      };
      byCategory.set(row.category_slug, category);
    }
    category.items.push(toItemView(row));
  }

  const categories = [...byCategory.values()].sort((a, b) => a.displayOrder - b.displayOrder);
  for (const category of categories) {
    category.fromPrice = minPrice(category.items.map((item) => item.price));
  }

  const signatures = rows
    .filter((row) => row.is_signature)
    .sort((a, b) => a.signature_order - b.signature_order)
    .slice(0, SIGNATURE_COUNT)
    .map(toItemView);

  return { categories, totalItems: rows.length, signatures };
}

/**
 * Cached public menu. `revalidateMenu()` is called by every staff mutation, so
 * the cache is correct rather than merely fresh; the one-hour window is only a
 * backstop for a change made outside the app (a hand-run SQL statement).
 */
export const getPublicMenu = unstable_cache(
  async (venueSlug: string) => fetchPublicMenu(venueSlug),
  ['public-menu'],
  { tags: [MENU_CACHE_TAG], revalidate: 3600 },
);

/**
 * Called by every staff mutation that changes what the public menu shows.
 *
 * Next 16's `revalidateTag` takes a cache-life profile as its second argument;
 * `{ expire: 0 }` purges immediately, which is what a published price change
 * needs — a guest reading the menu a second after the change should see the new
 * price, not the old one until a TTL runs out.
 */
export function revalidateMenu(): void {
  revalidateTag(MENU_CACHE_TAG, { expire: 0 });
}

/** Just the homepage's signature dishes. Shares the same cache entry. */
export async function getSignatureDishes(venueSlug: string): Promise<MenuItemView[]> {
  const menu = await getPublicMenu(venueSlug);
  return menu.signatures;
}

// ---------------------------------------------------------------------------
// Staff reads — uncached and unfiltered, including drafts and archived rows
// ---------------------------------------------------------------------------

export interface StaffMenuFilters {
  categoryId?: string;
  published?: boolean;
  available?: boolean;
  archived?: boolean;
  query?: string;
}

export async function listStaffCategories(venueId: string): Promise<MenuCategoryRow[]> {
  const { data, error } = await getAdminClient()
    .from('menu_categories')
    .select('*')
    .eq('venue_id', venueId)
    .order('display_order')
    .returns<MenuCategoryRow[]>();
  if (error) throw error;
  return data ?? [];
}

export async function listStaffItems(
  venueId: string,
  filters: StaffMenuFilters = {},
): Promise<MenuItemRow[]> {
  let query = getAdminClient().from('menu_items').select('*').eq('venue_id', venueId);

  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.published !== undefined) query = query.eq('is_published', filters.published);
  if (filters.available !== undefined) query = query.eq('is_available', filters.available);
  if (filters.archived === true) query = query.not('archived_at', 'is', null);
  if (filters.archived === false) query = query.is('archived_at', null);

  const { data, error } = await query
    .order('display_order')
    .returns<MenuItemRow[]>();
  if (error) throw error;

  const rows = data ?? [];
  if (!filters.query) return rows;

  // Filtered in memory: the staff list is ~127 rows, and doing it here means the
  // same folding rules apply as on the public menu rather than a second,
  // subtly different, SQL implementation.
  const haystackFor = (row: MenuItemRow) =>
    buildHaystack([
      row.name_pl,
      row.name_en,
      row.name_ru,
      row.name_uz,
      row.description_pl,
      row.slug,
      row.search_aliases,
    ]);
  const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    const hay = haystackFor(row);
    return terms.every((term) => hay.includes(term));
  });
}

export async function getStaffItem(itemId: string): Promise<MenuItemRow | null> {
  const { data, error } = await getAdminClient()
    .from('menu_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle<MenuItemRow>();
  if (error) throw error;
  return data;
}
