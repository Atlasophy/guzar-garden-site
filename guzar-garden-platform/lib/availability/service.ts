import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import type {
  DiningAreaRow,
  ReservationSettingsRow,
  RestaurantTableRow,
  ServiceExceptionRow,
  ServiceWindowRow,
  TableStateRow,
  TableStateName,
  VenueRow,
} from '@/lib/database/types';
import { pickLocaleColumns, type LocalizedRecord } from '@/lib/i18n/fallback';
import { parseLocalDateTime, toLocalTimeString } from '@/lib/time/warsaw';
import { generateSlots, type ServiceWindow } from './slots';

/**
 * The one availability implementation.
 *
 * Guest booking, the staff floor view and the staff reschedule dialog all come
 * through here, so "is this table free at this time" has exactly one answer and
 * one set of rules. Anything that occupies a table — a confirmed booking, a live
 * hold, a maintenance block — is an allocation, and the database is what reports
 * on them (`gg_table_states`); this module shapes that into something a page can
 * render and, critically, decides what a *public* caller is allowed to see.
 *
 * What a public response never contains: a guest name, a telephone number, an
 * e-mail, an internal note, or a reservation id. A table is 'reserved'. Who
 * reserved it is the restaurant's business.
 */

export interface AvailabilityRequest {
  venueSlug: string;
  /** Warsaw-local calendar date, YYYY-MM-DD. */
  date: string;
  partySize: number;
  /** Warsaw-local HH:MM. When given, table states are computed for it. */
  time?: string;
  areaSlug?: string;
  durationMinutes?: number;
  /** Hash of the caller's own hold, so their table reads as held-by-them. */
  ownHoldTokenHash?: string;
  /** Exclude this reservation's own allocation — used when rescheduling it. */
  ignoreReservationId?: string;
}

export interface AvailabilitySlotView {
  /** Warsaw-local HH:MM — what the guest picks. */
  time: string;
  /** The absolute instant, so the client never re-derives it. */
  startsAt: string;
  endsAt: string;
}

export interface AvailabilityTableView {
  id: string;
  code: string;
  areaSlug: string;
  areaId: string;
  minCapacity: number;
  maxCapacity: number;
  shape: string;
  widthM: number;
  depthM: number;
  x: number;
  z: number;
  rotationDeg: number;
  isAccessible: boolean;
  state: TableStateName;
  /** Eligible = selectable right now for this party at this time. */
  selectable: boolean;
}

export interface AvailabilityAreaView {
  id: string;
  slug: string;
  name: LocalizedRecord;
  description: LocalizedRecord;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  isOutdoor: boolean;
  displayOrder: number;
  isOpen: boolean;
}

export type AvailabilityState =
  | 'open'
  | 'closed_that_day'
  | 'no_slots'
  | 'no_table_for_party'
  | 'party_too_large'
  | 'beyond_horizon';

export interface AvailabilityResponse {
  state: AvailabilityState;
  /** Server time. The client's clock is never trusted for anything. */
  serverNow: string;
  date: string;
  partySize: number;
  /** Present only when the venue is shut and the reason is public. */
  closureReason: string | null;
  openingHours: { start: string; end: string }[];
  slots: AvailabilitySlotView[];
  /** Only when a time was asked for. */
  selectedTime: string | null;
  tables: AvailabilityTableView[];
  areas: AvailabilityAreaView[];
  policy: {
    slotIntervalMinutes: number;
    durationMinutes: number;
    turnaroundMinutes: number;
    minNoticeMinutes: number;
    bookingHorizonDays: number;
    maxOnlinePartySize: number;
    holdDurationSeconds: number;
    cancellationCutoffMinutes: number;
  };
  /** Why particular tables are not offered. Aggregate counts, never identities. */
  capacityNotes: {
    tooSmall: number;
    tooLarge: number;
    occupied: number;
    blocked: number;
    areaClosed: number;
  };
}

export interface VenueContext {
  venue: VenueRow;
  settings: ReservationSettingsRow;
  areas: DiningAreaRow[];
  tables: RestaurantTableRow[];
}

/** Everything about the venue that availability needs, in one round trip. */
export async function loadVenueContext(venueSlug: string): Promise<VenueContext | null> {
  const supabase = getAdminClient();

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', venueSlug)
    .eq('is_active', true)
    .maybeSingle<VenueRow>();

  if (venueError) throw venueError;
  if (!venue) return null;

  const [settingsResult, areasResult, tablesResult] = await Promise.all([
    supabase
      .from('reservation_settings')
      .select('*')
      .eq('venue_id', venue.id)
      .maybeSingle<ReservationSettingsRow>(),
    supabase
      .from('dining_areas')
      .select('*')
      .eq('venue_id', venue.id)
      .order('display_order')
      .returns<DiningAreaRow[]>(),
    supabase
      .from('restaurant_tables')
      .select('*')
      .eq('venue_id', venue.id)
      .order('display_order')
      .returns<RestaurantTableRow[]>(),
  ]);

  if (settingsResult.error) throw settingsResult.error;
  if (areasResult.error) throw areasResult.error;
  if (tablesResult.error) throw tablesResult.error;
  if (!settingsResult.data) return null;

  return {
    venue,
    settings: settingsResult.data,
    areas: areasResult.data ?? [],
    tables: tablesResult.data ?? [],
  };
}

/** Service windows for a local date, straight from the database's own rules. */
export async function loadServiceWindows(
  venueId: string,
  localDate: string,
): Promise<ServiceWindow[]> {
  const { data, error } = await getAdminClient().rpc('gg_service_windows', {
    p_venue_id: venueId,
    p_local_date: localDate,
  });
  if (error) throw error;
  return ((data ?? []) as ServiceWindowRow[])
    .map((row) => ({ start: new Date(row.window_start), end: new Date(row.window_end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

async function loadPublicClosureReason(
  venueId: string,
  localDate: string,
): Promise<string | null> {
  const dayStart = parseLocalDateTime(localDate, '00:00').instant;
  const dayEnd = new Date(dayStart.getTime() + 26 * 60 * 60 * 1000);

  const { data, error } = await getAdminClient()
    .from('service_exceptions')
    .select('kind, reason, is_public, dining_area_id')
    .eq('venue_id', venueId)
    .is('dining_area_id', null)
    .in('kind', ['closure', 'private_event'])
    .lt('starts_at', dayEnd.toISOString())
    .gt('ends_at', dayStart.toISOString())
    .limit(1)
    .returns<Pick<ServiceExceptionRow, 'kind' | 'reason' | 'is_public'>[]>();

  if (error) throw error;
  const first = data?.[0];
  if (!first) return null;
  return first.is_public ? first.reason : null;
}

/**
 * The public availability answer.
 *
 * Reads are opportunistic about cleanup: every call sweeps holds whose clock has
 * run out first, so a table that a browser walked away from three minutes ago
 * shows as free here without waiting for the cron job.
 */
export async function getAvailability(
  request: AvailabilityRequest,
): Promise<AvailabilityResponse | null> {
  const context = await loadVenueContext(request.venueSlug);
  if (!context) return null;

  const { venue, settings, areas, tables } = context;
  const supabase = getAdminClient();

  await supabase.rpc('gg_expire_stale_holds', { p_venue_id: venue.id, p_table_id: null });

  const now = new Date();
  const durationMinutes = request.durationMinutes ?? settings.default_duration_minutes;

  const windows = await loadServiceWindows(venue.id, request.date);
  const openingHours = windows.map((w) => ({
    start: toLocalTimeString(w.start),
    end: toLocalTimeString(w.end),
  }));

  const areaViews: AvailabilityAreaView[] = areas.map((area) => ({
    id: area.id,
    slug: area.slug,
    name: pickLocaleColumns(area, 'name'),
    description: pickLocaleColumns(area, 'description'),
    x: Number(area.floor_x),
    z: Number(area.floor_z),
    width: Number(area.floor_width),
    depth: Number(area.floor_depth),
    color: area.floor_color,
    isOutdoor: area.is_outdoor,
    displayOrder: area.display_order,
    isOpen: area.is_active,
  }));

  const emptyNotes = { tooSmall: 0, tooLarge: 0, occupied: 0, blocked: 0, areaClosed: 0 };
  const base = {
    serverNow: now.toISOString(),
    date: request.date,
    partySize: request.partySize,
    openingHours,
    areas: areaViews,
    policy: {
      slotIntervalMinutes: settings.slot_interval_minutes,
      durationMinutes,
      turnaroundMinutes: settings.turnaround_minutes,
      minNoticeMinutes: settings.min_notice_minutes,
      bookingHorizonDays: settings.booking_horizon_days,
      maxOnlinePartySize: settings.max_online_party_size,
      holdDurationSeconds: settings.hold_duration_seconds,
      cancellationCutoffMinutes: settings.cancellation_cutoff_minutes,
    },
  };

  if (request.partySize > settings.max_online_party_size) {
    return {
      ...base,
      state: 'party_too_large',
      closureReason: null,
      slots: [],
      selectedTime: null,
      tables: [],
      capacityNotes: emptyNotes,
    };
  }

  if (windows.length === 0) {
    return {
      ...base,
      state: 'closed_that_day',
      closureReason: await loadPublicClosureReason(venue.id, request.date),
      slots: [],
      selectedTime: null,
      tables: [],
      capacityNotes: emptyNotes,
    };
  }

  const slots = generateSlots(windows, {
    intervalMinutes: settings.slot_interval_minutes,
    durationMinutes,
    minNoticeMinutes: settings.min_notice_minutes,
    bookingHorizonDays: settings.booking_horizon_days,
    now,
  });

  const slotViews: AvailabilitySlotView[] = slots.map((slot) => ({
    time: toLocalTimeString(slot.startsAt),
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
  }));

  if (slotViews.length === 0) {
    return {
      ...base,
      state: 'no_slots',
      closureReason: null,
      slots: [],
      selectedTime: null,
      tables: [],
      capacityNotes: emptyNotes,
    };
  }

  // No time chosen yet: the guest is still on the "what time?" step.
  if (!request.time) {
    return {
      ...base,
      state: 'open',
      closureReason: null,
      slots: slotViews,
      selectedTime: null,
      tables: [],
      capacityNotes: emptyNotes,
    };
  }

  const resolution = parseLocalDateTime(request.date, request.time);
  const startsAt = resolution.instant;
  const occupancyEndsAt = new Date(
    startsAt.getTime() + (durationMinutes + settings.turnaround_minutes) * 60_000,
  );

  const { data: stateRows, error: statesError } = await supabase.rpc('gg_table_states', {
    p_venue_id: venue.id,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: occupancyEndsAt.toISOString(),
    p_party_size: request.partySize,
    p_own_hold_token_hash: request.ownHoldTokenHash ?? null,
    p_ignore_reservation_id: request.ignoreReservationId ?? null,
  });
  if (statesError) throw statesError;

  const stateByTable = new Map<string, TableStateName>(
    ((stateRows ?? []) as TableStateRow[]).map((row) => [row.table_id, row.state]),
  );
  const areaById = new Map(areas.map((area) => [area.id, area]));

  const notes = { ...emptyNotes };
  const tableViews: AvailabilityTableView[] = [];

  for (const table of tables) {
    const area = areaById.get(table.dining_area_id);
    if (!area) continue;
    if (request.areaSlug && area.slug !== request.areaSlug) continue;

    const state = stateByTable.get(table.id) ?? 'inactive';
    if (state === 'inactive') continue;

    switch (state) {
      case 'too_small':
        notes.tooSmall += 1;
        break;
      case 'too_large':
        notes.tooLarge += 1;
        break;
      case 'reserved':
      case 'held':
        notes.occupied += 1;
        break;
      case 'blocked':
        notes.blocked += 1;
        break;
      case 'area_closed':
        notes.areaClosed += 1;
        break;
      default:
        break;
    }

    tableViews.push({
      id: table.id,
      code: table.code,
      areaSlug: area.slug,
      areaId: area.id,
      minCapacity: table.min_capacity,
      maxCapacity: table.max_capacity,
      shape: table.shape,
      widthM: Number(table.width_m),
      depthM: Number(table.depth_m),
      x: Number(table.floor_x),
      z: Number(table.floor_z),
      rotationDeg: Number(table.rotation_deg),
      isAccessible: table.is_accessible,
      state,
      selectable: state === 'available' || state === 'held_by_you',
    });
  }

  const anySelectable = tableViews.some((t) => t.selectable);

  return {
    ...base,
    state: anySelectable ? 'open' : 'no_table_for_party',
    closureReason: null,
    slots: slotViews,
    selectedTime: toLocalTimeString(startsAt),
    tables: tableViews,
    capacityNotes: notes,
  };
}
