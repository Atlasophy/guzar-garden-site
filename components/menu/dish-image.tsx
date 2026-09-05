'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { dishArt } from '@/lib/menu/dish-art';
import { localized } from '@/lib/i18n/fallback';
import type { Locale } from '@/lib/i18n/locales';
import type { MenuItemView } from '@/lib/menu/repository';

/**
 * A dish's picture: the photograph when there is one, the generated artwork
 * when there is not.
 *
 * The artwork is not a placeholder waiting to be replaced — it is the house
 * illustration style, and it was chosen over stock photography because using
 * another restaurant's food photographs to represent this one's food would
 * misrepresent them. Uploading a real photograph for a dish swaps it in for
 * that dish alone.
 *
 * The SVG is injected as markup rather than parsed into React elements: it is
 * ~6 KB of paths per dish and there are 127 of them. The string is generated
 * here, from a module that escapes the only caller-supplied value it touches
 * (the dish name, into an `aria-label`), so there is no untrusted HTML in it.
 */

export interface DishImageProps {
  item: MenuItemView;
  locale: Locale;
  /** Which sizes the browser should consider. Passed to next/image. */
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function DishImage({ item, locale, sizes, priority, className }: DishImageProps) {
  const name = localized(item.name, locale);

  const artwork = useMemo(
    () => (item.image ? null : dishArt(item.categorySlug, localized(item.name, 'pl'))),
    [item.image, item.categorySlug, item.name],
  );

  if (item.image) {
    const alt = localized(item.image.alt, locale) || name;
    return (
      <Image
        className={className}
        src={item.image.url}
        alt={alt}
        width={item.image.width}
        height={item.image.height}
        sizes={sizes}
        priority={priority}
      />
    );
  }

  return (
    <span
      className={className}
      // Generated locally from the dish's own category and Polish name; see the
      // note above on why this is markup and not elements.
      dangerouslySetInnerHTML={{ __html: artwork ?? '' }}
    />
  );
}
