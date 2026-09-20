'use client';

import { useEffect } from 'react';

/**
 * The landing page's motion, carried over from the inline controller that used
 * to sit at the bottom of index.html.
 *
 * It is one effect rather than five hooks scattered through the tree because
 * every part of it works the same way: find the elements the CSS already knows
 * about, watch the scroll position once, and write a class or a custom property.
 * Pulling that into per-component state would mean five scroll listeners and a
 * React re-render for something the compositor should be doing on its own.
 *
 * Everything here is a no-op under `prefers-reduced-motion`, and everything here
 * is decoration: with JavaScript off, the `.js` class never lands, `.rv`
 * elements are never hidden in the first place, and the page reads in full.
 */
export function PageEffects() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- reveals ----------------------------------------------------------
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    const observeAll = () => {
      for (const element of document.querySelectorAll('.rv:not(.in)')) {
        observer.observe(element);
      }
    };
    observeAll();

    /*
     * Safety net. IntersectionObserver does not fire while a tab is hidden, so
     * a page restored into a background tab could otherwise sit at opacity 0
     * forever. This reveals anything that has reached the viewport by any other
     * means, and runs off the scroll handler, a first timer and visibilitychange.
     */
    const revealVisible = () => {
      const height = window.innerHeight;
      for (const element of document.querySelectorAll('.rv:not(.in)')) {
        if (element.getBoundingClientRect().top < height * 0.94) {
          element.classList.add('in');
          observer.unobserve(element);
        }
      }
    };
    const firstSweep = window.setTimeout(revealVisible, 1200);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') revealVisible();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // ---- split the wordmark into per-word spans ---------------------------
    // The spans stay `display:inline` on purpose: an inline-block here takes the
    // letters out of the gradient's text clip and the gold title vanishes.
    for (const heading of document.querySelectorAll<HTMLElement>('[data-split]')) {
      if (heading.dataset.splitDone === '1') continue;
      heading.dataset.splitDone = '1';

      const walk = (node: Node) => {
        for (const child of [...node.childNodes]) {
          if (child.nodeType === Node.TEXT_NODE) {
            const fragment = document.createDocumentFragment();
            for (const word of (child.textContent ?? '').split(/(\s+)/)) {
              if (!word.trim()) {
                fragment.appendChild(document.createTextNode(word));
                continue;
              }
              const span = document.createElement('span');
              span.className = 'sw';
              const inner = document.createElement('i');
              inner.textContent = word;
              span.appendChild(inner);
              fragment.appendChild(span);
            }
            child.parentNode?.replaceChild(fragment, child);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            walk(child);
          }
        }
      };
      walk(heading);

      const words = heading.querySelectorAll<HTMLElement>('.sw');
      words.forEach((word, index) => {
        word.style.setProperty('--d', `${(0.28 + index * 0.09).toFixed(2)}s`);
      });
      const headingObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              words.forEach((word) => word.classList.add('in'));
              headingObserver.disconnect();
            }
          }
        },
        { threshold: 0.2 },
      );
      headingObserver.observe(heading);
    }

    // ---- counters ---------------------------------------------------------
    const runCounter = (element: HTMLElement) => {
      const target = Number.parseFloat(element.dataset.count ?? '0');
      const suffix = element.dataset.suffix ?? '';
      const decimals = target % 1 !== 0 ? 1 : 0;
      const start = performance.now();
      const duration = 1400;
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        element.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const counterObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!reduced) runCounter(entry.target as HTMLElement);
          counterObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.6 },
    );
    for (const element of document.querySelectorAll('[data-count]')) {
      counterObserver.observe(element);
    }

    // ---- atmosphere, hero lift, magnetic buttons --------------------------
    /*
     * Each ornament moves against its OWN section's position in the viewport,
     * never against raw page scroll — a layer inside the footer must not see the
     * thousands of pixels the hero accumulated by the time you reach it.
     * `progress` is -1..1, so displacement is hard-capped regardless of how far
     * or how fast the page scrolls.
     */
    const layers = [...document.querySelectorAll<HTMLElement>('.atmo-layer')];
    const RANGE_PX = 22;
    const POINTER_PX = 10;
    let pointerX = 0;
    let pointerY = 0;

    const applyAtmo = () => {
      const viewportHeight = window.innerHeight;
      for (const layer of layers) {
        const depth = Number.parseFloat(layer.dataset.depth ?? '0');
        if (!depth) continue;
        const host = layer.closest('section,footer') ?? layer.parentElement;
        if (!host) continue;
        const rect = host.getBoundingClientRect();
        let progress =
          (rect.top + rect.height / 2 - viewportHeight / 2) / (viewportHeight / 2 + rect.height / 2);
        progress = Math.max(-1, Math.min(1, progress));
        const y = progress * RANGE_PX * depth + pointerY * POINTER_PX * depth * 0.6;
        const x = pointerX * POINTER_PX * depth;
        layer.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      }
    };

    const applyHeroScroll = () => {
      const stage = document.getElementById('brandStage');
      const hero = document.getElementById('top');
      if (!stage || !hero) return;
      const rect = hero.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -rect.top / Math.max(rect.height, 1)));
      stage.style.setProperty('--stage-lift', `${(p * -24).toFixed(1)}px`);
      stage.style.setProperty('--stage-turn', `${(p * 1.8).toFixed(2)}deg`);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (!reduced) {
          applyAtmo();
          applyHeroScroll();
        }
        revealVisible();
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const cleanups: (() => void)[] = [];

    if (!reduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      const hero = document.getElementById('top');
      const stage = document.getElementById('brandStage');
      if (hero) {
        const onMove = (event: MouseEvent) => {
          const rect = hero.getBoundingClientRect();
          pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
          pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
          requestAnimationFrame(applyAtmo);
          if (stage) {
            stage.style.setProperty('--tilt-y', `${(pointerX * 1.7).toFixed(2)}deg`);
            stage.style.setProperty('--tilt-x', `${(pointerY * -1.45).toFixed(2)}deg`);
          }
        };
        const onLeave = () => {
          pointerX = 0;
          pointerY = 0;
          requestAnimationFrame(applyAtmo);
          stage?.style.setProperty('--tilt-y', '0deg');
          stage?.style.setProperty('--tilt-x', '0deg');
        };
        hero.addEventListener('mousemove', onMove);
        hero.addEventListener('mouseleave', onLeave);
        cleanups.push(() => {
          hero.removeEventListener('mousemove', onMove);
          hero.removeEventListener('mouseleave', onLeave);
        });
      }
    }

    if (!reduced && window.matchMedia('(hover:hover)').matches) {
      for (const button of document.querySelectorAll<HTMLElement>('.btn')) {
        const onMove = (event: MouseEvent) => {
          const rect = button.getBoundingClientRect();
          const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
          const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
          button.style.transform = `translate(${(dx * 8).toFixed(1)}px,${(dy * 6).toFixed(1)}px)`;
        };
        const onLeave = () => {
          button.style.transform = '';
        };
        button.addEventListener('mousemove', onMove);
        button.addEventListener('mouseleave', onLeave);
        cleanups.push(() => {
          button.removeEventListener('mousemove', onMove);
          button.removeEventListener('mouseleave', onLeave);
        });
      }
    }

    return () => {
      observer.disconnect();
      counterObserver.disconnect();
      window.clearTimeout(firstSweep);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('scroll', onScroll);
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}
