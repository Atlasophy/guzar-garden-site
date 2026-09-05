import Link from 'next/link';
import { requireStaff } from '@/lib/auth/staff';
import { getFloorView } from '@/lib/staff/dashboard';

export default async function StaffFloorPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const staff = await requireStaff('/staff/floor');
  const query = await searchParams;
  const parsed = query.at ? new Date(query.at) : new Date();
  const at = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const floor = await getFloorView(staff.venue.id, at);
  const xs = floor.tables.map((t) => t.x);
  const zs = floor.tables.map((t) => t.z);
  const minX = Math.min(...xs, 0),
    maxX = Math.max(...xs, 10),
    minZ = Math.min(...zs, 0),
    maxZ = Math.max(...zs, 10);
  const px = (x: number) => 10 + (80 * (x - minX)) / Math.max(1, maxX - minX);
  const pz = (z: number) => 10 + (80 * (z - minZ)) / Math.max(1, maxZ - minZ);
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>Sala</h1>
          <p>Stan o {floor.localTime}</p>
        </div>
        <a className="staff-button secondary" href="/staff/floor">
          Teraz
        </a>
      </header>
      <div className="floor-map" aria-label="Plan zajętości stolików">
        {floor.tables.map((t) => {
          const content = (
            <>
              <span>{t.code}</span>
              <small>
                {t.state}
                {t.reservation ? ` · ${t.reservation.guestName}` : ''}
              </small>
            </>
          );
          return t.reservation ? (
            <Link
              key={t.id}
              href={`/staff/reservations/${t.reservation.id}`}
              className={`floor-table ${t.state}`}
              style={{ left: `${px(t.x)}%`, top: `${pz(t.z)}%` }}
            >
              {content}
            </Link>
          ) : (
            <button
              key={t.id}
              className={`floor-table ${t.state}`}
              style={{ left: `${px(t.x)}%`, top: `${pz(t.z)}%` }}
            >
              {content}
            </button>
          );
        })}
      </div>
    </>
  );
}
