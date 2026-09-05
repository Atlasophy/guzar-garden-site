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

  it('searches across accents, apostrophes and aliases', () => {
    const items = [
      { id: '1', haystack: buildHaystack(['Szaszłyk jagnięcy', 'lamb skewer']) },
      { id: '2', haystack: buildHaystack(["O'zbek palov", 'pilaf']) },
    ];
    expect(matchesQuery(items[0]!.haystack, 'szaszlyk lamb')).toBe(true);
    expect(searchItems(items, 'ozbek')).toEqual([items[1]]);
  });
});
