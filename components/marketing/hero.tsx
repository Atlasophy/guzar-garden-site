'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/shared/locale-provider';
import { SITE, TEL_HREF } from '@/components/shared/site-config';
import { OpeningStatus } from './opening-hours';
import type { PublicHours } from '@/lib/venue/public-info';

/**
 * The hero: one centred column on the emerald ground.
 *
 * Location and opening status, then the neon sign on the garden wall, then the
 * one-line description, the three actions and the three facts. The sign is the
 * page's h1 — it *is* the name — and is masked into the green above and below
 * so it has no edges.
 *
 * The primary call to action is "book a table", pointing at /reserve. The
 * telephone stays beside it, because a restaurant that only takes bookings
 * through a form loses the guest standing outside it.
 */
export function Hero({
  hours,
  rating = SITE.googleRating,
}: {
  hours: PublicHours[];
  rating?: number;
}) {
  const { dictionary } = useLocale();
  const t = dictionary.hero;

  return (
    <section className="hero hero-stack" id="top">
      <div className="hero-stack-inner">
        <div className="hero-kicker rv">
          <span>{t.kicker}</span>
          <OpeningStatus hours={hours} />
        </div>
      </div>

      <h1 className="hero-sign rv" style={{ '--d': '.08s' } as React.CSSProperties}>
        <Image
          src="/assets/brand/guzar-landing.jpg"
          alt="Guzar Garden — est. 2024"
          width={1774}
          height={887}
          sizes="100vw"
          priority
        />
      </h1>

      <div className="hero-stack-inner hero-stack-body">
        <p className="lede rv" style={{ '--d': '.16s' } as React.CSSProperties}>
          {t.lede}
        </p>

        <div className="hero-cta rv" style={{ '--d': '.24s' } as React.CSSProperties}>
          <Link className="btn light" href="/reserve">
            <span>{t.ctaBook}</span>
          </Link>
          <Link className="btn outline" href="/menu">
            <span>{t.ctaMenu}</span>
          </Link>
          <a className="btn outline" href={TEL_HREF}>
            <span>{t.ctaCall}</span>
          </a>
        </div>

        <div className="hero-facts rv" style={{ '--d': '.32s' } as React.CSSProperties}>
          <span>
            <b>100%</b>
            <small>{t.factHalal}</small>
          </span>
          <span>
            <b>9:00–24:00</b>
            <small>{t.factEveryDay}</small>
          </span>
          <span>
            <b>{rating.toFixed(1)}</b>
            <small>{t.factRating}</small>
          </span>
        </div>
      </div>

      <div className="hero-arch" aria-hidden="true" />
    </section>
  );
}
