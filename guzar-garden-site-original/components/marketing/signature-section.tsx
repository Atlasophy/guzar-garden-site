'use client';

import Link from 'next/link';
import { useLocale } from '@/components/shared/locale-provider';
import { SignatureGrid } from './signature-grid';
import type { MenuItemView } from '@/lib/menu/repository';

/** The "dishes people come back for" band, with its heading and full-menu link. */
export function SignatureSection({ items }: { items: MenuItemView[] }) {
  const { dictionary } = useLocale();
  const t = dictionary.signature;

  return (
    <section className="sec sig" id="dania">
      <div className="atmo" aria-hidden="true">
        <div className="atmo-layer atmo-static" />
      </div>
      <div className="wrap">
        <div className="sig-head">
          <div>
            <p className="eyebrow rv">{t.eyebrow}</p>
            <h2 className="rv" style={{ '--d': '.06s' } as React.CSSProperties}>
              {t.heading}
            </h2>
          </div>
          <Link
            className="btn outline rv"
            style={{ '--d': '.12s' } as React.CSSProperties}
            href="/menu"
          >
            <span>{t.fullMenu}</span>
          </Link>
        </div>
        <SignatureGrid items={items} />
      </div>
    </section>
  );
}
