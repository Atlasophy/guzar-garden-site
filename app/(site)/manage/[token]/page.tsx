import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ManageReservation } from '@/components/reservation/manage-reservation';
import { SiteFooter } from '@/components/shared/site-footer';
import { SiteHeader } from '@/components/shared/site-header';
import { getReservationForGuest } from '@/lib/reservations/service';
import { looksLikeToken } from '@/lib/security/tokens';

export const metadata: Metadata = { title: 'Zarządzaj rezerwacją', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ManageReservationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!looksLikeToken(token, 32)) notFound();
  const reservation = await getReservationForGuest(token).catch(() => null);
  if (!reservation) notFound();
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <SiteHeader variant="emerald" />
      <main className="book">
        <div className="wrap">
          <ManageReservation token={token} initial={reservation} />
        </div>
      </main>
      <SiteFooter variant="emerald" />
    </>
  );
}
