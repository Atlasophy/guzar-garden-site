import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../styles/base.css';
import '../styles/cream.css';
import { DocumentHead } from '@/components/shared/document-head';
import { LocaleProvider } from '@/components/shared/locale-provider';

/**
 * The cream document: the menu.
 *
 * It is a second root layout on purpose. `menu.html` was always a separate
 * document with its own palette, its own `.btn` and its own `.nav`, and the two
 * stylesheets cannot share a `:root`. Keeping them as two documents means the
 * menu page ships only the cream stylesheet and the landing page only the
 * emerald one, and a navigation between them is the same full page load it has
 * always been.
 */

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? 'http://localhost:3000'),
  title: 'Karta dań — Guzar Garden, Restauracja Uzbecka & Grill Halal',
  description:
    'Pełna karta dań Guzar Garden — plow, samsa z tandoora, szaszłyki, manty, lagman, chleb, desery i herbaty. Restauracja uzbecka przy Parku Skaryszewskim w Warszawie.',
  icons: {
    icon: [
      { url: '/assets/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/brand/favicon-64.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: [{ url: '/assets/brand/favicon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  alternates: { canonical: '/menu' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#122417',
  width: 'device-width',
  initialScale: 1,
};

export default function MenuLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <DocumentHead includeJsFlag={false} />
      </head>
      <body className="theme-cream">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
