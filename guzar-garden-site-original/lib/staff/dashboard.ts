import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import { toLocalDateString, toLocalTimeString } from '@/lib/time/warsaw';
import type {
  DiningAreaRow,
  NotificationOutboxRow,
  RestaurantTableRow,
  TableAllocationRow,
  TableStateName,
  TableStateRow,
} from '@/lib/database/types';
import { listReservations, type StaffReservationView } from './reservations';

/**
 * What the host stand needs to see at a glance.
 *
 * "Late" is the number that changes how a shift runs: a confirmed booking whose
 * time has passed and which nobody has seated. Fifteen minutes is the grace
 * period — long enough that a guest stuck on the tram is not written off,
 * short enough that the table can be turned.
 */

const LATE_GRACE_MINUTES = 15;

export interface TodayOverview {
  localDate: string;
  serverNow: string;
  upcoming: StaffReservationView[];
  seated: StaffReservationView[];
  late: StaffReservationView[];
  completed: StaffReservationView[];
  noShows: StaffReservationView[];
  cancelled: StaffReservationView[];
  counts: {
    covers: number;
    bookings: number;
    seatedNow: number;
    tablesOccupied: number;
    tablesTotal: number;
    activeHolds: number;
  };
  failedNotifications: {
    id: string;
    type: NotificationOutboxRow['type'];
    status: NotificationOutboxRow['status'];
    reservationId: string | null;
    lastError: string | null;
    updatedAt: string;
  }[];
}

export async function getTodayOverview(venueId: string): Promise<TodayOverview> {
  const supabase = getAdminClient();
  const now = new Date();
  const localDate = toLocalDateString(now);

  // Sweep expired holds first so the "holds" count and the floor agree.
  await supabase.rpc('gg_expire_stale_holds', { p_venue_id: venueId, p_table_id: null });

  const [reservations, { data: allocations }, { data: tables }, { data: failed }] =
    await Promise.all([
      listReservations(venueId, { from: localDate, to: localDate, limit: 200 }),
      supabase
        .from('table_allocations')
        .select('*')
        .eq('venue_id', venueId)
        .eq('status', 'active')
        .lte('starts_at', now.toISOString())
        .gt('ends_at', now.toISOString())
        .returns<TableAllocationRow[]>(),
      supabase
        .from('restaurant_tables')
        .select('id')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .returns<Pick<RestaurantTableRow, 'id'>[]>(),
      supabase
        .from('notification_outbox')
        .select('*')
        .eq('venue_id', venueId)
        .in('status', ['failed', 'undelivered'])
        .order('updated_at', { ascending: false })
        .limit(20)
        .returns<NotificationOutboxRow[]>(),
    ]);

  const lateCutoff = now.getTime() - LATE_GRACE_MINUTES * 60_000;

  const upcoming: StaffReservationView[] = [];
  const seated: StaffReservationView[] = [];
  const late: StaffReservationView[] = [];
  const completed: StaffReservationView[] = [];
  const noShows: StaffReservationView[] = [];
  const cancelled: StaffReservationView[] = [];

  for (const reservation of reservations) {
    const startsAt = new Date(reservation.startsAt).getTime();
    switch (reservation.status) {
      case 'seated':
        seated.push(reservation);
        break;
      case 'completed':
        completed.push(reservation);
        break;
      case 'no_show':
        noShows.push(reservation);
        break;
      case 'cancelled':
        cancelled.push(reservation);
        break;
      default:
        if (startsAt < lateCutoff) late.push(reservation);
        else upcoming.push(reservation);
    }
  }

  const liveAllocations = allocations ?? [];

  return {
    localDate,
    serverNow: now.toISOString(),
    upcoming,
    seated,
    late,
    completed,
    noShows,
    cancelled,
    counts: {
      covers: reservations
        .filter((r) => r.status !== 'cancelled' && r.status !== 'no_show')
        .reduce((sum, r) => sum + r.partySize, 0),
      bookings: reservations.filter((r) => r.status !== 'cancelled').length,
      seatedNow: seated.length,
      tablesOccupied: new Set(
        liveAllocations.filter((a) => a.kind !== 'hold').map((a) => a.table_id),
      ).size,
      tablesTotal: (tables ?? []).length,
      activeHolds: liveAllocations.filter((a) => a.kind === 'hold').length,
    },
    failedNotifications: (failed ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      reservationId: row.reservation_id,
      lastError: row.last_error,
      updatedAt: row.updated_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// Floor view
// ---------------------------------------------------------------------------

export interface StaffFloorTable {
  id: string;
  code: string;
  areaSlug: string;
  areaName: string;
  minCapacity: number;
  maxCapacity: number;
  shape: string;
  x: number;
  z: number;
  widthM: number;
  depthM: number;
  rotationDeg: number;
  staffNotes: string | null;
  isAccessible: boolean;
  state: TableStateName | 'seated' | 'turnaround';
  /** Populated for staff only — this view is behind authorisation. */
  reservation: {
    id: string;
    confirmationCode: string;
    guestName: string;
    partySize: number;
    startsAt: string;
    status: string;
  } | null;
  blockReason: string | null;
}

export interface StaffFloorView {
  at: string;
  localTime: string;
  areas: {
    id: string;
    slug: string;
    name: string;
    x: number;
    z: number;
    width: number;
    depth: number;
  }[];
  tables: StaffFloorTable[];
}

/**
 * The floor as it stands at an instant — now, or a time later this evening.
 *
 * Adds two states the public view has no use for: `seated` (a party is actually
 * at the table, not merely booked) and `turnaround` (the guest has gone, the
 * buffer has not). Both change what a host does next, which is the whole point
 * of the screen.
 */
export async function getFloorView(
  venueId: string,
  at: Date,
  partySize?: number,
): Promise<StaffFloorView> {
  const supabase = getAdminClient();
  await supabase.rpc('gg_expire_stale_holds', { p_venue_id: venueId, p_table_id: null });

  // A one-minute probe window: "what is on this table right now".
  const until = new Date(at.getTime() + 60_000);

  const [{ data: stateRows }, { data: tables }, { data: areas }, { data: allocations }] =
    await Promise.all([
      supabase.rpc('gg_table_states', {
        p_venue_id: venueId,
        p_starts_at: at.toISOString(),
        p_ends_at: until.toISOString(),
        p_party_size: partySize ?? null,
        p_own_hold_token_hash: null,
        p_ignore_reservation_id: null,
      }),
      supabase
        .from('restaurant_tables')
        .select('*')
        .eq('venue_id', venueId)
        .order('display_order')
        .returns<RestaurantTableRow[]>(),
      supabase
        .from('dining_areas')
        .select('*')
        .eq('venue_id', venueId)
        .order('display_order')
        .returns<DiningAreaRow[]>(),
      supabase
        .from('table_allocations')
        .select('*')
        .eq('venue_id', venueId)
        .eq('status', 'active')
        .lte('starts_at', until.toISOString())
        .gt('ends_at', at.toISOString())
        .returns<TableAllocationRow[]>(),
    ]);

  const stateByTable = new Map<string, TableStateName>(
    ((stateRows ?? []) as TableStateRow[]).map((row) => [row.table_id, row.state]),
  );
  const areaById = new Map((areas ?? []).map((a) => [a.id, a]));

  const reservationIds = (allocations ?? [])
    .map((a) => a.reservation_id)
    .filter((id): id is string => Boolean(id));

  const { data: reservations } = reservationIds.length
    ? await supabase
        .from('reservations')
        .select(
          'id, confirmation_code, guest_first_name, guest_last_name, party_size, starts_at, ends_at, status',
        )
        .in('id', reservationIds)
        .returns<
          {
            id: string;
            confirmation_code: string;
            guest_first_name: string;
            guest_last_name: string;
            party_size: number;
            starts_at: string;
            ends_at: string;
            status: string;
          }[]
        >()
    : { data: [] };

  const reservationById = new Map((reservations ?? []).map((r) => [r.id, r]));
  const allocationByTable = new Map<string, TableAllocationRow>();
  for (const allocation of allocations ?? [])
    allocationByTable.set(allocation.table_id, allocation);

  const floorTables: StaffFloorTable[] = (tables ?? []).map((table) => {
    const area = areaById.get(table.dining_area_id);
    const allocation = allocationByTable.get(table.id);
    const reservation = allocation?.reservation_id
      ? reservationById.get(allocation.reservation_id)
      : undefined;

    let state: StaffFloorTable['state'] = stateByTable.get(table.id) ?? 'inactive';
    if (reservation) {
      if (reservation.status === 'seated') state = 'seated';
      // Between the guest's own end time and the end of the buffer, the table
      // is being cleared — not free, and not occupied by anybody either.
      else if (new Date(reservation.ends_at).getTime() <= at.getTime()) state = 'turnaround';
    }

    return {
      id: table.id,
      code: table.code,
      areaSlug: area?.slug ?? '',
      areaName: area?.name_pl ?? '',
      minCapacity: table.min_capacity,
      maxCapacity: table.max_capacity,
      shape: table.shape,
      x: Number(table.floor_x),
      z: Number(table.floor_z),
      widthM: Number(table.width_m),
      depthM: Number(table.depth_m),
      rotationDeg: Number(table.rotation_deg),
      staffNotes: table.staff_notes,
      isAccessible: table.is_accessible,
      state,
      reservation: reservation
        ? {
            id: reservation.id,
            confirmationCode: reservation.confirmation_code,
            guestName: `${reservation.guest_first_name} ${reservation.guest_last_name}`.trim(),
            partySize: reservation.party_size,
            startsAt: reservation.starts_at,
            status: reservation.status,
          }
        : null,
      blockReason: allocation?.kind === 'block' ? allocation.block_reason : null,
    };
  });

  return {
    at: at.toISOString(),
    localTime: toLocalTimeString(at),
    areas: (areas ?? []).map((area) => ({
      id: area.id,
      slug: area.slug,
      name: area.name_pl,
      x: Number(area.floor_x),
      z: Number(area.floor_z),
      width: Number(area.floor_width),
      depth: Number(area.floor_depth),
    })),
    tables: floorTables,
  };
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  allocationId: string;
  tableId: string;
  tableCode: string;
  areaSlug: string;
  kind: TableAllocationRow['kind'];
  startsAt: string;
  endsAt: string;
  label: string;
  status: string;
  reservationId: string | null;
}

/**
 * Every allocation on a local day, as a table-resource timeline.
 *
 * Includes blocks and live holds, because a host looking at a gap needs to know
 * whether it is really a gap. Uses the allocations rather than the reservations:
 * the allocation is what actually occupies the table.
 */
export async function getDayTimeline(
  venueId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<{ entries: TimelineEntry[]; tables: { id: string; code: string; areaSlug: string }[] }> {
  const supabase = getAdminClient();

  const [{ data: allocations }, { data: tables }, { data: areas }] = await Promise.all([
    supabase
      .from('table_allocations')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'active')
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString())
      .returns<TableAllocationRow[]>(),
    supabase
      .from('restaurant_tables')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('display_order')
      .returns<RestaurantTableRow[]>(),
    supabase.from('dining_areas').select('*').eq('venue_id', venueId).returns<DiningAreaRow[]>(),
  ]);

  const areaById = new Map((areas ?? []).map((a) => [a.id, a]));
  const tableById = new Map((tables ?? []).map((t) => [t.id, t]));

  const reservationIds = (allocations ?? [])
    .map((a) => a.reservation_id)
    .filter((id): id is string => Boolean(id));

  const { data: reservations } = reservationIds.length
    ? await supabase
        .from('reservations')
        .select('id, confirmation_code, guest_last_name, party_size, status')
        .in('id', reservationIds)
        .returns<
          {
            id: string;
            confirmation_code: string;
            guest_last_name: string;
            party_size: number;
            status: string;
          }[]
        >()
    : { data: [] };

  const reservationById = new Map((reservations ?? []).map((r) => [r.id, r]));

  const entries: TimelineEntry[] = [];
  for (const allocation of allocations ?? []) {
    const table = tableById.get(allocation.table_id);
    if (!table) continue;
    const area = areaById.get(table.dining_area_id);
    const reservation = allocation.reservation_id
      ? reservationById.get(allocation.reservation_id)
      : undefined;

    entries.push({
      allocationId: allocation.id,
      tableId: allocation.table_id,
      tableCode: table.code,
      areaSlug: area?.slug ?? '',
      kind: allocation.kind,
      startsAt: allocation.starts_at,
      endsAt: allocation.ends_at,
      label:
        allocation.kind === 'block'
          ? (allocation.block_reason ?? 'Blocked')
          : allocation.kind === 'hold'
            ? 'Hold'
            : `${reservation?.guest_last_name ?? '—'} · ${reservation?.party_size ?? '?'}`,
      status: reservation?.status ?? allocation.kind,
      reservationId: allocation.reservation_id,
    });
  }

  return {
    entries,
    tables: (tables ?? []).map((table) => ({
      id: table.id,
      code: table.code,
      areaSlug: areaById.get(table.dining_area_id)?.slug ?? '',
    })),
  };
}
