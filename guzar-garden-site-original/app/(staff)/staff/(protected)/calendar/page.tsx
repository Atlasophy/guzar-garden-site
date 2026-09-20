import { requireStaff } from '@/lib/auth/staff';
import { getDayTimeline } from '@/lib/staff/dashboard';
import {
  addLocalDays,
  parseLocalDateTime,
  toLocalDateString,
  toLocalTimeString,
} from '@/lib/time/warsaw';
import { getServerStaffDictionary } from '@/lib/i18n/staff-server';

export default async function StaffCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const [staff, dictionary] = await Promise.all([
    requireStaff('/staff/calendar'),
    getServerStaffDictionary(),
  ]);
  const search = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(search.date ?? '')
    ? search.date!
    : toLocalDateString(new Date());
  const start = parseLocalDateTime(date, '00:00').instant;
  const end = parseLocalDateTime(addLocalDays(date, 1), '00:00').instant;
  const timeline = await getDayTimeline(staff.venue.id, start, end);
  const left = (iso: string) =>
    Math.max(
      0,
      Math.min(
        100,
        ((new Date(iso).getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100,
      ),
    );
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>{dictionary.calendar}</h1>
          <p>{dictionary.calendarSubtitle}</p>
        </div>
        <form>
          <input type="date" name="date" defaultValue={date} />
          <button className="staff-button">{dictionary.show}</button>
        </form>
      </header>
      <div className="staff-table-wrap">
        <div className="timeline">
          {timeline.tables.map((table) => (
            <div className="timeline-row" key={table.id}>
              <div className="timeline-label">{table.code}</div>
              <div className="timeline-track">
                {timeline.entries
                  .filter((e) => e.tableId === table.id)
                  .map((e) => {
                    const l = left(e.startsAt),
                      r = left(e.endsAt);
                    return (
                      <a
                        key={e.allocationId}
                        href={
                          e.reservationId ? `/staff/reservations/${e.reservationId}` : undefined
                        }
                        className="timeline-event"
                        style={{ left: `${l}%`, width: `${Math.max(1, r - l)}%` }}
                        title={`${toLocalTimeString(new Date(e.startsAt))}–${toLocalTimeString(new Date(e.endsAt))} ${e.label}`}
                      >
                        {toLocalTimeString(new Date(e.startsAt))} {e.label}
                      </a>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
