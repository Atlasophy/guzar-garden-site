/**
 * Menu search.
 *
 * Carried over from the original page, including the reason it works the way it
 * does: dish names are printed in Latin script in every language, so a Russian
 * guest typing "самса" or an English one typing "skewer" would otherwise find
 * nothing. Each dish therefore carries a bag of aliases — those are the
 * `SEC_ALIAS` and `ITEM_ALIAS` tables from menu.html, now in `search_aliases`
 * columns — and the haystack folds names, descriptions, category and aliases
 * together.
 *
 * Folding strips diacritics, maps `ł` to `l` (which NFD does not decompose) and
 * removes the several apostrophes Uzbek transliteration uses, so "Szaszłyk"
 * matches "szaszlyk" and "O'zbek" matches "ozbek".
 */

export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[‘’ʻʼ'`´]/g, '');
}

export interface SearchableItem {
  id: string;
  haystack: string;
}

/** Build the folded haystack for one dish. */
export function buildHaystack(parts: (string | null | undefined)[]): string {
  return fold(parts.filter(Boolean).join(' '));
}

/**
 * Every term must appear somewhere in the haystack — "lamb skewer" finds the
 * dish that is both, not everything that is either.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return false;
  return terms.every((term) => haystack.includes(term));
}

export function searchItems<T extends SearchableItem>(items: T[], query: string): T[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return items.filter((item) => terms.every((term) => item.haystack.includes(term)));
}

/** The old page only searched once the guest had typed two characters. */
export const MIN_QUERY_LENGTH = 2;
