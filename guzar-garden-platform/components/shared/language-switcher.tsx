'use client';

import { LOCALES, LOCALE_LABEL } from '@/lib/i18n/locales';
import { useLocale } from './locale-provider';

/**
 * The language control, carried over as-is from both static pages: a row of
 * four buttons on a wide screen, and a native `<select>` under 460px where the
 * row would crowd the burger. Both are always in the DOM and CSS decides which
 * is shown — that is how the original did it, and it means the choice is
 * reachable at every width without a JavaScript breakpoint watcher.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, dictionary } = useLocale();

  return (
    <>
      <div className="lang" role="group" aria-label={dictionary.nav.languageGroup}>
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            className={code === locale ? 'on' : undefined}
            aria-pressed={code === locale}
            onClick={() => setLocale(code)}
          >
            {LOCALE_LABEL[code]}
          </button>
        ))}
      </div>
      <select
        className="lang-select"
        aria-label={dictionary.nav.languageGroup}
        value={locale}
        onChange={(event) => setLocale(event.target.value as (typeof LOCALES)[number])}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABEL[code]}
          </option>
        ))}
      </select>
    </>
  );
}
