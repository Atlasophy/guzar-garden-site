/**
 * Slot generation — pure, so it can be reasoned about and tested on its own.
 *
 * Everything here works in absolute instants. The awkward part of a restaurant
 * calendar (what "open until midnight" means on the night the clocks change) has
 * already been settled by `gg_service_windows` in the database, which uses
 * PostgreSQL's own timezone rules. By the time a window reaches this file it is
 * a pair of instants, and stepping through it is plain arithmetic that cannot go
 * wrong twice a year.
 */

export interface ServiceWindow {
  start: Date;
  end: Date;
}

export interface SlotRules {
  /** Gap between offered times, minutes. */
  intervalMinutes: number;
  /** How long the sitting is, minutes. Excludes the turnaround. */
  durationMinutes: number;
  /** Earliest a booking may start, relative to `now`. */
  minNoticeMinutes: number;
  /** Furthest ahead a booking may start, in days. */
  bookingHorizonDays: number;
  /** Server time. Passed in rather than read, so tests are not clock-dependent. */
  now: Date;
}

export interface Slot {
  /** When the sitting starts. */
  startsAt: Date;
  /** When the guest's table time ends (turnaround is added separately). */
  endsAt: Date;
}

const MINUTE_MS = 60_000;

/**
 * Times that fit inside a service window and satisfy the booking policy.
 *
 * A slot is only offered when the *whole* sitting fits: 22:30 is not offered for
 * a two-hour dinner in a kitchen that shuts at midnight, because the table would
 * have to be cleared before the guest has finished. Whether the restaurant would
 * rather sell a shorter late sitting is a policy question, and the answer lives
 * in `reservation_settings.default_duration_minutes`.
 */
export function generateSlots(windows: ServiceWindow[], rules: SlotRules): Slot[] {
  const { intervalMinutes, durationMinutes, minNoticeMinutes, bookingHorizonDays, now } = rules;

  if (intervalMinutes <= 0 || durationMinutes <= 0) return [];

  const earliest = now.getTime() + minNoticeMinutes * MINUTE_MS;
  const latest = now.getTime() + bookingHorizonDays * 24 * 60 * MINUTE_MS;
  const step = intervalMinutes * MINUTE_MS;
  const duration = durationMinutes * MINUTE_MS;

  const slots: Slot[] = [];
  const seen = new Set<number>();

  for (const window of windows) {
    const windowStart = window.start.getTime();
    const windowEnd = window.end.getTime();
    if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) continue;
    if (windowEnd <= windowStart) continue;

    // Align the first candidate to the interval grid measured from the window's
    // own opening, so a venue opening at 09:00 offers 09:00, 09:15, 09:30 rather
    // than something anchored to an arbitrary epoch.
    for (let t = windowStart; t + duration <= windowEnd; t += step) {
      if (t < earliest) continue;
      if (t > latest) break;
      if (seen.has(t)) continue;
      seen.add(t);
      slots.push({ startsAt: new Date(t), endsAt: new Date(t + duration) });
    }
  }

  slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return slots;
}

/**
 * Is one particular instant a bookable start time?
 *
 * The write path asks this question of the database, not of this function; this
 * is for the UI, so a guest who deep-links to `?time=23:45` is told why rather
 * than being allowed to walk into a rejection three steps later.
 */
export function isSlotBookable(
  startsAt: Date,
  windows: ServiceWindow[],
  rules: SlotRules,
): { ok: true } | { ok: false; reason: 'too_soon' | 'beyond_horizon' | 'outside_opening_hours' } {
  const start = startsAt.getTime();
  const end = start + rules.durationMinutes * MINUTE_MS;

  if (start < rules.now.getTime() + rules.minNoticeMinutes * MINUTE_MS) {
    return { ok: false, reason: 'too_soon' };
  }
  if (start > rules.now.getTime() + rules.bookingHorizonDays * 24 * 60 * MINUTE_MS) {
    return { ok: false, reason: 'beyond_horizon' };
  }
  const covered = windows.some((w) => start >= w.start.getTime() && end <= w.end.getTime());
  return covered ? { ok: true } : { ok: false, reason: 'outside_opening_hours' };
}

/** Occupancy end for a sitting: the guest's end plus the turnaround. */
export function occupancyEnd(
  startsAt: Date,
  durationMinutes: number,
  turnaroundMinutes: number,
): Date {
  return new Date(startsAt.getTime() + (durationMinutes + turnaroundMinutes) * MINUTE_MS);
}

/**
 * Do two half-open intervals overlap?
 *
 * Mirrors the database's `tstzrange(starts_at, ends_at, '[)')` exactly: a
 * sitting that ends at 20:00 and one that starts at 20:00 do not collide. Used
 * by the staff timeline to lay blocks out; the booking decision is always the
 * database's.
 */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
