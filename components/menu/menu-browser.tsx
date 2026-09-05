'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/shared/locale-provider';
import { localized } from '@/lib/i18n/fallback';
import { formatPrice } from '@/lib/menu/price';
import { MIN_QUERY_LENGTH, matchesQuery } from '@/lib/menu/search';
import type { MenuCategoryView, MenuItemView, PublicMenu } from '@/lib/menu/repository';
import { DishImage } from './dish-image';
import { DishSheet } from './dish-sheet';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EmptySearchIcon,
  SearchIcon,
} from '@/components/shared/icons';

/**
 * The menu, as a two-stage browse rather than one long scroll — the same
 * behaviour the static page had:
 *
 *   home    signature plates and the fourteen category cards
 *   cat     one category at a time, with previous/next
 *   search  matches across every category, in all four languages
 *
 * The view is mirrored into `location.hash`, so `/menu#grill` still opens the
 * grill directly and the browser's back button behaves. Those links were in
 * circulation before this rewrite and they keep working.
 *
 * All 127 dishes arrive as props from the server in one payload, so switching
 * category or typing a search is instant and does not touch the network.
 */

export function MenuBrowser({ menu }: { menu: PublicMenu }) {
  const { locale, dictionary } = useLocale();
  const t = dictionary.menu;

  const [view, setView] = useState<'home' | 'cat' | 'search'>('home');
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openDish, setOpenDish] = useState<{
    item: MenuItemView;
    category: MenuCategoryView;
  } | null>(null);
  const lastNonSearch = useRef<string>('home');
  const searchRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(
    () => menu.categories.flatMap((category) => category.items.map((item) => ({ item, category }))),
    [menu],
  );

  const categoryBySlug = useMemo(
    () => new Map(menu.categories.map((category) => [category.slug, category])),
    [menu],
  );

  const go = useCallback((next: 'home' | 'cat' | 'search', slug?: string, skipHash = false) => {
    setView(next);
    if (next === 'home') {
      setCategorySlug(null);
      if (!skipHash && window.location.hash) {
        window.history.pushState('', '', window.location.pathname);
      }
    } else if (next === 'cat' && slug) {
      setCategorySlug(slug);
      if (!skipHash) window.history.pushState('', '', `#${slug}`);
    }
    window.scrollTo({ top: 0, behavior: next === 'search' ? 'auto' : 'smooth' });
  }, []);

  // Deep links and the back button. Both were supported before; both still are.
  useEffect(() => {
    const routeFromHash = (skip: boolean) => {
      const hash = window.location.hash.replace('#', '');
      if (hash && categoryBySlug.has(hash)) go('cat', hash, true);
      else go('home', undefined, skip);
    };
    routeFromHash(true);
    const onPopState = () => routeFromHash(true);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [categoryBySlug, go]);

  const results = useMemo(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) return [];
    return allItems.filter((entry) => matchesQuery(entry.item.haystack, query));
  }, [allItems, query]);

  const onQueryChange = (value: string) => {
    setQuery(value);
    const trimmed = value.trim();
    if (trimmed.length >= MIN_QUERY_LENGTH) {
      if (view !== 'search') {
        lastNonSearch.current = view === 'cat' && categorySlug ? `cat:${categorySlug}` : 'home';
      }
      setView('search');
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else if (view === 'search') {
      const previous = lastNonSearch.current;
      if (previous.startsWith('cat:')) go('cat', previous.slice(4));
      else go('home');
    }
  };

  const clearSearch = () => {
    setQuery('');
    const previous = lastNonSearch.current;
    if (previous.startsWith('cat:')) go('cat', previous.slice(4));
    else go('home');
    searchRef.current?.focus();
  };

  const category = categorySlug ? categoryBySlug.get(categorySlug) : undefined;
  const categoryIndex = category ? menu.categories.findIndex((c) => c.slug === category.slug) : -1;
  const previousCategory = categoryIndex > 0 ? menu.categories[categoryIndex - 1] : undefined;
  const nextCategory =
    categoryIndex >= 0 && categoryIndex < menu.categories.length - 1
      ? menu.categories[categoryIndex + 1]
      : undefined;

  const renderCard = (
    item: MenuItemView,
    itemCategory: MenuCategoryView,
    index: number,
    showCategory: boolean,
  ) => (
    <button
      key={item.id}
      type="button"
      className="dish"
      style={{ '--d': `${(Math.min(index, 14) * 0.045).toFixed(3)}s` } as React.CSSProperties}
      onClick={() => setOpenDish({ item, category: itemCategory })}
    >
      <span className="art">
        <DishImage item={item} locale={locale} sizes="(max-width: 640px) 100vw, 33vw" />
      </span>
      <span className="txt">
        {showCategory ? (
          <span className="in-cat">{localized(itemCategory.name, locale)}</span>
        ) : null}
        <span className="row">
          <h3>{localized(item.name, locale)}</h3>
          <span className="pr">{formatPrice(item.price, item.currency, locale)}</span>
        </span>
        <span className="desc">
          {/* A sold-out dish stays on the menu, marked. Removing it would read
              as though the kitchen never made it. */}
          {!item.isAvailable ? <strong className="sold-out">{t.soldOut}</strong> : null}
          {localized(item.description, locale)}
        </span>
      </span>
    </button>
  );

  return (
    <>
      <section className="mast">
        <div className="atmo" aria-hidden="true">
          <div
            className="atmo-layer atmo-static"
            style={{ top: '-14vh', right: '-10vh', color: 'var(--green-3)' }}
          />
        </div>
        <div className="wrap">
          <div className="mast-logo">
            <Image
              src="/assets/brand/guzar-full-transparent.png"
              alt="Guzar Garden — est. 2024"
              width={1280}
              height={1280}
              priority
            />
          </div>
          <h1>{t.heading}</h1>
          <p className="sub">{t.sub}</p>
          <p className="note">{t.note}</p>

          <div className="searchbar">
            <SearchIcon className="ico" />
            <input
              ref={searchRef}
              type="search"
              id="q"
              autoComplete="off"
              aria-label={t.searchLabel}
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
            <button
              className={`clr${query ? ' on' : ''}`}
              type="button"
              aria-label={t.clearSearch}
              onClick={clearSearch}
            >
              ×
            </button>
          </div>
        </div>
      </section>

      {/* Screen readers are told when the result count changes; without this the
          list simply swaps under them with no announcement. */}
      <p className="sr-only" role="status" aria-live="polite">
        {view === 'search' ? `${results.length} ${t.found}` : ''}
      </p>

      {/* ---------------- home ---------------- */}
      <div className={`view${view === 'home' ? ' on' : ''}`} id="v-home">
        <div className="wrap">
          {menu.signatures.length > 0 ? (
            <div className="strip">
              <div className="strip-head">
                <h2>{t.signatures}</h2>
                <span>{t.mostOrdered}</span>
              </div>
              <div className="strip-grid" id="stripGrid">
                {menu.signatures.map((item, index) => {
                  const owner = categoryBySlug.get(item.categorySlug);
                  return owner ? renderCard(item, owner, index, true) : null;
                })}
              </div>
            </div>
          ) : null}

          <div className="cats">
            <div className="cats-head">
              <h2>{t.categories}</h2>
              <span id="totalCount">
                {menu.totalItems} {t.dishes} · {menu.categories.length} {t.categoriesCount}
              </span>
            </div>
            <div className="cat-grid" id="catGrid">
              {menu.categories.map((entry) => (
                <button
                  key={entry.slug}
                  type="button"
                  className="cat"
                  onClick={() => go('cat', entry.slug)}
                >
                  <span className="go">
                    <ChevronRightIcon />
                  </span>
                  <span className="art">
                    {entry.items[0] ? (
                      <DishImage
                        item={entry.items[0]}
                        locale={locale}
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : null}
                  </span>
                  <span className="txt">
                    <span>
                      <h3>{localized(entry.name, locale)}</h3>
                      <span className="meta">
                        {entry.items.length} {t.dishes}
                      </span>
                    </span>
                    <span className="from">
                      {t.from} {formatPrice(entry.fromPrice, 'PLN', locale)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- one category ---------------- */}
      <div className={`view${view === 'cat' ? ' on' : ''}`} id="v-cat">
        <div className="wrap">
          <button className="back" type="button" onClick={() => go('home')}>
            <ChevronLeftIcon />
            <span>{t.allCategories}</span>
          </button>
          <div className="cat-head">
            <div>
              <h2 id="catTitle">{category ? localized(category.name, locale) : '—'}</h2>
              <span className="count" id="catCount">
                {category
                  ? `${category.items.length} ${t.dishes} · ${t.from} ${formatPrice(
                      category.fromPrice,
                      'PLN',
                      locale,
                    )}`
                  : ''}
              </span>
            </div>
          </div>
          <div className="dish-grid" id="dishGrid">
            {category?.items.map((item, index) => renderCard(item, category, index, false))}
          </div>
          <div className="catnav">
            <button
              type="button"
              disabled={!previousCategory}
              onClick={() => previousCategory && go('cat', previousCategory.slug)}
            >
              <small>{t.previous}</small>
              <b>{previousCategory ? localized(previousCategory.name, locale) : '—'}</b>
            </button>
            <button
              type="button"
              disabled={!nextCategory}
              onClick={() => nextCategory && go('cat', nextCategory.slug)}
            >
              <small>{t.next}</small>
              <b>{nextCategory ? localized(nextCategory.name, locale) : '—'}</b>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- search ---------------- */}
      <div className={`view${view === 'search' ? ' on' : ''}`} id="v-search">
        <div className="wrap">
          <div className="cat-head">
            <div>
              <h2 id="resTitle">{t.results}</h2>
              <span className="count" id="resCount">
                {results.length} {t.found} · &quot;{query}&quot;
              </span>
            </div>
          </div>
          <div className="dish-grid" id="resGrid">
            {results.map((entry, index) => renderCard(entry.item, entry.category, index, true))}
          </div>
          {results.length === 0 ? (
            <div className="empty" id="empty">
              <EmptySearchIcon />
              <p>{t.emptyTitle}</p>
              <span>{t.emptyBody}</span>
            </div>
          ) : null}
        </div>
      </div>

      {openDish ? (
        <DishSheet
          item={openDish.item}
          category={openDish.category}
          onClose={() => setOpenDish(null)}
        />
      ) : null}
    </>
  );
}
