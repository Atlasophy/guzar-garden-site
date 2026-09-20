'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/shared/locale-provider';
import { toZonedParts, RESTAURANT_TIMEZONE } from '@/lib/time/warsaw';
import type { PublicHours } from '@/lib/venue/public-info';

/**
 * "Open now" and the week's hours.
 *
 * Both are computed in the restaurant's own timezone, from the venue's real
 * opening hours, using the visitor's absolute clock. A guest reading this from
 * Tashkent should be told whether *Warsaw* is open, not whether it is late where
 * they are — and the old page's `new Date().getHours()` gave them the wrong
 * answer by three hours.
 *
 * The status starts as unknown and settles on mount, so the server-rendered
 * HTML and the first client render agree.
 */

function isOpenNow(hours: PublicHours[], now: Date): boolean {
  const parts = toZonedParts(now, RESTAURANT_TIMEZONE);
  const minutes = parts.hour * 60 + parts.minute;
  const yesterday = (parts.weekday + 6) % 7;

  const toMinutes = (value: string) => {
    const [h = '0', m = '0'] = value.split(':');
    return Number(h) * 60 + Number(m);
  };

  for (const window of hours) {
    const opens = toMinutes(window.opensAt);
    const closes = toMinutes(window.closesAt);

    if (window.weekday === parts.weekday) {
      // A window that closes at 24:00 or wraps past midnight covers the rest of
      // today; the tail of it is handled by yesterday's row below.
      const effectiveClose = closes <= opens ? 24 * 60 : closes;
      if (minutes >= opens && minutes < effectiveClose) return true;
    }

    if (window.weekday === yesterday && closes <= opens) {
      // Yesterday's service ran past midnight into today.
      if (minutes < closes) return true;
    }
  }
  return false;
}

export function OpeningStatus({ hours }: { hours: PublicHours[] }) {
  const { dictionary } = useLocale();
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOpen(isOpenNow(hours, new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [hours]);

  return (
    <span className="status" id="status">
      <span className={`dot${open ? ' open' : ''}`} id="statusDot" aria-hidden="true" />
      <span id="statusTxt">
        {open === null ? '—' : open ? dictionary.hero.statusOpen : dictionary.hero.statusClosed}
      </span>
    </span>
  );
}

/** The seven-row list under "Opening hours", with today picked out. */
export function OpeningHoursList({ hours }: { hours: PublicHours[] }) {
  const { dictionary } = useLocale();
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    setToday(toZonedParts(new Date(), RESTAURANT_TIMEZONE).weekday);
  }, []);

  const byWeekday = new Map<number, PublicHours[]>();
  for (const row of hours) {
    const list = byWeekday.get(row.weekday) ?? [];
    list.push(row);
    byWeekday.set(row.weekday, list);
  }

  return (
    <ul className="hours" id="hours">
      {dictionary.days.map((day, weekday) => {
        const windows = byWeekday.get(weekday) ?? [];
        return (
          <li key={day} className={weekday === today ? 'today' : undefined}>
            <span>{day}</span>
            <b>
              {windows.length === 0
                ? dictionary.reserve.closedThatDay
                : windows.map((w) => `${w.opensAt} – ${w.closesAt}`).join(', ')}
            </b>
          </li>
        );
      })}
    </ul>
  );
}
