import 'server-only';
import { callFunction, getAdminClient } from '@/lib/supabase/admin';
import { parseLocalDateTime, toLocalDateString } from '@/lib/time/warsaw';
import { generateToken, hashToken } from '@/lib/security/tokens';
import type {
  DiningAreaRow,
  NotificationOutboxRow,
  ReservationRow,
  ReservationStatus,
  RestaurantTableRow,
  TableAllocationRow,
  AuditLogRow,
} from '@/lib/database/types';

/**
 * Staff reservation operations.
 *
 * Every write here goes through the same SQL functions the public flow uses.
 * There is deliberately no "force" path that skips the overlap constraint: a
 * host who could quietly double-book a table would produce a floor plan that
 * lies, and the moment staff stop trusting the screen they go back to the paper
 * diary. A conflicting move is refused with the same code a guest would get,
 * and the fix is to pick another table or another time.
 */

export interface StaffReservationView {
  id: string;
  confirmationCode: string;
  status: ReservationStatus;
  source: ReservationRow['source'];
  startsAt: string;
  endsAt: string;
  occupancyEndsAt: string;
  partySize: number;
  guestFirstName: string;
  guestLastName: string;
  guestPhone: string;
  guestEmail: string | null;
  locale: string;
  specialRequests: string | null;
  tableId: string | null;
  tableCode: string | null;
  areaSlug: string | null;
  createdAt: string;
  seatedAt: string | null;
  notification: {
    id: string;
    status: NotificationOutboxRow['status'];
    type: NotificationOutboxRow['type'];
    lastError: string | null;
  } | null;
}

export interface ListFilters {
  from?: string;
  to?: string;
  status?: ReservationStatus;
  areaSlug?: string;
  tableCode?: string;
  minPartySize?: number;
  maxPartySize?: number;
  query?: string;
  limit?: number;
  offset?: number;
}

/**
 * Reservations for the dashboard, calendar and search.
 *
 * Allocations, tables and areas are joined in memory from three bounded queries
 * rather than per row: a busy Saturday is a few hundred bookings, and N+1 over
 * PostgREST would make the calendar crawl.
 */
export async function listReservations(
  venueId: string,
  filters: ListFilters = {},
): Promise<StaffReservationView[]> {
  const supabase = getAdminClient();

  let query = supabase.from('reservations').select('*').eq('venue_id', venueId);

  if (filters.from) {
    query = query.gte('starts_at', parseLocalDateTime(filters.from, '00:00').instant.toISOString());
  }
  if (filters.to) {
    const dayAfter = parseLocalDateTime(filters.to, '00:00').instant;
    query = query.lt('starts_at', new Date(dayAfter.getTime() + 24 * 60 * 60 * 1000).toISOString());
  }
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.minPartySize) query = query.gte('party_size', filters.minPartySize);
  if (filters.maxPartySize) query = query.lte('party_size', filters.maxPartySize);

  if (filters.query) {
    const term = filters.query.trim();
    // A confirmation code is typed as one word in the same box as a name or a
    // phone number, so all four are tried at once.
    const escaped = term.replace(/[%,()]/g, '');
    query = query.or(
      [
        `confirmation_code.ilike.%${escaped.toUpperCase()}%`,
        `guest_first_name.ilike.%${escaped}%`,
        `guest_last_name.ilike.%${escaped}%`,
        `guest_phone_e164.ilike.%${escaped}%`,
        `guest_email.ilike.%${escaped}%`,
      ].join(','),
    );
  }

  const { data: reservations, error } = await query
    .order('starts_at')
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 100) - 1)
    .returns<ReservationRow[]>();

  if (error) throw error;
  const rows = reservations ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  const [{ data: allocations }, { data: tables }, { data: areas }, { data: notifications }] =
    await Promise.all([
      supabase
        .from('table_allocations')
        .select('*')
        .in('reservation_id', ids)
        .returns<TableAllocationRow[]>(),
      supabase
        .from('restaurant_tables')
        .select('*')
        .eq('venue_id', venueId)
        .returns<RestaurantTableRow[]>(),
      supabase.from('dining_areas').select('*').eq('venue_id', venueId).returns<DiningAreaRow[]>(),
      supabase
        .from('notification_outbox')
        .select('*')
        .in('reservation_id', ids)
        .order('created_at', { ascending: false })
        .returns<NotificationOutboxRow[]>(),
    ]);

  const tableById = new Map((tables ?? []).map((t) => [t.id, t]));
  const areaById = new Map((areas ?? []).map((a) => [a.id, a]));

  const allocationByReservation = new Map<string, TableAllocationRow>();
  for (const allocation of allocations ?? []) {
    if (!allocation.reservation_id) continue;
    const existing = allocationByReservation.get(allocation.reservation_id);
    // Prefer the live allocation; fall back to a released one so a completed
    // booking still shows which table it was on.
    if (!existing || (existing.status !== 'active' && allocation.status === 'active')) {
      allocationByReservation.set(allocation.reservation_id, allocation);
    }
  }

  const notificationByReservation = new Map<string, NotificationOutboxRow>();
  for (const notification of notifications ?? []) {
    if (!notification.reservation_id) continue;
    if (!notificationByReservation.has(notification.reservation_id)) {
      notificationByReservation.set(notification.reservation_id, notification);
    }
  }

  const filtered = rows.filter((row) => {
    if (!filters.areaSlug && !filters.tableCode) return true;
    const allocation = allocationByReservation.get(row.id);
    const table = allocation ? tableById.get(allocation.table_id) : undefined;
    if (filters.tableCode && table?.code !== filters.tableCode) return false;
    if (filters.areaSlug) {
      const area = table ? areaById.get(table.dining_area_id) : undefined;
      if (area?.slug !== filters.areaSlug) return false;
    }
    return true;
  });

  return filtered.map((row) => {
    const allocation = allocationByReservation.get(row.id);
    const table = allocation ? tableById.get(allocation.table_id) : undefined;
    const area = table ? areaById.get(table.dining_area_id) : undefined;
    const notification = notificationByReservation.get(row.id);

    return {
      id: row.id,
      confirmationCode: row.confirmation_code,
      status: row.status,
      source: row.source,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      occupancyEndsAt: row.occupancy_ends_at,
      partySize: row.party_size,
      guestFirstName: row.guest_first_name,
      guestLastName: row.guest_last_name,
      guestPhone: row.guest_phone_e164,
      guestEmail: row.guest_email,
      locale: row.locale,
      specialRequests: row.special_requests,
      tableId: table?.id ?? null,
      tableCode: table?.code ?? null,
      areaSlug: area?.slug ?? null,
      createdAt: row.created_at,
      seatedAt: row.seated_at,
      notification: notification
        ? {
            id: notification.id,
            status: notification.status,
            type: notification.type,
            lastError: notification.last_error,
          }
        : null,
    };
  });
}

export async function getReservation(
  venueId: string,
  reservationId: string,
): Promise<StaffReservationView | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('reservations')
    .select('starts_at')
    .eq('venue_id', venueId)
    .eq('id', reservationId)
    .maybeSingle<Pick<ReservationRow, 'starts_at'>>();
  if (!data) return null;

  // Reuse the list path so a detail page and a list row can never disagree
  // about a reservation's table, area or notification state. Windowing it to
  // the booking's own local day keeps it to one small query.
  const day = toLocalDateString(new Date(data.starts_at));
  const rows = await listReservations(venueId, { from: day, to: day, limit: 200 });
  return rows.find((row) => row.id === reservationId) ?? null;
}

/** Audit history for one reservation, newest first. */
export async function getReservationAudit(reservationId: string): Promise<AuditLogRow[]> {
  const { data, error } = await getAdminClient()
    .from('audit_log')
    .select('*')
    .eq('entity_type', 'reservation')
    .eq('entity_id', reservationId)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<AuditLogRow[]>();
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface StaffCreateInput {
  venueId: string;
  actorId: string;
  tableId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  partySize: number;
  firstName: string;
  lastName: string;
  email?: string;
  phoneE164: string;
  locale: string;
  specialRequests?: string;
  source: 'phone' | 'walk_in' | 'staff';
  seatImmediately: boolean;
  privacyAccepted: boolean;
  marketingConsent: boolean;
  idempotencyKey?: string;
}

export async function createStaffReservation(input: StaffCreateInput): Promise<
  | {
      ok: true;
      reservationId: string;
      confirmationCode: string;
      managementToken: string;
      idempotent: boolean;
    }
  | { ok: false; code: string }
> {
  const startsAt = parseLocalDateTime(input.date, input.time).instant;
  const managementToken = generateToken();
  const expiresAt = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString();

  const result = await callFunction<{ ok: boolean; code?: string; [k: string]: unknown }>(
    'gg_create_staff_reservation',
    {
      p_venue_id: input.venueId,
      p_actor_id: input.actorId,
      p_table_id: input.tableId,
      p_starts_at: startsAt.toISOString(),
      p_duration_minutes: input.durationMinutes ?? null,
      p_guest: {
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email ?? '',
        phone_e164: input.phoneE164,
        locale: input.locale,
        party_size: input.partySize,
        special_requests: input.specialRequests ?? '',
        privacy_accepted: input.privacyAccepted,
        marketing_consent: input.marketingConsent,
      },
      p_source: input.source,
      p_status: input.seatImmediately ? 'seated' : 'confirmed',
      p_management_token_hash: hashToken(managementToken),
      p_management_token_expires_at: expiresAt,
      p_idempotency_key: input.idempotencyKey ?? null,
    },
  );

  if (!result?.ok) return { ok: false, code: String(result?.code ?? 'unknown') };

  return {
    ok: true,
    reservationId: String(result.reservation_id),
    confirmationCode: String(result.confirmation_code),
    managementToken,
    idempotent: Boolean(result.idempotent),
  };
}

export async function rescheduleReservation(
  reservationId: string,
  actorId: string,
  changes: {
    date?: string;
    time?: string;
    tableId?: string;
    durationMinutes?: number;
    partySize?: number;
  },
): Promise<{ ok: true; startsAt: string; tableCode: string } | { ok: false; code: string }> {
  const startsAt =
    changes.date && changes.time
      ? parseLocalDateTime(changes.date, changes.time).instant.toISOString()
      : null;

  const result = await callFunction<{ ok: boolean; code?: string; [k: string]: unknown }>(
    'gg_reschedule_reservation',
    {
      p_reservation_id: reservationId,
      p_actor_id: actorId,
      p_new_starts_at: startsAt,
      p_new_table_id: changes.tableId ?? null,
      p_new_duration_minutes: changes.durationMinutes ?? null,
      p_new_party_size: changes.partySize ?? null,
      // Staff move bookings for guests who are already in the building; the
      // 30-minute notice rule is for the public form, not for the host stand.
      p_enforce_lead_time: false,
    },
  );

  if (!result?.ok) return { ok: false, code: String(result?.code ?? 'unknown') };
  return {
    ok: true,
    startsAt: String(result.starts_at),
    tableCode: String(result.table_code ?? ''),
  };
}

export async function setReservationStatus(
  reservationId: string,
  actorId: string,
  status: Exclude<ReservationStatus, 'cancelled'>,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const result = await callFunction<{ ok: boolean; code?: string }>('gg_set_reservation_status', {
    p_reservation_id: reservationId,
    p_actor_id: actorId,
    p_status: status,
  });
  return result?.ok ? { ok: true } : { ok: false, code: String(result?.code ?? 'unknown') };
}

export async function cancelReservation(
  reservationId: string,
  actorId: string,
  reason: string,
  notify = true,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const result = await callFunction<{ ok: boolean; code?: string }>('gg_cancel_reservation', {
    p_reservation_id: reservationId,
    p_actor_id: actorId,
    p_reason: reason,
    p_by_staff: true,
    p_notify: notify,
  });
  return result?.ok ? { ok: true } : { ok: false, code: String(result?.code ?? 'unknown') };
}

/** Guest contact details and notes. Never the time or the table — those move
 *  through the allocation, so they go through `rescheduleReservation`. */
export async function updateGuestDetails(
  venueId: string,
  reservationId: string,
  actorId: string,
  changes: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneE164?: string;
    specialRequests?: string;
  },
): Promise<{ ok: true } | { ok: false; code: string }> {
  const supabase = getAdminClient();

  const patch: Record<string, unknown> = {};
  if (changes.firstName !== undefined) patch.guest_first_name = changes.firstName;
  if (changes.lastName !== undefined) patch.guest_last_name = changes.lastName;
  if (changes.email !== undefined) patch.guest_email = changes.email || null;
  if (changes.phoneE164 !== undefined) patch.guest_phone_e164 = changes.phoneE164;
  if (changes.specialRequests !== undefined)
    patch.special_requests = changes.specialRequests || null;

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase
    .from('reservations')
    .update(patch)
    .eq('id', reservationId)
    .eq('venue_id', venueId);

  if (error) return { ok: false, code: 'update_failed' };

  await supabase.from('audit_log').insert({
    venue_id: venueId,
    actor_id: actorId,
    actor_label: 'staff',
    action: 'reservation.details_edited',
    entity_type: 'reservation',
    entity_id: reservationId,
    // Which fields changed, never their values: a name and a telephone number
    // in an audit payload is the audit log becoming a second copy of the CRM.
    payload: { fields: Object.keys(patch) },
  });

  return { ok: true };
}

export async function resendNotification(
  notificationId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const result = await callFunction<{ ok: boolean; code?: string }>('gg_retry_notification', {
    p_id: notificationId,
    p_actor_id: actorId,
  });
  return result?.ok ? { ok: true } : { ok: false, code: String(result?.code ?? 'unknown') };
}
