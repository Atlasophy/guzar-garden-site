'use client';
import Image from 'next/image';
import { useLocale } from '@/components/shared/locale-provider';
import { SITE } from '@/components/shared/site-config';
import type { PublicHours } from '@/lib/venue/public-info';
import styles from './landing.module.css';

/** "09:00 – 24:00" when every day keeps the same hours, otherwise null. */
function uniformHours(hours: PublicHours[]): string | null {
  const [first] = hours;
  if (hours.length !== 7 || !first) return null;
  const same = hours.every((h) => h.opensAt === first.opensAt && h.closesAt === first.closesAt);
  return same ? `${first.opensAt} – ${first.closesAt}` : null;
}

/**
 * The first thing under the landing screen: who we are, where, and when.
 * The sign photograph and the three actions live on the landing screen.
 */
export function LandingIntro({ hours }: { hours: PublicHours[] }) {
  const { dictionary } = useLocale();
  const t = dictionary.about;
  const hero = dictionary.hero;
  const location = dictionary.location;
  const everyDay = uniformHours(hours);

  return (
    <section className={styles.intro} id="o-nas" aria-labelledby="intro-title">
      <div className={styles.introCopy}>
        <p className="eyebrow">{t.eyebrow}</p>
        <h2 id="intro-title">{t.heading}</h2>
        <p className={styles.introText}>{t.paragraphOne}</p>

        <dl className={styles.facts}>
          <div>
            <dt>{location.addressLabel}</dt>
            <dd>
              {SITE.addressLine}, {SITE.city}
            </dd>
          </div>
          {everyDay && (
            <div>
              <dt>{location.hoursLabel}</dt>
              <dd>
                {hero.factEveryDay} · {everyDay}
              </dd>
            </div>
          )}
          <div>
            <dt>{hero.factHalal}</dt>
            <dd>100%</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export function LandingGallery() {
  const { dictionary } = useLocale();
  const t = dictionary.gallery;
  const photos = (numbers: string[]) => (
    <div className={styles.galleryGrid}>
      {numbers.map((n) => (
        <figure key={n}>
          <Image
            src={`/assets/gallery/atmosphere-${n}.webp`}
            alt={`${t.imageAlt} ${Number(n)}`}
            width={1600}
            height={1200}
            sizes="(max-width: 700px) 90vw, 30vw"
          />
        </figure>
      ))}
    </div>
  );
  return (
    <section className={styles.gallery} id="gallery">
      <div className={styles.galleryHeading}>
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.heading}</h2>
        </div>
        <p>{t.lede}</p>
      </div>
      {photos(['02', '08', '04'])}
      <details className={styles.morePhotos}>
        <summary>
          {t.viewAll}
          <span aria-hidden="true"> +</span>
        </summary>
        {photos(['01', '03', '05', '06', '07', '09', '10', '11', '12'])}
      </details>
    </section>
  );
}
