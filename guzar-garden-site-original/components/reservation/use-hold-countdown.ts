'use client';

import { useEffect, useState } from 'react';

/**
 * How long is left on the hold.
 *
 * Anchored to the server's clock, not the browser's. The API returns both
 * `expiresAt` and `serverNow`; the difference between them is the real
 * remaining time, and it is measured forward from the moment the response
 * arrived. A device whose clock is ten minutes fast would otherwise be told its
 * hold had already expired.
 *
 * `elapsed` uses `performance.now()`, which is monotonic — a laptop waking from
 * sleep or an NTP correction cannot make the countdown jump backwards.
 */

export interface HoldCountdown {
  /** Seconds left, floored at zero. */
  secondsLeft: number;
  /** "4:37" */
  formatted: string;
  expired: boolean;
  /** Under a minute — the UI leans on this to change tone. */
  urgent: boolean;
}

export function useHoldCountdown(
  expiresAt: string | null,
  serverNow: string | null,
): HoldCountdown {
  const [countdown, setCountdown] = useState<{ expiresAt: string | null; secondsLeft: number }>({
    expiresAt: null,
    secondsLeft: 0,
  });

  useEffect(() => {
    if (!expiresAt || !serverNow) {
      setCountdown({ expiresAt: null, secondsLeft: 0 });
      return;
    }

    const totalMs = new Date(expiresAt).getTime() - new Date(serverNow).getTime();
    const startedAt = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startedAt;
      setCountdown({
        expiresAt,
        secondsLeft: Math.max(0, Math.ceil((totalMs - elapsed) / 1000)),
      });
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, serverNow]);

  // A new hold first renders before its effect has ticked. The expiry key keeps
  // that transitional zero from being mistaken for an already-expired hold.
  const secondsLeft = countdown.expiresAt === expiresAt ? countdown.secondsLeft : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return {
    secondsLeft,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    expired: Boolean(expiresAt) && countdown.expiresAt === expiresAt && secondsLeft === 0,
    urgent: secondsLeft > 0 && secondsLeft <= 60,
  };
}
