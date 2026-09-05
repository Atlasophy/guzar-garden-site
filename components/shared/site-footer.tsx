'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from './locale-provider';
import { SITE, TEL_HREF } from './site-config';
import {
  ExternalArrowIcon,
  FacebookIcon,
  InstagramIcon,
  PhoneIcon,
  TripAdvisorIcon,
} from './icons';

/**
 * The footer, in both of the site's two dresses.
 *
 * The emerald footer is the full three-column one from the landing page; the
 * cream one is the compact strip the menu carried. They were separate blocks of
 * markup before, which is why the two had already fallen out of step on the
 * telephone number and the opening hours.
 */

export function SiteFooter({ variant }: { variant: 'emerald' | 'cream' }) {
  const { dictionary } = useLocale();
  const year = new Date().getFullYear();

  if (variant === 'cream') {
    return (
      <footer>
        <div className="atmo" aria-hidden="true">
          <div
            className="atmo-layer atmo-static"
            style={{ bottom: '-14vh', right: '-10vh', color: 'var(--green-3)' }}
          />
        </div>
        <div className="wrap">
          <div className="foot-in">
            <div>
              <div className="menu-foot-logo">
                <Image
                  src="/assets/brand/guzar-full-transparent.png"
                  alt="Guzar Garden — est. 2024"
                  width={1280}
                  height={1280}
                />
              </div>
              <p>
                {SITE.addressLine}, {SITE.city} · 9:00 – 24:00 {dictionary.about.statEveryDay}
              </p>
            </div>
            <p>
              <a href={TEL_HREF}>{SITE.phoneDisplay}</a>
              <br />
              <Link href="/reserve" style={{ display: 'inline-block', marginTop: '.4rem' }}>
                {dictionary.footer.bookLink}
              </Link>
              <br />
              <a
                href={SITE.tripadvisor}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.35rem',
                  marginTop: '.4rem',
                }}
              >
                TripAdvisor
                <ExternalArrowIcon size={11} />
                <span>{dictionary.footer.seeReviews}</span>
              </a>
            </p>
          </div>
          <div className="colophon">
            <span>© {year} Guzar Garden</span>
            <Link href="/privacy">{dictionary.footer.privacy}</Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer id="kontakt">
      <div className="atmo" aria-hidden="true">
        <div className="atmo-layer atmo-static" />
      </div>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="foot-sign" aria-label="Guzar Garden — est. 2024">
              <span className="foot-emblem" aria-hidden="true">
                <Image
                  src="/assets/brand/guzar-mark-transparent.png"
                  alt=""
                  width={364}
                  height={364}
                />
              </span>
              <span className="foot-word">
                <strong>GUZAR GARDEN</strong>
                <small>EST. {SITE.established} · WARSAW</small>
              </span>
            </div>
            <p>{dictionary.footer.tagline}</p>
            <div className="socials">
              <a href={SITE.instagram} target="_blank" rel="noopener" aria-label="Instagram">
                <InstagramIcon />
              </a>
              <a href={SITE.facebook} target="_blank" rel="noopener" aria-label="Facebook">
                <FacebookIcon />
              </a>
              <a
                href={SITE.tripadvisor}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TripAdvisor"
              >
                <TripAdvisorIcon />
              </a>
              <a href={TEL_HREF} aria-label={dictionary.footer.contactHeading}>
                <PhoneIcon />
              </a>
            </div>
          </div>

          <div>
            <h5>{dictionary.footer.hoursHeading}</h5>
            <ul>
              <li>{dictionary.footer.everyDay}</li>
              <li
                style={{
                  color: 'var(--gold-hi)',
                  fontFamily: 'var(--serif)',
                  fontSize: '1.45rem',
                  letterSpacing: '.04em',
                }}
              >
                9:00 – 24:00
              </li>
              <li>{dictionary.footer.meals}</li>
            </ul>
          </div>

          <div>
            <h5>{dictionary.footer.contactHeading}</h5>
            <ul>
              <li>
                <a href={TEL_HREF}>{SITE.phoneDisplay}</a>
              </li>
              <li>
                <a href={SITE.mapsPlace} target="_blank" rel="noopener">
                  {SITE.addressLine}
                  <br />
                  {SITE.postalCode} {SITE.city}
                </a>
              </li>
              <li>
                <Link href="/reserve">{dictionary.footer.bookLink}</Link>
              </li>
              <li>
                <Link href="/menu">{dictionary.footer.menuLink}</Link>
              </li>
              <li>
                <a href={SITE.instagram} target="_blank" rel="noopener">
                  {SITE.instagramHandle}
                </a>
              </li>
              <li>
                <a
                  href={SITE.tripadvisor}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}
                >
                  TripAdvisor
                  <ExternalArrowIcon />
                  <span>{dictionary.footer.seeReviews}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="colophon">
          <span>
            © <span id="yr">{year}</span> Guzar Garden · {dictionary.footer.allRights}
          </span>
          <Link href="/privacy">{dictionary.footer.privacy}</Link>
        </div>
      </div>
    </footer>
  );
}
