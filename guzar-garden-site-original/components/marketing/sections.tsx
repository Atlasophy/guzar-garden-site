'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/shared/locale-provider';
import { SITE, TEL_HREF } from '@/components/shared/site-config';
import {
  AccessibleIcon,
  CartoucheCorner,
  DastarkhanIcon,
  EventsIcon,
  FireIcon,
  FireplaceIcon,
  GardenIcon,
  KazanIcon,
  MusicIcon,
  OrnamentDivider,
  ParkingIcon,
  TakeawayIcon,
  TandoorIcon,
  WifiIcon,
} from '@/components/shared/icons';
import { OpeningHoursList } from './opening-hours';
import { MAP_LANGUAGE } from '@/lib/i18n/locales';
import type { PublicHours } from '@/lib/venue/public-info';

/** The marquee of dish names between the hero and the story. */
export function Marquee() {
  const words = ['Plow', 'Manty', 'Samsa', 'Lagman', 'Szaszłyk', 'Tandoor', 'Kazan', 'Halal'];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[...words, ...words].map((word, index) => (
          <span key={`${word}-${index}`}>{word}</span>
        ))}
      </div>
    </div>
  );
}

export function AboutSection({
  rating = SITE.googleRating,
  reviewCount = SITE.googleReviews,
}: {
  rating?: number;
  reviewCount?: number;
}) {
  const { dictionary } = useLocale();
  const t = dictionary.about;

  return (
    <section className="sec about" id="o-nas">
      <div className="atmo" aria-hidden="true">
        <div className="atmo-layer atmo-static" />
      </div>
      <div className="wrap about-grid">
        <div>
          <p className="eyebrow rv">{t.eyebrow}</p>
          <h2 className="rv" style={{ '--d': '.06s' } as React.CSSProperties}>
            {t.heading}
          </h2>
          <OrnamentDivider className="orn rv" />
          <p className="big-first rv" style={{ '--d': '.18s' } as React.CSSProperties}>
            {t.paragraphOne}
          </p>
          <p className="rv" style={{ '--d': '.24s' } as React.CSSProperties}>
            {t.paragraphTwo}
          </p>
        </div>

        <div className="stats rv" style={{ '--d': '.2s' } as React.CSSProperties}>
          <div className="stat">
            <b>{rating.toFixed(1)}</b>
            <small>{t.statRating}</small>
          </div>
          <div className="stat">
            <b>{reviewCount}</b>
            <small>{t.statReviews}</small>
          </div>
          <div className="stat">
            <b data-count="100" data-suffix="%">
              100%
            </b>
            <small>{t.statHalal}</small>
          </div>
          <div className="stat">
            <b className="small">9:00 – 24:00</b>
            <small>{t.statEveryDay}</small>
          </div>
        </div>
      </div>
    </section>
  );
}

export function KitchenSection() {
  const { dictionary } = useLocale();
  const t = dictionary.kitchen;

  const pillars = [
    { key: 'kazan', icon: <KazanIcon />, copy: t.pillars.kazan, delay: '0s', photo: 'kazan' },
    {
      key: 'tandoor',
      icon: <TandoorIcon />,
      copy: t.pillars.tandoor,
      delay: '.08s',
      photo: 'tandoor',
    },
    { key: 'fire', icon: <FireIcon />, copy: t.pillars.fire, delay: '.16s', photo: 'fire' },
    {
      key: 'table',
      icon: <DastarkhanIcon />,
      copy: t.pillars.table,
      delay: '.24s',
      photo: 'dastarkhan',
    },
  ];

  return (
    <section className="sec kitchen" id="kuchnia">
      <div className="atmo" aria-hidden="true">
        <div className="atmo-layer atmo-static" />
      </div>
      <div className="wrap">
        <div className="kitchen-head">
          <p className="eyebrow rv">{t.eyebrow}</p>
          <h2 className="rv" style={{ '--d': '.06s' } as React.CSSProperties}>
            {t.heading}
          </h2>
          <OrnamentDivider className="orn center rv" />
          <p className="lede rv" style={{ '--d': '.18s' } as React.CSSProperties}>
            {t.lede}
          </p>
        </div>

        <div className="pillars">
          {pillars.map((pillar) => (
            <article
              key={pillar.key}
              className="pillar rv"
              style={{ '--d': pillar.delay } as React.CSSProperties}
            >
              {/* Hidden until the card is scrolled into view, then slides up
                  from the bottom of its frame (see .pillar-photo in emerald.css).
                  Decorative: the heading and copy below say what it shows. */}
              <div className="pillar-photo" aria-hidden="true">
                <Image
                  src={`/assets/kitchen/${pillar.photo}.webp`}
                  alt=""
                  width={960}
                  height={720}
                  sizes="(max-width: 560px) 92vw, (max-width: 1000px) 46vw, 300px"
                />
              </div>
              {pillar.icon}
              <h3>{pillar.copy.title}</h3>
              <span className="uz">{pillar.copy.sub}</span>
              <p>{pillar.copy.body}</p>
            </article>
          ))}
        </div>

        {/* The one fully ornate object on the page: the framed panel from the
            ornament reference, drawn once, around the line the whole kitchen is
            really about. */}
        <div className="quote rv">
          <span className="q-seal" aria-hidden="true" />
          <CartoucheCorner position="tl" />
          <CartoucheCorner position="tr" />
          <CartoucheCorner position="bl" />
          <CartoucheCorner position="br" />
          <p>{t.quote}</p>
          <span>{t.quoteAttribution}</span>
        </div>
      </div>
    </section>
  );
}

export function VenueSection() {
  const { dictionary } = useLocale();
  const t = dictionary.venue;

  const features = [
    { key: 'garden', icon: <GardenIcon />, copy: t.features.garden },
    { key: 'fireplace', icon: <FireplaceIcon />, copy: t.features.fireplace },
    { key: 'music', icon: <MusicIcon />, copy: t.features.music },
    { key: 'events', icon: <EventsIcon />, copy: t.features.events },
    { key: 'wifi', icon: <WifiIcon />, copy: t.features.wifi },
    { key: 'parking', icon: <ParkingIcon />, copy: t.features.parking },
    { key: 'accessible', icon: <AccessibleIcon />, copy: t.features.accessible },
    { key: 'takeaway', icon: <TakeawayIcon />, copy: t.features.takeaway },
  ];

  return (
    <section className="sec feat">
      <div className="atmo" aria-hidden="true">
        <div className="atmo-layer atmo-static" />
      </div>
      <div className="wrap">
        <p className="eyebrow rv">{t.eyebrow}</p>
        <h2 className="rv" style={{ '--d': '.06s' } as React.CSSProperties}>
          {t.heading}
        </h2>
        <div className="feat-grid rv" style={{ '--d': '.12s' } as React.CSSProperties}>
          {features.map((feature) => (
            <div className="f" key={feature.key}>
              {feature.icon}
              <b>{feature.copy.title}</b>
              <small>{feature.copy.body}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LocationSection({ hours }: { hours: PublicHours[] }) {
  const { locale, dictionary } = useLocale();
  const t = dictionary.location;

  return (
    <section className="sec loc" id="miejsce">
      <div className="atmo" aria-hidden="true">
        <div className="atmo-layer atmo-static" />
      </div>
      <div className="wrap">
        <div className="loc-panel">
          <div className="loc-grid">
            <div className="rv">
              <p className="eyebrow">{t.eyebrow}</p>
              <h2>{t.heading}</h2>
              <OrnamentDivider />

              <div className="info-block">
                <h4>{t.addressLabel}</h4>
                <p>
                  {SITE.addressLine}
                  <br />
                  {SITE.postalCode} {SITE.city}, {SITE.district}
                </p>
                <small>{t.addressNote}</small>
              </div>

              <div className="info-block">
                <h4>{t.hoursLabel}</h4>
                <OpeningHoursList hours={hours} />
                <small>{t.hoursNote}</small>
              </div>

              <div className="info-block">
                <h4>{t.gettingLabel}</h4>
                <p>{t.gettingValue}</p>
                <small>{t.gettingNote}</small>
              </div>

              <div className="info-block">
                <h4>{t.parkingLabel}</h4>
                <p>{t.parkingValue}</p>
                <small>{t.parkingNote}</small>
              </div>

              <div className="info-block">
                <h4>{t.reservationsLabel}</h4>
                <p>
                  <Link href="/reserve">{t.reserveOnline}</Link>
                  {' · '}
                  <a href={TEL_HREF}>{SITE.phoneDisplay}</a>
                </p>
                <small>{t.reservationsNote}</small>
              </div>
            </div>

            <div className="rv" style={{ '--d': '.1s' } as React.CSSProperties}>
              <div className="mapcard">
                <div className="map-frame">
                  <div className="map-badge">
                    <b>Guzar Garden</b>
                    <small>{t.mapBadgeSub}</small>
                  </div>
                  <iframe
                    id="gmap"
                    title="Guzar Garden — Google Maps"
                    src={`${SITE.mapsEmbed}${MAP_LANGUAGE[locale]}`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
                <div className="map-bar">
                  <span className="coords">{SITE.coordsLabel}</span>
                  <span className="acts">
                    <a href={SITE.mapsDirections} target="_blank" rel="noopener">
                      {t.directions}
                    </a>
                    <a href={SITE.mapsPlace} target="_blank" rel="noopener">
                      {t.openInMaps}
                    </a>
                  </span>
                </div>
                <p className="map-hint">{t.mapHint}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
