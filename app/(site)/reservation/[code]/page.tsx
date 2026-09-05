import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/shared/site-footer';
import { SiteHeader } from '@/components/shared/site-header';
import { publicEnv } from '@/lib/config/env';
import { getReservationSummaryByCode } from '@/lib/reservations/service';
import { formatLocalDate, formatLocalTime } from '@/lib/time/warsaw';

export const metadata: Metadata = { title: 'Potwierdzenie rezerwacji', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ReservationSummaryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const reservation = await getReservationSummaryByCode(publicEnv.venueSlug, code).catch(
    () => null,
  );
  if (!reservation) notFound();
  const startsAt = new Date(reservation.startsAt);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <SiteHeader variant="emerald" />
      <main className="book">
        <div className="wrap">
          <div className="panel" style={{ maxWidth: '46rem', margin: '0 auto' }}>
            <p className="eyebrow">Guzar Garden</p>
            <h1>Rezerwacja przyjęta</h1>
            <p className="lede">Twój stolik został zarezerwowany.</p>
            <div className="code-plate">
              <small>Kod rezerwacji</small>
              <b>{reservation.confirmationCode}</b>
            </div>
            <ul className="summary">
              <li>
                <span className="label">Termin</span>
                <span className="value">
                  {formatLocalDate(startsAt, 'pl')} · {formatLocalTime(startsAt)}
                </span>
              </li>
              <li>
                <span className="label">Liczba osób</span>
                <span className="value">{reservation.partySize}</span>
              </li>
              <li>
                <span className="label">Status</span>
                <span className="value">{reservation.status}</span>
              </li>
            </ul>
            <div className="actions">
              <Link className="btn light" href="/">
                <span>Strona główna</span>
              </Link>
              <Link className="btn outline" href="/menu">
                <span>Karta dań</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter variant="emerald" />
    </>
  );
}
