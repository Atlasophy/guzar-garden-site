import Link from 'next/link';
import type { StaffReservationView } from '@/lib/staff/reservations';
import { formatLocalTime } from '@/lib/time/warsaw';
import type { StaffDictionary } from '@/lib/i18n/staff';
import { reservationStatusLabel } from '@/lib/i18n/staff';

export function ReservationTable({
  rows,
  dictionary,
}: {
  rows: StaffReservationView[];
  dictionary: StaffDictionary;
}) {
  if (!rows.length) return <p className="staff-empty">{dictionary.noReservations}</p>;
  return (
    <div className="staff-table-wrap">
      <table className="staff-table">
        <thead>
          <tr>
            <th>{dictionary.time}</th>
            <th>{dictionary.guest}</th>
            <th>{dictionary.people}</th>
            <th>{dictionary.table}</th>
            <th>{dictionary.status}</th>
            <th>{dictionary.code}</th>
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
                <span className={`badge ${row.status}`}>
                  {reservationStatusLabel(dictionary, row.status)}
                </span>
              </td>
              <td>{row.confirmationCode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
