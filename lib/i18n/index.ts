import { pl, type Dictionary } from './dictionaries/pl';
import { en } from './dictionaries/en';
import { ru } from './dictionaries/ru';
import { uz } from './dictionaries/uz';
import { DEFAULT_LOCALE, type Locale } from './locales';

export type { Dictionary };
export * from './locales';
export * from './fallback';

export const DICTIONARIES: Record<Locale, Dictionary> = { pl, en, ru, uz };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Fill `{name}` placeholders. Deliberately tiny: the site has a handful of
 * interpolated strings ("we are holding this table for {time}") and pulling in
 * a message-format library for them would cost more than it explains.
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Polish (and Russian) count in three forms: 1 osoba, 2–4 osoby, 5+ osób.
 * English and Uzbek do not, and pass through the same function unharmed.
 */
export function pluralPeople(count: number, dictionary: Dictionary): string {
  const one = dictionary.reserve.partyPerson;
  const few = dictionary.reserve.partyPeople;
  const many = dictionary.reserve.partyPeopleMany;

  if (count === 1) return one;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}
