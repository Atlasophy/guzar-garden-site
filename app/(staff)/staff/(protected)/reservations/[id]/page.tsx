import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth/staff';
import { getReservation, getReservationAudit } from '@/lib/staff/reservations';
import { formatLocalDate, formatLocalTime } from '@/lib/time/warsaw';
import { ReservationActions } from '@/components/staff/reservation-actions';
import { getRequestLocale, getServerStaffDictionary } from '@/lib/i18n/staff-server';
import { reservationStatusLabel } from '@/lib/i18n/staff';

export default async function StaffReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [staff, dictionary, locale, { id }] = await Promise.all([
    requireStaff(),
    getServerStaffDictionary(),
    getRequestLocale(),
    params,
  ]);
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
        <span className={`badge ${reservation.status}`}>
          {reservationStatusLabel(dictionary, reservation.status)}
        </span>
      </header>
      <div className="staff-grid">
        <section className="staff-card">
          <h2>{dictionary.reservation}</h2>
          <dl>
            <dt>{dictionary.dateAndTime}</dt>
            <dd>
              {formatLocalDate(starts, locale)} · {formatLocalTime(starts)}
            </dd>
            <dt>{dictionary.table}</dt>
            <dd>
              {reservation.tableCode ?? '—'} · {reservation.areaSlug ?? '—'}
            </dd>
            <dt>{dictionary.partySize}</dt>
            <dd>{reservation.partySize}</dd>
            <dt>{dictionary.phone}</dt>
            <dd>{reservation.guestPhone}</dd>
            <dt>E-mail</dt>
            <dd>{reservation.guestEmail ?? '—'}</dd>
            <dt>{dictionary.notes}</dt>
            <dd>{reservation.specialRequests ?? '—'}</dd>
          </dl>
        </section>
        <ReservationActions reservation={reservation} />
      </div>
      {audit.length ? (
        <section className="staff-card" style={{ marginTop: '1rem' }}>
          <h2>{dictionary.history}</h2>
          {audit.map((a) => (
            <p key={a.id}>
              <strong>{a.action}</strong> · {new Date(a.created_at).toLocaleString(locale)}
            </p>
          ))}
        </section>
      ) : null}
    </>
  );
}
