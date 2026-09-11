import type { Metadata } from 'next';
import { BookingFlow } from '@/components/reservation/booking-flow';
import { SiteFooter } from '@/components/shared/site-footer';
import { SiteHeader } from '@/components/shared/site-header';
import { SITE, TEL_HREF } from '@/components/shared/site-config';
import { isSmsEnabled, publicEnv } from '@/lib/config/env';
import { reportSuppressed } from '@/lib/observability/suppressed';
import { toLocalDateString } from '@/lib/time/warsaw';
import { getPublicVenueInfo } from '@/lib/venue/public-info';

export const metadata: Metadata = {
  title: 'Rezerwacja stolika',
  description: 'Zarezerwuj stolik w Guzar Garden w Warszawie.',
  alternates: { canonical: '/reserve' },
};

export const dynamic = 'force-dynamic';

export default async function ReservePage() {
  let reservationsReady = true;
  let smsEnabled = false;

  try {
    smsEnabled = isSmsEnabled();
  } catch (error) {
    reservationsReady = false;
    reportSuppressed('reservations.configuration_unavailable', error);
  }

  const venue = reservationsReady
    ? await getPublicVenueInfo(publicEnv.venueSlug).catch(() => null)
    : null;

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
          {reservationsReady ? (
            <BookingFlow
              initialDate={toLocalDateString(new Date())}
              maxPartySize={venue?.policy.maxOnlinePartySize ?? 12}
              bookingHorizonDays={venue?.policy.bookingHorizonDays ?? 90}
              smsEnabled={smsEnabled}
            />
          ) : (
            <section className="panel" aria-labelledby="reservations-coming-soon">
              <p className="eyebrow">Rezerwacje telefoniczne</p>
              <h2 id="reservations-coming-soon">Rezerwacje online będą dostępne wkrótce</h2>
              <p>
                Do czasu uruchomienia systemu online zarezerwuj stolik telefonicznie. Chętnie
                pomożemy wybrać dogodny termin.
              </p>
              <a className="btn solid" href={TEL_HREF}>
                Zadzwoń: {SITE.phoneDisplay}
              </a>
            </section>
          )}
        </div>
      </main>
      <SiteFooter variant="emerald" />
    </>
  );
}
