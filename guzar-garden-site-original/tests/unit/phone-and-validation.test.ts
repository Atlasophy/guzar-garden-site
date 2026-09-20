import { describe, expect, it } from 'vitest';
import { isE164, normalizePhone } from '../../lib/validation/phone';
import { guestDetailsSchema, priceSchema } from '../../lib/validation/schemas';

describe('guest input validation', () => {
  it('normalises Polish and international phone spellings', () => {
    expect(normalizePhone('570 088 888').e164).toBe('+48570088888');
    expect(normalizePhone('0048 570-088-888').e164).toBe('+48570088888');
    expect(isE164('+48570088888')).toBe(true);
  });

  it('rejects invalid phone numbers and missing privacy consent', () => {
    expect(normalizePhone('123').ok).toBe(false);
    const result = guestDetailsSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Nowak',
      phone: '570 088 888',
      partySize: 2,
      locale: 'pl',
      privacyAccepted: false,
    });
    expect(result.success).toBe(false);
  });

  it('keeps menu prices exact as decimal strings', () => {
    expect(priceSchema.parse('26,9')).toBe('26.90');
    expect(priceSchema.safeParse('12.999').success).toBe(false);
  });
});
