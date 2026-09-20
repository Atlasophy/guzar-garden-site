'use client';

import Image from 'next/image';
import { useLocale } from '@/components/shared/locale-provider';

/** A first glimpse of the real restaurant before the longer story. */
export function GalleryHighlights() {
  const { dictionary } = useLocale();
  const t = dictionary.gallery;
  return (
    <section className="gallery-highlights" aria-labelledby="highlights-title">
      <div className="wrap">
        <div className="highlights-heading">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2 id="highlights-title">{t.heading}</h2>
          </div>
          <a href="#gallery" className="highlights-link">
            {t.viewAll} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="highlights-grid">
          {[
            { number: '01', label: t.interior },
            { number: '08', label: t.sharedTable },
            { number: '03', label: t.hospitality },
          ].map(({ number, label }) => (
            <a href="#gallery" className="highlight-photo" key={number}>
              <Image
                src={`/assets/gallery/atmosphere-${number}.webp`}
                alt=""
                fill
                sizes="(max-width: 650px) 90vw, (max-width: 1000px) 45vw, 42vw"
              />
              <span className="highlight-caption">
                {label}
                <span aria-hidden="true">↗</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
