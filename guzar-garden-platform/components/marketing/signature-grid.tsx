'use client';

import Link from 'next/link';
import { useLocale } from '@/components/shared/locale-provider';
import { DishImage } from '@/components/menu/dish-image';
import { localized } from '@/lib/i18n/fallback';
import { formatPrice } from '@/lib/menu/price';
import type { MenuItemView } from '@/lib/menu/repository';

/**
 * "The dishes people come back for."
 *
 * These now come from the menu database — published items flagged
 * `is_signature`, in `signature_order` — rather than from a second hardcoded
 * array on the landing page. That array had drifted: it priced plov at 39 zł
 * while the menu said 26.99, and named dishes that did not exist on the menu at
 * all (see docs/menu-migration-report.md). With one source, that cannot happen
 * again, and a manager can change the five without a deploy.
 */
export function SignatureGrid({ items }: { items: MenuItemView[] }) {
  const { locale, dictionary } = useLocale();

  if (items.length === 0) {
    return (
      <div className="sig-grid" id="sigGrid">
        <p className="lede rv in">{dictionary.menu.unavailableBody}</p>
      </div>
    );
  }

  return (
    <div className="sig-grid" id="sigGrid">
      {items.map((item, index) => (
        <Link
          key={item.id}
          className="dish rv"
          style={{ '--d': `${(index * 0.07).toFixed(2)}s` } as React.CSSProperties}
          href={`/menu#${item.categorySlug}`}
        >
          <span className="art">
            <DishImage item={item} locale={locale} sizes="(max-width: 760px) 45vw, 18vw" />
          </span>
          <span className="txt">
            <span className="cat">{localized(item.categoryName, locale)}</span>
            <h3>{localized(item.name, locale)}</h3>
            <span className="pr">
              {formatPrice(item.price, item.currency, locale)}
              {!item.isAvailable ? ` · ${dictionary.menu.soldOut}` : ''}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
