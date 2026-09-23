import { describe, expect, it } from 'vitest';
import { renderConfirmationEmail } from '../../lib/notifications/email/templates';
import { DisabledEmailProvider } from '../../lib/notifications/email/disabled-provider';

describe('email notifications', () => {
  it('renders a useful localized confirmation with escaped guest data', () => {
    const rendered = renderConfirmationEmail({
      to: 'ada@example.com',
      locale: 'en',
      guestFirstName: '<script>alert(1)</script>',
      venueName: 'Guzar Garden',
      venuePhone: '+48 570 088 888',
      venueAddress: 'al. Zieleniecka 6/8, 03-727 Warszawa',
      localDate: '4 September 2026',
      localTime: '19:30',
      partySize: 4,
      confirmationCode: 'GG-ABC123',
      tableCode: 'T08',
      manageUrl: 'https://example.com/manage/token',
    });

    expect(rendered.subject).toContain('Booking confirmed');
    expect(rendered.text).toContain('GG-ABC123');
    expect(rendered.text).toContain('Change or cancel');
    expect(rendered.html).toContain('GG-ABC123');
    expect(rendered.html).toContain('al. Zieleniecka');
    // The guest's own name must never reach the HTML unescaped.
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });

  /**
   * No real provider is wired up yet. The disabled adapter has to refuse
   * permanently rather than report a success nobody delivered, and it must be
   * non-retryable — mirrors DisabledSmsProvider's contract exactly.
   */
  it('refuses permanently when the venue has no email channel', async () => {
    const provider = new DisabledEmailProvider();
    const result = await provider.sendReservationConfirmation({
      to: 'ada@example.com',
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
    expect(result.error).toBe('email_disabled');
    // The body is still rendered, so staff can read what the guest was not told.
    expect(result.body).toContain('GG-ABC123');
  });
});
