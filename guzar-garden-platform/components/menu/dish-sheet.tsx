'use client';

import { useEffect, useId, useRef } from 'react';
import { useLocale } from '@/components/shared/locale-provider';
import { localized, resolveLocalized } from '@/lib/i18n/fallback';
import { formatPrice } from '@/lib/menu/price';
import type { MenuCategoryView, MenuItemView } from '@/lib/menu/repository';
import { DishImage } from './dish-image';

/**
 * The dish detail overlay.
 *
 * Same design as before, with the dialog behaviour a dialog needs and the old
 * one did not have: focus moves into the panel when it opens and returns to
 * whatever opened it when it closes, Tab is trapped inside while it is up, and
 * the page behind it does not scroll. Escape and the scrim both close it.
 */
export function DishSheet({
  item,
  category,
  onClose,
}: {
  item: MenuItemView;
  category: MenuCategoryView;
  onClose: () => void;
}) {
  const { locale, dictionary } = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusTo = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    returnFocusTo.current = document.activeElement;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      (returnFocusTo.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  const description = resolveLocalized(item.description, locale);

  return (
    <div className="sheet on" id="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="scrim" onClick={onClose} />
      <div className="card" ref={cardRef}>
        <button
          className="close"
          type="button"
          ref={closeRef}
          aria-label={dictionary.menu.closeDetail}
          onClick={onClose}
        >
          ×
        </button>
        <div className="art" id="sheetArt">
          <DishImage item={item} locale={locale} sizes="(max-width: 1000px) 100vw, 380px" />
        </div>
        <div className="body">
          <span className="in-cat" id="sheetCat">
            {localized(category.name, locale)}
          </span>
          <h3 id={titleId}>{localized(item.name, locale)}</h3>
          <div className="pr" id="sheetPrice">
            {formatPrice(item.price, item.currency, locale)}
            {item.price === null ? ` · ${dictionary.menu.askWaiter}` : ''}
          </div>
          {item.portionText ? <p className="portion">{item.portionText}</p> : null}
          {!item.isAvailable ? (
            <p className="sold-out-note">{dictionary.menu.soldOut}</p>
          ) : null}
          <p className="desc" id="sheetDesc">
            {description.value}
          </p>
        </div>
      </div>
    </div>
  );
}
