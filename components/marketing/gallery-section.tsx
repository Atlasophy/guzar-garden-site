'use client';

import Image from 'next/image';
import { useLocale } from '@/components/shared/locale-provider';
import { OrnamentDivider } from '@/components/shared/icons';

const GALLERY_IMAGES = Array.from(
  { length: 12 },
  (_, index) => `/assets/gallery/atmosphere-${String(index + 1).padStart(2, '0')}.webp`,
);

export function GallerySection() {
  const { dictionary } = useLocale();
  const t = dictionary.gallery;

  return (
    <section className="sec gallery-section" id="gallery">
      <div className="atmo" aria-hidden="true">
        <div className="atmo-layer atmo-static" />
      </div>

      <div className="wrap">
        <header className="gallery-head">
          <p className="eyebrow rv">{t.eyebrow}</p>
          <h2 className="rv" style={{ '--d': '.06s' } as React.CSSProperties}>
            {t.heading}
          </h2>
          <OrnamentDivider className="orn center rv" />
          <p className="lede rv" style={{ '--d': '.18s' } as React.CSSProperties}>
            {t.lede}
          </p>
        </header>

        <div className="gallery-grid">
          {GALLERY_IMAGES.map((src, index) => (
            <figure
              className={`gallery-photo gallery-photo-${index + 1} rv`}
              style={{ '--d': `${(index % 4) * 0.06}s` } as React.CSSProperties}
              key={src}
            >
              <Image
                src={src}
                alt={`${t.imageAlt} ${index + 1}`}
                width={1600}
                height={1200}
                sizes="(max-width: 700px) 92vw, (max-width: 1000px) 46vw, 32vw"
                style={{ width: '100%', height: '100%' }}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
