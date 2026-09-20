import 'server-only';
import { cookies } from 'next/headers';
import { coerceLocale, LOCALE_COOKIE_NAME, type Locale } from './locales';
import { getStaffDictionary } from './staff';

export async function getRequestLocale(): Promise<Locale> {
  return coerceLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value);
}

export async function getServerStaffDictionary() {
  return getStaffDictionary(await getRequestLocale());
}
