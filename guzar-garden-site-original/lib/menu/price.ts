import type { Locale } from '@/lib/i18n/locales';

/**
 * Money.
 *
 * A price is a `numeric(10,2)` in the database and a decimal *string*
 * everywhere in TypeScript. It is never parsed into a `number` on the way
 * through: 12.99 is not representable in binary floating point, and a menu that
 * quietly renders 12.99 as 12.989999999999998 — or, worse, sums a bill that way
 * — is the exact failure the numeric column was chosen to prevent. Formatting
 * splits the string on the decimal point instead.
 */

export const DEFAULT_CURRENCY = 'PLN';

/** Currency suffixes, in the form the printed menu uses. */
const CURRENCY_SUFFIX: Record<string, string> = {
  PLN: 'zł',
  EUR: '€',
  USD: '$',
};

const DECIMAL_SEPARATOR: Record<Locale, string> = {
  pl: ',',
  en: '.',
  ru: ',',
  uz: ',',
};

/**
 * "26.99" → "26,99 zł" (pl) / "26.99 zł" (en).
 *
 * A whole number loses its ",00": the printed menu says "8 zł", not "8,00 zł",
 * and matching it is the point.
 *
 * `null` means the dish is priced "ask your waiter" — the old menu had one —
 * and renders as an em dash rather than as a zero.
 */
export function formatPrice(
  amount: string | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  locale: Locale = 'pl',
): string {
  if (amount === null || amount === undefined || amount === '') return '—';

  const normalized = String(amount).trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return '—';

  const [whole = '0', fractionRaw = ''] = normalized.split('.');
  const fraction = fractionRaw.padEnd(2, '0').slice(0, 2);
  const suffix = CURRENCY_SUFFIX[currency] ?? currency;
  const separator = DECIMAL_SEPARATOR[locale] ?? ',';

  const body = fraction === '00' ? whole : `${whole}${separator}${fraction}`;
  return `${body} ${suffix}`;
}

/**
 * A price as it arrives from whichever driver fetched it.
 *
 * node-postgres returns `numeric` as a string, PostgREST serialises it as a
 * JSON number and supabase-js parses that into a float. The database is the
 * right place to settle this — migration 0012 casts the public view's `price`
 * to text — but every helper below accepts both, so one un-cast column can
 * never again throw inside a page and blank the whole menu.
 */
export type PriceInput = string | number | null | undefined;

/** Normalise any driver's idea of a price into the decimal string we promise. */
function toDecimalString(value: string | number): string {
  return typeof value === 'number' ? value.toFixed(2) : value.trim().replace(',', '.');
}

/**
 * Compare two decimal strings without going through a float.
 * Returns a negative number, zero or a positive number, like a sort comparator.
 */
export function comparePrice(a: PriceInput, b: PriceInput): number {
  // "Ask your waiter" sorts last: it is not cheap, it is unknown.
  const left = a === null || a === undefined || a === '' ? null : toDecimalString(a);
  const right = b === null || b === undefined || b === '' ? null : toDecimalString(b);

  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  const [aw = '0', af = ''] = left.split('.');
  const [bw = '0', bf = ''] = right.split('.');

  // A malformed price sorts with the unknowns instead of throwing. Blanking one
  // "from" label is a bug; throwing here blanks the entire menu.
  if (!/^\d+$/.test(aw) || !/^\d+$/.test(bw)) {
    if (!/^\d+$/.test(aw) && !/^\d+$/.test(bw)) return 0;
    return /^\d+$/.test(aw) ? -1 : 1;
  }

  const wholeDiff = BigInt(aw) - BigInt(bw);
  if (wholeDiff !== 0n) return wholeDiff > 0n ? 1 : -1;

  const aFraction = Number(af.padEnd(2, '0').slice(0, 2));
  const bFraction = Number(bf.padEnd(2, '0').slice(0, 2));
  return aFraction - bFraction;
}

/** The lowest price in a category — what "from 8 zł" on a category card means. */
export function minPrice(prices: PriceInput[]): string | null {
  let lowest: string | null = null;
  for (const price of prices) {
    if (price === null || price === undefined || price === '') continue;
    const candidate = toDecimalString(price);
    if (lowest === null || comparePrice(candidate, lowest) < 0) lowest = candidate;
  }
  return lowest;
}

/** "26.99" → 2699. For arithmetic that must stay exact (totals, reports). */
export function toMinorUnits(amount: string | number): number {
  const [whole = '0', fraction = ''] = toDecimalString(amount).split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}

/** 2699 → "26.99". The inverse of `toMinorUnits`. */
export function fromMinorUnits(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(minor));
  return `${sign}${Math.floor(absolute / 100)}.${(absolute % 100).toString().padStart(2, '0')}`;
}
