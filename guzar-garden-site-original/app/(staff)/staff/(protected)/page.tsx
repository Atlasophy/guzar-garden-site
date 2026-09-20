import Link from 'next/link';
import { requireStaff } from '@/lib/auth/staff';
import { getTodayOverview } from '@/lib/staff/dashboard';
import { ReservationTable } from '@/components/staff/reservation-table';
import { getServerStaffDictionary } from '@/lib/i18n/staff-server';

export default async function StaffTodayPage() {
  const [staff, dictionary] = await Promise.all([
    requireStaff('/staff'),
    getServerStaffDictionary(),
  ]);
  const overview = await getTodayOverview(staff.venue.id);
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>{dictionary.today}</h1>
          <p>{overview.localDate}</p>
        </div>
        <div className="staff-actions">
          <Link className="staff-button" href="/staff/reservations/new">
            {dictionary.newReservation}
          </Link>
          <Link className="staff-button secondary" href="/staff/calendar">
            {dictionary.fullCalendar}
          </Link>
        </div>
      </header>
      <section className="staff-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="staff-card metric">
          <b>{overview.counts.bookings}</b>
          <span>{dictionary.reservations}</span>
        </div>
        <div className="staff-card metric">
          <b>{overview.counts.covers}</b>
          <span>{dictionary.guests}</span>
        </div>
        <div className="staff-card metric">
          <b>{overview.counts.seatedNow}</b>
          <span>{dictionary.seatedNow}</span>
        </div>
        <div className="staff-card metric">
          <b>
            {overview.counts.tablesOccupied}/{overview.counts.tablesTotal}
          </b>
          <span>{dictionary.occupiedTables}</span>
        </div>
        <div className="staff-card metric">
          <b>{overview.counts.activeHolds}</b>
          <span>{dictionary.activeHolds}</span>
        </div>
      </section>
      {overview.late.length ? (
        <section className="staff-card" style={{ marginBottom: '1rem' }}>
          <h2>{dictionary.late}</h2>
          <ReservationTable rows={overview.late} dictionary={dictionary} />
        </section>
      ) : null}
      <section className="staff-card">
        <h2>{dictionary.upcoming}</h2>
        <ReservationTable rows={overview.upcoming} dictionary={dictionary} />
      </section>
      {overview.failedNotifications.length ? (
        <section className="staff-card" style={{ marginTop: '1rem' }}>
          <h2>{dictionary.failedMessages}</h2>
          {overview.failedNotifications.map((n) => (
            <p key={n.id}>
              <span className={`badge ${n.status}`}>{n.status}</span> {n.type}{' '}
              {n.lastError ? '— ' + n.lastError : ''}
            </p>
          ))}
        </section>
      ) : null}
    </>
  );
}
