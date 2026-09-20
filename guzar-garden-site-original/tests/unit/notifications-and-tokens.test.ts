import { describe, expect, it } from 'vitest';
import { estimateSegments, renderConfirmation } from '../../lib/notifications/templates';
import { DisabledSmsProvider } from '../../lib/notifications/disabled-provider';
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

  /**
   * The venue launched without a Twilio account. The disabled adapter has to
   * refuse permanently rather than report a success nobody delivered — and it
   * must be non-retryable, so switching Twilio on later cannot flush a backlog
   * of stale confirmations at guests whose dinner already happened.
   */
  it('refuses permanently when the venue has no SMS channel', async () => {
    const provider = new DisabledSmsProvider();
    const result = await provider.sendReservationConfirmation({
      to: '+48570088888',
      locale: 'pl',
      guestFirstName: 'Ada',
      venueName: 'Guzar Garden',
      venuePhone: '+48 570 088 888',
      localDate: '11 wrz',
      localTime: '19:00',
      partySize: 2,
      confirmationCode: 'GG-ABC123',
    });

    expect(provider.name).toBe('disabled');
    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error).toBe('sms_disabled');
    // The body is still rendered, so staff can read what the guest was not told.
    expect(result.body).toContain('GG-ABC123');
  });

  it('mints URL-safe tokens with a constant-time comparison helper', () => {
    const token = generateToken();
    expect(looksLikeToken(token)).toBe(true);
    expect(generateIdempotencyKey()).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(tokensMatch('same-digest', 'same-digest')).toBe(true);
    expect(tokensMatch('short', 'different')).toBe(false);
  });
});
