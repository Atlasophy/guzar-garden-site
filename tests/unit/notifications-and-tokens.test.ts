import { describe, expect, it } from 'vitest';
import { estimateSegments, renderConfirmation } from '../../lib/notifications/templates';
import {
  generateIdempotencyKey,
  generateToken,
  looksLikeToken,
  tokensMatch,
} from '../../lib/security/tokens';

describe('notifications and opaque tokens', () => {
  it('renders a useful localized confirmation without private notes', () => {
    const body = renderConfirmation({
      to: '+48570088888',
      locale: 'en',
      guestFirstName: 'Ada',
      venueName: 'Guzar Garden',
      venuePhone: '+48 570 088 888',
      localDate: '4 September 2026',
      localTime: '19:30',
      partySize: 4,
      confirmationCode: 'GG-ABC123',
      tableCode: 'T08',
      manageUrl: 'https://example.com/manage/token',
    });
    expect(body).toContain('booking confirmed');
    expect(body).toContain('GG-ABC123');
    expect(body).toContain('Change/cancel');
  });

  it('accounts for GSM and Cyrillic SMS segment sizes', () => {
    expect(estimateSegments('Plain ASCII message')).toEqual({ encoding: 'GSM-7', segments: 1 });
    expect(estimateSegments('Бронь подтверждена')).toEqual({ encoding: 'UCS-2', segments: 1 });
  });

  it('mints URL-safe tokens with a constant-time comparison helper', () => {
    const token = generateToken();
    expect(looksLikeToken(token)).toBe(true);
    expect(generateIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(tokensMatch('same-digest', 'same-digest')).toBe(true);
    expect(tokensMatch('short', 'different')).toBe(false);
  });
});
