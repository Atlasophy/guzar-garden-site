import Link from 'next/link';
import { requireStaff } from '@/lib/auth/staff';
import { getTodayOverview } from '@/lib/staff/dashboard';
import { ReservationTable } from '@/components/staff/reservation-table';

export default async function StaffTodayPage() {
  const staff = await requireStaff('/staff');
  const overview = await getTodayOverview(staff.venue.id);
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>Dzisiaj</h1>
          <p>{overview.localDate}</p>
        </div>
        <div className="staff-actions">
          <Link className="staff-button" href="/staff/reservations/new">
            Nowa rezerwacja
          </Link>
          <Link className="staff-button secondary" href="/staff/calendar">
            Pełny kalendarz
          </Link>
        </div>
      </header>
      <section className="staff-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="staff-card metric">
          <b>{overview.counts.bookings}</b>
          <span>rezerwacji</span>
        </div>
        <div className="staff-card metric">
          <b>{overview.counts.covers}</b>
          <span>gości</span>
        </div>
        <div className="staff-card metric">
          <b>{overview.counts.seatedNow}</b>
          <span>przy stolikach</span>
        </div>
        <div className="staff-card metric">
          <b>
            {overview.counts.tablesOccupied}/{overview.counts.tablesTotal}
          </b>
          <span>zajętych stolików</span>
        </div>
        <div className="staff-card metric">
          <b>{overview.counts.activeHolds}</b>
          <span>aktywnych blokad online</span>
        </div>
      </section>
      {overview.late.length ? (
        <section className="staff-card" style={{ marginBottom: '1rem' }}>
          <h2>Spóźnione</h2>
          <ReservationTable rows={overview.late} />
        </section>
      ) : null}
      <section className="staff-card">
        <h2>Nadchodzące</h2>
        <ReservationTable rows={overview.upcoming} />
      </section>
      {overview.failedNotifications.length ? (
        <section className="staff-card" style={{ marginTop: '1rem' }}>
          <h2>Nieudane wiadomości</h2>
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
