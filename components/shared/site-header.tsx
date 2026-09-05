'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocale } from './locale-provider';
import { LanguageSwitcher } from './language-switcher';
import { SITE, TEL_HREF } from './site-config';

/**
 * The navigation bar, shared by every public page.
 *
 * It was duplicated between index.html and menu.html, which is how the two
 * copies had already drifted apart. One component, two themes: `variant`
 * chooses which class names the original stylesheets expect and which links the
 * page needs (the landing page scrolls to anchors, every other page navigates
 * back to them).
 *
 * The reservation CTA now points at `/reserve` rather than at `tel:`, and the
 * telephone number keeps its own place in the header and the footer — booking
 * online is the new default, not the only way in.
 */

export type HeaderVariant = 'emerald' | 'cream';

export interface SiteHeaderProps {
  variant: HeaderVariant;
  /** True on the landing page, where the section links are same-page anchors. */
  anchorsAreLocal?: boolean;
  /** The landing page draws a scroll-progress hairline under the bar. */
  showProgress?: boolean;
}

export function SiteHeader({
  variant,
  anchorsAreLocal = false,
  showProgress = false,
}: SiteHeaderProps) {
  const { dictionary } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [progress, setProgress] = useState(0);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const linksId = useId();

  const href = useCallback(
    (anchor: string) => (anchorsAreLocal ? `#${anchor}` : `/#${anchor}`),
    [anchorsAreLocal],
  );

  // Scroll state: the bar goes solid past 40px and the hairline tracks how far
  // down the document you are. Both are read off one rAF-throttled listener.
  useEffect(() => {
    if (variant !== 'emerald') return;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setSolid(y > 40);
        if (showProgress) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          setProgress(max > 0 ? (y / max) * 100 : 0);
        }
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [variant, showProgress]);

  // Escape closes the mobile menu and returns focus to the control that opened
  // it, so a keyboard user is never left adrift at the top of the document.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const nav = dictionary.nav;

  return (
    <header className={`nav${solid ? ' solid' : ''}`} id="nav">
      <Link className="brand" href={anchorsAreLocal ? '#top' : '/'}>
        <span className={variant === 'cream' ? 'm brand-mark' : 'brand-mark'}>
          <Image
            src="/assets/brand/guzar-mark-transparent.png"
            alt=""
            width={364}
            height={364}
            priority
          />
        </span>
        <span>
          <b>GUZAR</b>
          <i>{nav.brandTagline}</i>
        </span>
      </Link>

      <nav
        className={`links${menuOpen ? ' open' : ''}`}
        id={linksId}
        onClick={(event) => {
          if ((event.target as HTMLElement).tagName === 'A') setMenuOpen(false);
        }}
      >
        <Link href={href('o-nas')}>{nav.about}</Link>
        <Link href={href('kuchnia')}>{nav.cuisine}</Link>
        {variant === 'emerald' ? <Link href="/menu">{nav.menu}</Link> : null}
        <Link href={href('gallery')}>{nav.gallery}</Link>
        <Link href={href('miejsce')}>{nav.venue}</Link>
        <Link href={href('kontakt')}>{nav.contact}</Link>
        <Link className="btn nav-cta-mobile" href="/reserve">
          <span>{nav.book}</span>
        </Link>
      </nav>

      <div className="nav-tools">
        <LanguageSwitcher />
        <Link className="btn nav-cta" href="/reserve">
          <span>{nav.book}</span>
        </Link>
        <button
          className="burger"
          id="burger"
          ref={burgerRef}
          type="button"
          aria-label={nav.openMenu}
          aria-controls={linksId}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {nav.openMenu}
        </button>
      </div>

      {showProgress ? (
        <div className="progress" id="progress" style={{ width: `${progress}%` }} />
      ) : null}
      {/* The telephone number stays reachable from the bar itself on wide
          screens — booking online is the default, not a replacement. */}
      <a className="sr-only" href={TEL_HREF}>
        {SITE.phoneDisplay}
      </a>
    </header>
  );
}
