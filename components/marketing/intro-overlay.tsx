'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * The opening frame: the full lockup on a dark ground, gone within two seconds.
 *
 * Two timers, exactly as the original had them — one that fires shortly after
 * `load`, and a hard 1.8s ceiling so a slow image never leaves a visitor
 * staring at a logo. Under `prefers-reduced-motion` it is dismissed on the
 * first frame, and it carries `aria-hidden` throughout: a screen-reader user is
 * already past it.
 */
export function IntroOverlay() {
  const [gone, setGone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dismiss = () => setGone(true);

    if (reduced) {
      dismiss();
      return;
    }

    let loadTimer: number | undefined;
    const onLoad = () => {
      loadTimer = window.setTimeout(dismiss, 650);
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);

    const ceiling = window.setTimeout(dismiss, 1800);
    return () => {
      window.removeEventListener('load', onLoad);
      if (loadTimer !== undefined) window.clearTimeout(loadTimer);
      window.clearTimeout(ceiling);
    };
  }, []);

  useEffect(() => {
    if (!gone) return;
    const timer = window.setTimeout(() => setRemoved(true), 600);
    return () => window.clearTimeout(timer);
  }, [gone]);

  if (removed) return null;

  return (
    <div className={`intro${gone ? ' gone' : ''}`} id="intro" aria-hidden="true">
      <div className="intro-logo">
        <Image
          src="/assets/brand/guzar-full-transparent.png"
          alt=""
          width={1280}
          height={1280}
          priority
        />
      </div>
      <span className="cap">Guzar Garden</span>
    </div>
  );
}
