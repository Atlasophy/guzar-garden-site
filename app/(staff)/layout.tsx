import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/staff.css';
import { LocaleProvider } from '@/components/shared/locale-provider';
import { getRequestLocale } from '@/lib/i18n/staff-server';

export const metadata: Metadata = {
  title: 'Guzar Garden Staff',
  robots: { index: false, follow: false },
};

export default async function StaffRootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="theme-staff">
        <LocaleProvider initialLocale={locale} preferInitialLocale>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
