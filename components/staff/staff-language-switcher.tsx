'use client';

import { LOCALES, LOCALE_LABEL } from '@/lib/i18n/locales';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale } from '@/components/shared/locale-provider';
import { useStaffDictionary } from './use-staff-dictionary';

export function StaffLanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const dictionary = useStaffDictionary();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = `${pathname}${searchParams.size ? `?${searchParams}` : ''}`;

  return (
    <div className="staff-language" role="group" aria-label={dictionary.language}>
      {LOCALES.map((code) => (
        <a
          key={code}
          href={`/api/language?locale=${code}&next=${encodeURIComponent(currentPath)}`}
          aria-current={locale === code ? 'page' : undefined}
          className={locale === code ? 'active' : undefined}
          onClick={() => setLocale(code)}
        >
          {LOCALE_LABEL[code]}
        </a>
      ))}
    </div>
  );
}
