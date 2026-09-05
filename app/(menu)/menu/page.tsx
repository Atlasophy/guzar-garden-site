import Link from 'next/link';
import { publicEnv } from '@/lib/config/env';
import { getPublicMenu } from '@/lib/menu/repository';
import { formatPrice } from '@/lib/menu/price';
import { localized } from '@/lib/i18n/fallback';
import { SITE, TEL_HREF } from '@/components/shared/site-config';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { MenuBrowser } from '@/components/menu/menu-browser';

/**
 * The public menu.
 *
 * Every dish now comes from PostgreSQL — the same rows staff edit — rather than
 * from a 470-line array inside the page. Drafts and archived dishes are
 * excluded by the view and by RLS, so an unpublished price cannot reach here
 * even by mistake; a sold-out dish does reach here, marked.
 *
 * The whole menu is fetched once and handed to the browser component, so
 * switching category or searching never touches the network — that is what the
 * old page did with its inline array, and it is why the menu feels instant.
 *
 * SEO: the interactive view hides dishes behind a category click, which is a
 * fine way to read a menu and a poor way to be indexed. Two things address
 * that — a complete `Menu` JSON-LD document with all fourteen sections and
 * every dish and price, and a `<noscript>` listing of the same. Both describe
 * exactly what a visitor can reach; neither is hidden text.
 */

export const revalidate = 3600;

export default async function MenuPage() {
  let menu;
  try {
    menu = await getPublicMenu(publicEnv.venueSlug);
  } catch {
    menu = null;
  }

  if (!menu || menu.categories.length === 0) {
    return (
      <>
        <div className="grain" aria-hidden="true" />
        <SiteHeader variant="cream" />
        <section className="mast">
          <div className="wrap">
            <h1>Karta dań</h1>
            <p className="note">
              Karta dań jest chwilowo niedostępna. Zadzwoń do nas:{' '}
              <a href={TEL_HREF}>{SITE.phoneDisplay}</a>
            </p>
            <p className="note">
              <Link href="/">Wróć na stronę główną</Link>
            </p>
          </div>
        </section>
        <SiteFooter variant="cream" />
      </>
    );
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'Guzar Garden — karta dań',
    inLanguage: ['pl', 'en', 'ru', 'uz'],
    hasMenuSection: menu.categories.map((category) => ({
      '@type': 'MenuSection',
      name: localized(category.name, 'pl'),
      hasMenuItem: category.items.map((item) => ({
        '@type': 'MenuItem',
        name: localized(item.name, 'pl'),
        description: localized(item.description, 'pl') || undefined,
        offers: item.price
          ? { '@type': 'Offer', price: item.price, priceCurrency: item.currency }
          : undefined,
        suitableForDiet: item.dietaryTags.includes('halal')
          ? 'https://schema.org/HalalDiet'
          : undefined,
      })),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="grain" aria-hidden="true" />
      <a className="skip-link" href="#menu-content">
        Przejdź do karty dań
      </a>

      <SiteHeader variant="cream" />

      <MenuBrowser menu={menu} />

      {/*
        The full menu for a visitor without JavaScript. Same dishes, same
        prices, same order — plain markup instead of the interactive browse.
      */}
      <noscript>
        <div className="wrap" id="menu-content" style={{ paddingBottom: '4rem' }}>
          {menu.categories.map((category) => (
            <section key={category.slug} id={category.slug} style={{ marginTop: '2.5rem' }}>
              <h2>{localized(category.name, 'pl')}</h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {category.items.map((item) => (
                  <li key={item.id} style={{ padding: '.5rem 0' }}>
                    <strong>{localized(item.name, 'pl')}</strong>
                    {item.portionText ? ` (${item.portionText})` : ''} —{' '}
                    {formatPrice(item.price, item.currency, 'pl')}
                    {!item.isAvailable ? ' — chwilowo niedostępne' : ''}
                    <br />
                    <small>{localized(item.description, 'pl')}</small>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p>
            Rezerwacje: <a href={TEL_HREF}>{SITE.phoneDisplay}</a>
          </p>
        </div>
      </noscript>

      <SiteFooter variant="cream" />
    </>
  );
}
