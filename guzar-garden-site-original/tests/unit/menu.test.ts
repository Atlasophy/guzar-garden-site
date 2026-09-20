import { describe, expect, it } from 'vitest';
import {
  comparePrice,
  formatPrice,
  fromMinorUnits,
  minPrice,
  toMinorUnits,
} from '../../lib/menu/price';
import { buildHaystack, matchesQuery, searchItems } from '../../lib/menu/search';

describe('menu helpers', () => {
  it('formats and compares prices without floating-point arithmetic', () => {
    expect(formatPrice('26.99', 'PLN', 'pl')).toBe('26,99 zł');
    expect(formatPrice('8.00', 'PLN', 'en')).toBe('8 zł');
    expect(comparePrice('9.99', '10.00')).toBeLessThan(0);
    expect(minPrice([null, '12.50', '8.00'])).toBe('8.00');
    expect(toMinorUnits('26.99')).toBe(2699);
    expect(fromMinorUnits(2699)).toBe('26.99');
  });

  /**
   * Regression: PostgREST serialises numeric as a JSON number, so supabase-js
   * handed the repository 29 and 12.99 as floats while node-postgres — which
   * both the unit and integration suites used — handed it strings. minPrice()
   * called .replace() on a number, threw inside the server component, and the
   * whole menu rendered as "temporarily unavailable" in every locale.
   */
  it('accepts prices as numbers, the way supabase-js delivers numeric', () => {
    expect(minPrice([29, 12.99, null])).toBe('12.99');
    expect(minPrice([29])).toBe('29.00');
    expect(comparePrice(9.99, '10.00')).toBeLessThan(0);
    expect(comparePrice(29, 29)).toBe(0);
    expect(toMinorUnits(26.99)).toBe(2699);
    expect(formatPrice(29 as unknown as string, 'PLN', 'pl')).toBe('29 zł');
  });

  it('sorts an unparseable price with the unknowns instead of throwing', () => {
    expect(() => comparePrice('n/a', '10.00')).not.toThrow();
    expect(comparePrice('n/a', '10.00')).toBeGreaterThan(0);
    expect(minPrice(['n/a', '10.00'])).toBe('10.00');
  });

  it('searches across accents, apostrophes and aliases', () => {
    const items = [
      { id: '1', haystack: buildHaystack(['Szaszłyk jagnięcy', 'lamb skewer']) },
      { id: '2', haystack: buildHaystack(["O'zbek palov", 'pilaf']) },
    ];
    expect(matchesQuery(items[0]!.haystack, 'szaszlyk lamb')).toBe(true);
    expect(searchItems(items, 'ozbek')).toEqual([items[1]]);
  });
});
