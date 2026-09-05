/**
 * Warsaw-local time.
 *
 * Everything is stored as `timestamptz` (an absolute instant) and everything is
 * *reasoned about* in the restaurant's own timezone. The guest's device clock
 * never decides anything: someone booking from Tashkent picks 19:00 in Warsaw,
 * not 19:00 wherever they are.
 *
 * Conversion goes through the platform's IANA database via `Intl`, so there is
 * no hardcoded "+1 in winter, +2 in summer" to rot when the rules change.
 *
 * The two awkward hours of the year are handled explicitly rather than silently:
 *
 *   Spring forward — 02:00 → 03:00 on the last Sunday of March. 02:30 does not
 *   exist. `zonedTimeToInstant` reports `skipped` and points at the first real
 *   instant after the gap.
 *
 *   Fall back — 03:00 → 02:00 on the last Sunday of October. 02:30 happens
 *   twice. It reports `ambiguous` and resolves to the *first* (still in summer
 *   time), which is what a guest reading "02:30" on a booking page means.
 */

export const RESTAURANT_TIMEZONE = 'Europe/Warsaw';

export type LocaleCode = 'pl' | 'en' | 'ru' | 'uz';

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  /** 0 = Monday … 6 = Sunday, matching `business_hours.weekday`. */
  weekday: number;
}

export type ResolutionKind = 'exact' | 'ambiguous' | 'skipped';

export interface ZonedResolution {
  instant: Date;
  kind: ResolutionKind;
}

const PART_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function partFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = PART_FORMATTER_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    PART_FORMATTER_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Break an instant into its wall-clock parts in the restaurant's timezone. */
export function toZonedParts(instant: Date, timeZone = RESTAURANT_TIMEZONE): ZonedParts {
  const parts = partFormatter(timeZone).formatToParts(instant);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') lookup[part.type] = part.value;
  }
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
    weekday: WEEKDAY_INDEX[lookup.weekday ?? 'Mon'] ?? 0,
  };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds. */
export function zoneOffsetMs(instant: Date, timeZone = RESTAURANT_TIMEZONE): number {
  const p = toZonedParts(instant, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Milliseconds are not in the formatted parts; add them back so the offset is
  // a clean multiple of a minute rather than off by the instant's sub-second.
  return asIfUtc - (instant.getTime() - instant.getUTCMilliseconds());
}

/**
 * Warsaw wall-clock time → absolute instant.
 *
 * `kind` says whether that wall time is real, doubled or missing; see the note
 * at the top of the file for what each means and how it is resolved.
 */
export function zonedTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  second = 0,
  timeZone = RESTAURANT_TIMEZONE,
): ZonedResolution {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);

  // Probe both sides of the day. On a fall-back day the offset at `naive`
  // alone can happen to be the post-transition offset, hiding the first copy
  // of a repeated wall time. Trying the nearby offsets discovers both copies.
  const offsets = new Set(
    [-36, -12, 0, 12, 36].map((hours) =>
      zoneOffsetMs(new Date(naive + hours * 60 * 60 * 1000), timeZone),
    ),
  );
  const candidates = [...offsets]
    .map((offset) => new Date(naive - offset))
    .filter((candidate) => {
      const p = toZonedParts(candidate, timeZone);
      return (
        p.year === year &&
        p.month === month &&
        p.day === day &&
        p.hour === hour &&
        p.minute === minute &&
        p.second === second
      );
    })
    .sort((a, b) => a.getTime() - b.getTime());

  if (candidates.length === 0) {
    // The wall time does not exist — it fell in the spring-forward gap. The
    // useful answer preserves the entered minutes on the first valid hour.
    const laterOffset = zoneOffsetMs(new Date(naive + 36 * 60 * 60 * 1000), timeZone);
    return { instant: new Date(naive - laterOffset + 60 * 60 * 1000), kind: 'skipped' };
  }
  return { instant: candidates[0]!, kind: candidates.length > 1 ? 'ambiguous' : 'exact' };
}

/** Convenience wrapper over `zonedTimeToInstant` for "2026-09-04" + "19:30". */
export function parseLocalDateTime(
  localDate: string,
  localTime: string,
  timeZone = RESTAURANT_TIMEZONE,
): ZonedResolution {
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, minute] = localTime.split(':').map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour)
  ) {
    throw new RangeError(`Not a local date/time: ${localDate} ${localTime}`);
  }
  return zonedTimeToInstant(year, month, day, hour, minute ?? 0, 0, timeZone);
}

/** "2026-09-04" for the local calendar day an instant falls on. */
export function toLocalDateString(instant: Date, timeZone = RESTAURANT_TIMEZONE): string {
  const p = toZonedParts(instant, timeZone);
  return `${p.year.toString().padStart(4, '0')}-${p.month.toString().padStart(2, '0')}-${p.day
    .toString()
    .padStart(2, '0')}`;
}

/** "19:30" — 24-hour, which is what Poland reads. */
export function toLocalTimeString(instant: Date, timeZone = RESTAURANT_TIMEZONE): string {
  const p = toZonedParts(instant, timeZone);
  return `${p.hour.toString().padStart(2, '0')}:${p.minute.toString().padStart(2, '0')}`;
}

/** Midnight (local) at the start of the day `instant` falls on. */
export function startOfLocalDay(instant: Date, timeZone = RESTAURANT_TIMEZONE): Date {
  const p = toZonedParts(instant, timeZone);
  return zonedTimeToInstant(p.year, p.month, p.day, 0, 0, 0, timeZone).instant;
}

/** Add whole local days to a "YYYY-MM-DD" string without touching a timezone. */
export function addLocalDays(localDate: string, days: number): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return `${shifted.getUTCFullYear().toString().padStart(4, '0')}-${(shifted.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')}-${shifted.getUTCDate().toString().padStart(2, '0')}`;
}

/** Whole local days between two "YYYY-MM-DD" strings (b − a). */
export function localDaysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const msPerDay = 86_400_000;
  return Math.round((Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!)) / msPerDay);
}

const DATE_LOCALE: Record<LocaleCode, string> = {
  pl: 'pl-PL',
  en: 'en-GB',
  ru: 'ru-RU',
  uz: 'uz-UZ',
};

/** "czwartek, 4 września" — the long local date, in the guest's language. */
export function formatLocalDate(
  instant: Date,
  locale: LocaleCode,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' },
  timeZone = RESTAURANT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], { ...options, timeZone }).format(instant);
}

/** "19:30", always 24-hour, always Warsaw. */
export function formatLocalTime(
  instant: Date,
  _locale: LocaleCode = 'pl',
  timeZone = RESTAURANT_TIMEZONE,
): string {
  return toLocalTimeString(instant, timeZone);
}

/** Weekday index (0 = Monday) for a "YYYY-MM-DD" local date. */
export function localDateWeekday(localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  const jsDay = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

/** Is `localDate` a well-formed calendar date? */
export function isValidLocalDate(localDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return false;
  const [year, month, day] = localDate.split('-').map(Number);
  const probe = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month! - 1 &&
    probe.getUTCDate() === day
  );
}
