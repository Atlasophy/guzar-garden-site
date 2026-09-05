import Link from 'next/link';
import type { StaffReservationView } from '@/lib/staff/reservations';
import { formatLocalTime } from '@/lib/time/warsaw';

export function ReservationTable({ rows }: { rows: StaffReservationView[] }) {
  if (!rows.length) return <p className="staff-empty">Brak rezerwacji.</p>;
  return (
    <div className="staff-table-wrap">
      <table className="staff-table">
        <thead>
          <tr>
            <th>Godzina</th>
            <th>Gość</th>
            <th>Osoby</th>
            <th>Stolik</th>
            <th>Status</th>
            <th>Kod</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatLocalTime(new Date(row.startsAt))}</td>
              <td>
                <Link href={`/staff/reservations/${row.id}`}>
                  {row.guestFirstName} {row.guestLastName}
                </Link>
                <br />
                <small>{row.guestPhone}</small>
              </td>
              <td>{row.partySize}</td>
              <td>{row.tableCode ?? '—'}</td>
              <td>
                <span className={`badge ${row.status}`}>{row.status}</span>
              </td>
              <td>{row.confirmationCode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
