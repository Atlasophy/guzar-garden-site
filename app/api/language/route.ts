import { NextResponse } from 'next/server';
import { isLocale, LOCALE_COOKIE_NAME } from '@/lib/i18n/locales';

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const locale = requestUrl.searchParams.get('locale');
  const requestedNext = requestUrl.searchParams.get('next') ?? '/';

  if (!isLocale(locale)) {
    return NextResponse.redirect(new URL('/', requestUrl));
  }

  const nextUrl = new URL(requestedNext, requestUrl);
  const destination = nextUrl.origin === requestUrl.origin ? nextUrl : new URL('/', requestUrl);
  const response = NextResponse.redirect(destination);
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: requestUrl.protocol === 'https:',
  });
  return response;
}
