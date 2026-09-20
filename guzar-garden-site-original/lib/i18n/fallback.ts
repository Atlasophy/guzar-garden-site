import { DEFAULT_LOCALE, LOCALES, type Locale } from './locales';

/** A value stored once per language, the way menu rows carry their names. */
export type LocalizedRecord = Partial<Record<Locale, string | null | undefined>>;

export interface LocalizedResult {
  /** The text to render. Empty only when no language has anything at all. */
  value: string;
  /** Which language the text actually came from. */
  source: Locale | null;
  /** True when the requested language had nothing and something else was used. */
  isFallback: boolean;
}

/**
 * Pick the best available translation.
 *
 * Order: the language asked for, then Polish (the kitchen writes in Polish),
 * then any other language that has something. A dish with an English
 * description and no Polish one — the old menu had a few — still reads rather
 * than showing a blank line.
 *
 * `isFallback` is what the staff editor uses to mark a translation as missing.
 * It is deliberately visible: pretending a gap is filled is how gaps survive.
 */
export function resolveLocalized(
  record: LocalizedRecord,
  locale: Locale = DEFAULT_LOCALE,
): LocalizedResult {
  const requested = record[locale];
  if (typeof requested === 'string' && requested.trim() !== '') {
    return { value: requested, source: locale, isFallback: false };
  }

  const fallbackOrder: Locale[] = [
    DEFAULT_LOCALE,
    ...LOCALES.filter((l) => l !== DEFAULT_LOCALE && l !== locale),
  ];

  for (const candidate of fallbackOrder) {
    const value = record[candidate];
    if (typeof value === 'string' && value.trim() !== '') {
      return { value, source: candidate, isFallback: true };
    }
  }

  return { value: '', source: null, isFallback: true };
}

/** Just the text, when the caller does not care where it came from. */
export function localized(record: LocalizedRecord, locale: Locale = DEFAULT_LOCALE): string {
  return resolveLocalized(record, locale).value;
}

/**
 * Build a LocalizedRecord from a database row's `<field>_<locale>` columns.
 *
 *   pickLocaleColumns(row, 'name') → { pl: row.name_pl, en: row.name_en, … }
 */
export function pickLocaleColumns(row: object, field: string): LocalizedRecord {
  const record: LocalizedRecord = {};
  for (const locale of LOCALES) {
    const value = (row as Record<string, unknown>)[`${field}_${locale}`];
    record[locale] = typeof value === 'string' ? value : null;
  }
  return record;
}

/** Which of the four languages are missing a value. Used by the staff editor. */
export function missingLocales(record: LocalizedRecord): Locale[] {
  return LOCALES.filter((locale) => {
    const value = record[locale];
    return typeof value !== 'string' || value.trim() === '';
  });
}
