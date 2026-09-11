'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/shared/locale-provider';
import { SITE, TEL_HREF } from '@/components/shared/site-config';
import { OpeningStatus } from './opening-hours';
import type { PublicHours } from '@/lib/venue/public-info';

/**
 * The hero.
 *
 * The gold weave, the emblem roundel and the wordmark are the original markup,
 * unchanged — including the `data-split` hook the effects module looks for, and
 * the deliberate absence of `display:inline-block` on the word spans, which is
 * what keeps the gradient's text clip working and the title visible.
 *
 * The one substantive change: the primary call to action is now "book a table",
 * pointing at /reserve. The telephone number stays beside it, because a
 * restaurant that only takes bookings through a form loses the guest standing
 * outside it.
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
    <section className="hero" id="top">
      {/* The gold weave. Strips of brass laid across the emerald sheet on a
          strict 45-degree bias, each lit from its top-left end and dropping a
          shadow onto the sheet below. Drawn once here at full size; the rest of
          the page only quotes it as a hairline. */}
      <div className="hero-weave" aria-hidden="true">
        <span className="plane plane-a" />
        <span className="plane plane-b" />
        <svg viewBox="0 0 1200 760" preserveAspectRatio="xMaxYMid slice">
          <defs>
            <linearGradient id="ggGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f6e3b4" />
              <stop offset=".34" stopColor="#e0b671" />
              <stop offset=".7" stopColor="#c19240" />
              <stop offset="1" stopColor="#9c7130" />
            </linearGradient>
            <linearGradient id="ggGoldDim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d9b478" />
              <stop offset="1" stopColor="#8a6228" />
            </linearGradient>
            <filter id="ggCut" x="-30%" y="-30%" width="180%" height="180%">
              <feDropShadow
                dx="13"
                dy="13"
                stdDeviation="10"
                floodColor="#020d07"
                floodOpacity=".72"
              />
            </filter>
          </defs>
          <g fill="none" strokeLinecap="butt" strokeLinejoin="miter" filter="url(#ggCut)">
            {/* the long rising strips */}
            <path d="M330 800 L980 150" stroke="url(#ggGold)" strokeWidth="30" />
            <path d="M560 810 L1180 190" stroke="url(#ggGoldDim)" strokeWidth="13" />
            <path d="M700 830 L1260 270" stroke="url(#ggGold)" strokeWidth="21" />
            <path d="M905 800 L1240 465" stroke="url(#ggGoldDim)" strokeWidth="9" />
            {/* strips that turn a corner, as the reference art does */}
            <path d="M612 726 L900 438 L1010 548" stroke="url(#ggGold)" strokeWidth="17" />
            <path d="M760 90 L968 298 L868 398" stroke="url(#ggGoldDim)" strokeWidth="15" />
            {/* the falling strips crossing them */}
            <path d="M690 -40 L1250 520" stroke="url(#ggGold)" strokeWidth="24" />
            <path d="M878 -30 L1215 307" stroke="url(#ggGoldDim)" strokeWidth="11" />
            <path d="M1010 120 L1260 370" stroke="url(#ggGold)" strokeWidth="16" />
            {/* struck fragments: the same bias, cut short */}
            <path d="M1058 40 L1108 90" stroke="url(#ggGold)" strokeWidth="13" />
            <path d="M1132 96 L1174 138" stroke="url(#ggGoldDim)" strokeWidth="9" />
            <path d="M1146 596 L1196 646" stroke="url(#ggGold)" strokeWidth="14" />
            <path d="M980 664 L1022 706" stroke="url(#ggGoldDim)" strokeWidth="10" />
            <path d="M1216 622 L1252 658" stroke="url(#ggGold)" strokeWidth="8" />
          </g>
        </svg>
      </div>

      <div className="atmo" aria-hidden="true">
        <div className="atmo-layer atmo-1" data-depth=".3" />
        <div className="atmo-layer atmo-2" data-depth=".55" />
        <div className="atmo-layer atmo-3" data-depth=".85" />
        <div className="atmo-layer atmo-4" data-depth=".7" />
      </div>

      <div className="hero-shell">
        <div className="hero-copy">
          <div className="hero-kicker rv">
            <span>{t.kicker}</span>
            <OpeningStatus hours={hours} />
          </div>

          <h1 className="title" data-split>
            GUZAR <em>Garden</em>
          </h1>

          <p className="sub rv" style={{ '--d': '.16s' } as React.CSSProperties}>
            {t.sub}
          </p>
          <p className="lede rv" style={{ '--d': '.24s' } as React.CSSProperties}>
            {t.lede}
          </p>

          <div className="hero-cta rv" style={{ '--d': '.32s' } as React.CSSProperties}>
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

          <div className="hero-facts rv" style={{ '--d': '.4s' } as React.CSSProperties}>
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

        <div className="hero-visual rv" style={{ '--d': '.12s' } as React.CSSProperties}>
          <div className="brand-stage" id="brandStage">
            <span className="wheel-glow" aria-hidden="true" />
            <span className="wheel-trace trace-one" aria-hidden="true" />
            <span className="wheel-trace trace-two" aria-hidden="true" />
            <span className="wheel-gold" aria-hidden="true" />
            <span className="wheel-color" aria-hidden="true">
              <Image
                src="/assets/brand/guzar-mark-transparent.png"
                alt=""
                width={364}
                height={364}
                loading="eager"
              />
            </span>
            <span className="wheel-star star-one" aria-hidden="true" />
            <span className="wheel-star star-two" aria-hidden="true" />
            <span className="wheel-caption">{t.wheelCaption}</span>
          </div>
        </div>
      </div>

      <div className="hero-arch" aria-hidden="true" />
    </section>
  );
}
