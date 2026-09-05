import { describe, expect, it } from 'vitest';
import {
  addLocalDays,
  isValidLocalDate,
  localDaysBetween,
  parseLocalDateTime,
  toLocalDateString,
  toLocalTimeString,
} from '../../lib/time/warsaw';

describe('Warsaw-local time', () => {
  it('round-trips an ordinary restaurant time', () => {
    const result = parseLocalDateTime('2026-09-04', '19:30');
    expect(result.kind).toBe('exact');
    expect(toLocalDateString(result.instant)).toBe('2026-09-04');
    expect(toLocalTimeString(result.instant)).toBe('19:30');
  });

  it('recognises the spring DST gap and autumn repeated hour', () => {
    expect(parseLocalDateTime('2026-03-29', '02:30').kind).toBe('skipped');
    expect(parseLocalDateTime('2026-10-25', '02:30').kind).toBe('ambiguous');
  });

  it('does calendar arithmetic without DST drift', () => {
    expect(addLocalDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(localDaysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(isValidLocalDate('2026-02-29')).toBe(false);
    expect(isValidLocalDate('2028-02-29')).toBe(true);
  });
});
