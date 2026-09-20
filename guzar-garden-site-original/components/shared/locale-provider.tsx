'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  coerceLocale,
  getDictionary,
  type Dictionary,
  type Locale,
} from '@/lib/i18n';

/**
 * Language, the way the original site did it.
 *
 * One document per language was never the design here: the static pages carried
 * all four translations in `data-pl` / `data-en` / `data-ru` / `data-uz`
 * attributes and swapped them in place, with the choice kept in
 * `localStorage['gg-lang']`. That is preserved exactly — same key, same
 * behaviour on a return visit, same single URL per page — so an existing
 * bookmark and an existing preference both survive the migration.
 *
 * The cost is that the first paint is Polish and the switch to a stored
 * language happens on hydration. That is what the old site did too, and it
 * keeps every page a single cacheable document with one canonical URL for
 * search engines, rather than four near-duplicates.
 */

interface LocaleContextValue {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  /** False until the stored preference has been read, for hydration-safe UI. */
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  preferInitialLocale = false,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  preferInitialLocale?: boolean;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      // Private mode, or storage disabled. Polish it is.
    }
    if (preferInitialLocale) {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, initialLocale);
      } catch {
        // The server-rendered language still remains active for this page view.
      }
    } else if (stored) {
      const storedLocale = coerceLocale(stored);
      setLocaleState(storedLocale);
      document.cookie = `${LOCALE_COOKIE_NAME}=${storedLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    setReady(true);
  }, [initialLocale, preferInitialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Not fatal: the language still changes for this page view.
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dictionary: getDictionary(locale), setLocale, ready }),
    [locale, setLocale, ready],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used inside <LocaleProvider>.');
  }
  return context;
}

/** Shorthand for the common case of only wanting the strings. */
export function useDictionary(): Dictionary {
  return useLocale().dictionary;
}
