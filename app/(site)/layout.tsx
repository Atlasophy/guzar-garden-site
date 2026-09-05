import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../styles/base.css';
import '../styles/emerald.css';
import '../styles/reserve.css';
import '../styles/highlights.css';
import '../styles/floor-refresh.css';
import '../styles/reviews.css';
import { DocumentHead } from '@/components/shared/document-head';
import { LocaleProvider } from '@/components/shared/locale-provider';

/**
 * The emerald document: the landing page, the reservation flow and the guest's
 * own reservation pages.
 *
 * `lang` starts at Polish and the language switcher corrects it on the client —
 * the same single-URL, four-languages-in-one-document arrangement the static
 * site used, with the preference in `localStorage['gg-lang']`.
 */

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Guzar Garden — Restauracja Uzbecka & Grill Halal, Warszawa',
    template: '%s — Guzar Garden',
  },
  description:
    'Guzar Garden — restauracja uzbecka i grill halal przy Parku Skaryszewskim. Plow z kazana, samsa z pieca tandoor, szaszłyki z węgla. Aleja Zieleniecka 6/8, Warszawa.',
  icons: {
    icon: [
      { url: '/assets/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/brand/favicon-64.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: [{ url: '/assets/brand/favicon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Guzar Garden',
    locale: 'pl_PL',
    alternateLocale: ['en_GB', 'ru_RU', 'uz_UZ'],
    images: [{ url: '/assets/brand/plate-lockup-full.png', width: 1200, height: 1200 }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a2418',
  width: 'device-width',
  initialScale: 1,
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <DocumentHead />
      </head>
      <body className="theme-emerald">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
