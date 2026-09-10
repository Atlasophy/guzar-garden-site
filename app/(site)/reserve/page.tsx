import type { Metadata } from 'next';
import { BookingFlow } from '@/components/reservation/booking-flow';
import { SiteFooter } from '@/components/shared/site-footer';
import { SiteHeader } from '@/components/shared/site-header';
import { isSmsEnabled, publicEnv } from '@/lib/config/env';
import { toLocalDateString } from '@/lib/time/warsaw';
import { getPublicVenueInfo } from '@/lib/venue/public-info';

export const metadata: Metadata = {
  title: 'Rezerwacja stolika',
  description: 'Zarezerwuj stolik w Guzar Garden w Warszawie.',
  alternates: { canonical: '/reserve' },
};

export const dynamic = 'force-dynamic';

export default async function ReservePage() {
  const venue = await getPublicVenueInfo(publicEnv.venueSlug).catch(() => null);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <SiteHeader variant="emerald" />
      <main className="book" id="main-content">
        <div className="wrap">
          <header className="book-head">
            <p className="eyebrow">Guzar Garden</p>
            <h1>Rezerwacja stolika</h1>
            <p className="lede">Wybierz termin i stolik. Rezerwacja zajmuje tylko chwilę.</p>
          </header>
          <BookingFlow
            initialDate={toLocalDateString(new Date())}
            maxPartySize={venue?.policy.maxOnlinePartySize ?? 12}
            bookingHorizonDays={venue?.policy.bookingHorizonDays ?? 90}
            smsEnabled={isSmsEnabled()}
          />
        </div>
      </main>
      <SiteFooter variant="emerald" />
    </>
  );
}
