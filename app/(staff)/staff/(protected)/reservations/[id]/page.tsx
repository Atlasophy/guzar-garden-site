import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth/staff';
import { getReservation, getReservationAudit } from '@/lib/staff/reservations';
import { formatLocalDate, formatLocalTime } from '@/lib/time/warsaw';
import { ReservationActions } from '@/components/staff/reservation-actions';

export default async function StaffReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const { id } = await params;
  const reservation = await getReservation(staff.venue.id, id);
  if (!reservation) notFound();
  const audit = staff.profile.role === 'host' ? [] : await getReservationAudit(id);
  const starts = new Date(reservation.startsAt);
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>
            {reservation.guestFirstName} {reservation.guestLastName}
          </h1>
          <p>{reservation.confirmationCode}</p>
        </div>
        <span className={`badge ${reservation.status}`}>{reservation.status}</span>
      </header>
      <div className="staff-grid">
        <section className="staff-card">
          <h2>Rezerwacja</h2>
          <dl>
            <dt>Termin</dt>
            <dd>
              {formatLocalDate(starts, 'pl')} · {formatLocalTime(starts)}
            </dd>
            <dt>Stolik</dt>
            <dd>
              {reservation.tableCode ?? '—'} · {reservation.areaSlug ?? '—'}
            </dd>
            <dt>Liczba osób</dt>
            <dd>{reservation.partySize}</dd>
            <dt>Telefon</dt>
            <dd>{reservation.guestPhone}</dd>
            <dt>E-mail</dt>
            <dd>{reservation.guestEmail ?? '—'}</dd>
            <dt>Uwagi</dt>
            <dd>{reservation.specialRequests ?? '—'}</dd>
          </dl>
        </section>
        <ReservationActions reservation={reservation} />
      </div>
      {audit.length ? (
        <section className="staff-card" style={{ marginTop: '1rem' }}>
          <h2>Historia</h2>
          {audit.map((a) => (
            <p key={a.id}>
              <strong>{a.action}</strong> · {new Date(a.created_at).toLocaleString('pl-PL')}
            </p>
          ))}
        </section>
      ) : null}
    </>
  );
}
