'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/components/shared/locale-provider';
import { TEL_HREF } from '@/components/shared/site-config';
import styles from './hero.module.css';

/**
 * The landing screen: the neon sign on the garden wall and the three things a
 * guest came to do. Nothing else.
 *
 * The photograph is the page's h1 — the sign *is* the name — and it is masked
 * into the emerald above and below so it has no edges.
 */
export function Hero() {
  const { dictionary } = useLocale();
  const t = dictionary.hero;
  return (
    <section className={styles.hero} id="top" aria-labelledby="hero-title">
      <h1 id="hero-title" className={styles.sign}>
        <Image
          src="/assets/brand/guzar-wall-sign.jpg"
          alt="Guzar Garden — est. 2024"
          width={2048}
          height={871}
          sizes="100vw"
          priority
        />
      </h1>
      <div className={styles.actions}>
        <Link href="/reserve" className={styles.primary}>
          {t.ctaBook}
        </Link>
        <a href={TEL_HREF} className={styles.secondary}>
          {t.ctaCall}
        </a>
        <Link href="/menu" className={styles.secondary}>
          {t.ctaMenu}
        </Link>
      </div>
    </section>
  );
}
