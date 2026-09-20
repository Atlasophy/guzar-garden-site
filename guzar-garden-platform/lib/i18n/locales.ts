/**
 * The four languages the restaurant serves.
 *
 * Polish is the source language and the fallback: it is the one the kitchen
 * writes, and the only one every menu row is guaranteed to have.
 */
export const LOCALES = ['pl', 'en', 'ru', 'uz'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pl';

/** The key the old static site used. Kept, so a returning guest keeps their language. */
export const LOCALE_STORAGE_KEY = 'gg-lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function coerceLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** `hl=` parameter for the Google Maps embed. */
export const MAP_LANGUAGE: Record<Locale, string> = {
  pl: 'pl',
  en: 'en',
  ru: 'ru',
  uz: 'uz',
};

export const LOCALE_LABEL: Record<Locale, string> = {
  pl: 'PL',
  en: 'EN',
  ru: 'RU',
  uz: 'UZ',
};

/** `<html lang>` and the BCP-47 tag used for number and date formatting. */
export const HTML_LANG: Record<Locale, string> = {
  pl: 'pl',
  en: 'en',
  ru: 'ru',
  uz: 'uz',
};
