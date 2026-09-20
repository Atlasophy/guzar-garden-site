import 'server-only';
import { callFunction, getAdminClient } from '@/lib/supabase/admin';
import { generateToken, hashSessionId, hashToken } from '@/lib/security/tokens';
import { logEvent, redactToken } from '@/lib/security/redact';
import { parseLocalDateTime } from '@/lib/time/warsaw';
import type { Locale } from '@/lib/i18n/locales';
import type {
  DiningAreaRow,
  ReservationRow,
  ReservationSettingsRow,
  RestaurantTableRow,
  TableAllocationRow,
  VenueRow,
  NotificationOutboxRow,
} from '@/lib/database/types';
import { loadVenueContext } from '@/lib/availability/service';
import { isReservationPreviewMode } from '@/lib/config/env';
import {
  confirmPreviewReservation,
  createPreviewHold,
  describePreviewHold,
  getPreviewReservationSummary,
  releasePreviewHold,
} from '@/lib/reservations/preview-store';

/**
 * Reservation operations.
 *
 * Every one of them is a thin, typed wrapper over a SQL function. That is
 * deliberate: the interesting part of a booking system is what happens between
 * "is the table free" and "the table is mine", and there is no way to make that
 * safe from application code. The function does it inside one transaction with
 * the exclusion constraint underneath, and this file's job is to generate the
 * tokens, shape the arguments, and translate outcomes into something a route
 * handler can return without leaking anything.
 */

export type ReservationErrorCode =
  | 'venue_unavailable'
  | 'settings_missing'
  | 'table_unavailable'
  | 'capacity_mismatch'
  | 'party_too_large'
  | 'outside_opening_hours'
  | 'area_unavailable'
  | 'too_soon'
  | 'beyond_horizon'
  | 'invalid_window'
  | 'hold_not_found'
  | 'hold_expired'
  | 'duplicate_hold'
  | 'reservation_not_found'
  | 'reservation_closed'
  | 'allocation_missing'
  | 'code_generation_failed'
  | 'cutoff_passed'
  | 'unknown';

export type ReservationOutcome<T> = ({ ok: true } & T) | { ok: false; code: ReservationErrorCode };

interface RawResult {
  ok: boolean;
  code?: string;
  [key: string]: unknown;
}

function fail(code: string | undefined): { ok: false; code: ReservationErrorCode } {
  return { ok: false, code: (code as ReservationErrorCode) ?? 'unknown' };
}

// ---------------------------------------------------------------------------
// Holds
// ---------------------------------------------------------------------------

export interface CreateHoldRequest {
  venueSlug: string;
  tableId: string;
  /** Warsaw-local date and time. */
  date: string;
  time: string;
  partySize: number;
  /** The anonymous booking-session id from the http-only cookie. */
  sessionId: string;
}

export interface CreateHoldSuccess {
  /** Handed to the browser once. Only its hash is stored. */
  holdToken: string;
  tableId: string;
  tableCode: string;
  diningAreaId: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  serverNow: string;
}

export async function createHold(
  request: CreateHoldRequest,
): Promise<ReservationOutcome<CreateHoldSuccess>> {
  if (isReservationPreviewMode()) return createPreviewHold(request);

  const context = await loadVenueContext(request.venueSlug);
  if (!context) return fail('venue_unavailable');

  const startsAt = parseLocalDateTime(request.date, request.time).instant;
  const holdToken = generateToken();

  const result = await callFunction<RawResult>('gg_create_hold', {
    p_venue_id: context.venue.id,
    p_table_id: request.tableId,
    p_starts_at: startsAt.toISOString(),
    p_party_size: request.partySize,
    p_hold_token_hash: hashToken(holdToken),
    p_hold_session_hash: hashSessionId(request.sessionId),
  });

  if (!result?.ok) {
    logEvent('info', 'hold.rejected', { code: result?.code, table_id: request.tableId });
    return fail(result?.code);
  }

  return {
    ok: true,
    holdToken,
    tableId: String(result.table_id),
    tableCode: String(result.table_code),
    diningAreaId: String(result.dining_area_id),
    startsAt: String(result.starts_at),
    endsAt: String(result.ends_at),
    expiresAt: String(result.expires_at),
    serverNow: String(result.server_now),
  };
}

export async function releaseHold(
  holdToken: string,
  sessionId: string,
): Promise<{ ok: true; released: number }> {
  if (isReservationPreviewMode()) return releasePreviewHold(holdToken, sessionId);

  const result = await callFunction<RawResult>('gg_release_hold', {
    p_hold_token_hash: hashToken(holdToken),
    p_hold_session_hash: hashSessionId(sessionId),
  });
  return { ok: true, released: Number(result?.released ?? 0) };
}

/** Live state of a hold, for the countdown and for recovering a reload. */
export async function describeHold(
  holdToken: string,
  sessionId: string,
): Promise<
  | { ok: true; tableId: string; startsAt: string; expiresAt: string; serverNow: string }
  | { ok: false; code: 'hold_not_found' | 'hold_expired' }
> {
  if (isReservationPreviewMode()) return describePreviewHold(holdToken, sessionId);

  const { data, error } = await getAdminClient()
    .from('table_allocations')
    .select('table_id, starts_at, hold_expires_at, status, hold_session_hash')
    .eq('hold_token_hash', hashToken(holdToken))
    .eq('kind', 'hold')
    .maybeSingle<
      Pick<
        TableAllocationRow,
        'table_id' | 'starts_at' | 'hold_expires_at' | 'status' | 'hold_session_hash'
      >
    >();

  if (error) throw error;
  if (!data || data.hold_session_hash !== hashSessionId(sessionId)) {
    return { ok: false, code: 'hold_not_found' };
  }
  if (data.status !== 'active' || !data.hold_expires_at) {
    return { ok: false, code: 'hold_expired' };
  }
  if (new Date(data.hold_expires_at).getTime() <= Date.now()) {
    return { ok: false, code: 'hold_expired' };
  }

  return {
    ok: true,
    tableId: data.table_id,
    startsAt: data.starts_at,
    expiresAt: data.hold_expires_at,
    serverNow: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------

export interface ConfirmReservationRequest {
  venueSlug: string;
  holdToken: string;
  sessionId: string;
  idempotencyKey: string;
  guest: {
    firstName: string;
    lastName: string;
    email?: string;
    phoneE164: string;
    locale: Locale;
    partySize: number;
    specialRequests?: string;
    marketingConsent: boolean;
  };
}

export interface ConfirmReservationSuccess {
  reservationId: string;
  confirmationCode: string;
  startsAt: string;
  endsAt: string;
  tableCode: string;
  /** Handed to the guest once, in the management URL. Only its hash is stored. */
  managementToken: string;
  /** True when this call found an existing reservation for the same key. */
  idempotent: boolean;
}

/** How long a management link stays usable after the sitting. */
const MANAGEMENT_TOKEN_LIFETIME_DAYS = 120;

export async function confirmReservation(
  request: ConfirmReservationRequest,
): Promise<ReservationOutcome<ConfirmReservationSuccess>> {
  if (isReservationPreviewMode()) return confirmPreviewReservation(request);

  const context = await loadVenueContext(request.venueSlug);
  if (!context) return fail('venue_unavailable');

  const managementToken = generateToken();
  const expiresAt = new Date(
    Date.now() + MANAGEMENT_TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const result = await callFunction<RawResult>('gg_confirm_reservation', {
    p_venue_id: context.venue.id,
    p_hold_token_hash: hashToken(request.holdToken),
    p_hold_session_hash: hashSessionId(request.sessionId),
    p_guest: {
      first_name: request.guest.firstName,
      last_name: request.guest.lastName,
      email: request.guest.email ?? '',
      phone_e164: request.guest.phoneE164,
      locale: request.guest.locale,
      party_size: request.guest.partySize,
      special_requests: request.guest.specialRequests ?? '',
      marketing_consent: request.guest.marketingConsent,
      source: 'website',
    },
    p_management_token_hash: hashToken(managementToken),
    p_management_token_expires_at: expiresAt,
    p_idempotency_key: request.idempotencyKey,
  });

  if (!result?.ok) {
    logEvent('info', 'reservation.rejected', {
      code: result?.code,
      hold: redactToken(request.holdToken),
    });
    return fail(result?.code);
  }

  const idempotent = Boolean(result.idempotent);

  // A retry of an already-committed submission must not mint a second
  // management link — the guest already has one, and re-issuing would silently
  // invalidate the link in their SMS.
  if (idempotent) {
    return {
      ok: true,
      reservationId: String(result.reservation_id),
      confirmationCode: String(result.confirmation_code),
      startsAt: String(result.starts_at),
      endsAt: String(result.ends_at),
      tableCode: String(result.table_code ?? ''),
      managementToken: '',
      idempotent: true,
    };
  }

  return {
    ok: true,
    reservationId: String(result.reservation_id),
    confirmationCode: String(result.confirmation_code),
    startsAt: String(result.starts_at),
    endsAt: String(result.ends_at),
    tableCode: String(result.table_code ?? ''),
    managementToken,
    idempotent: false,
  };
}

// ---------------------------------------------------------------------------
// Guest self-service
// ---------------------------------------------------------------------------

export interface GuestReservationView {
  confirmationCode: string;
  status: ReservationRow['status'];
  startsAt: string;
  endsAt: string;
  partySize: number;
  firstName: string;
  lastName: string;
  locale: string;
  specialRequests: string | null;
  tableCode: string | null;
  areaSlug: string | null;
  areaName: Record<string, string | null> | null;
  venue: {
    name: string;
    phone: string;
    addressLine: string;
    postalCode: string;
    city: string;
  };
  policy: {
    cancellationCutoffMinutes: number;
    cancellationPolicy: Record<string, string>;
  };
  /** Whether the guest may still act on it themselves. */
  canCancel: boolean;
  canReschedule: boolean;
  notification: { status: string; deliveredAt: string | null } | null;
  serverNow: string;
}

interface ReservationLookup {
  reservation: ReservationRow;
  venue: VenueRow;
  settings: ReservationSettingsRow;
  table: RestaurantTableRow | null;
  area: DiningAreaRow | null;
}

async function lookupByManagementToken(token: string): Promise<ReservationLookup | null> {
  const supabase = getAdminClient();

  const { data: reservation, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('management_token_hash', hashToken(token))
    .maybeSingle<ReservationRow>();

  if (error) throw error;
  if (!reservation) return null;

  if (
    reservation.management_token_expires_at &&
    new Date(reservation.management_token_expires_at).getTime() < Date.now()
  ) {
    return null;
  }

  const [venueResult, settingsResult, allocationResult] = await Promise.all([
    supabase.from('venues').select('*').eq('id', reservation.venue_id).single<VenueRow>(),
    supabase
      .from('reservation_settings')
      .select('*')
      .eq('venue_id', reservation.venue_id)
      .single<ReservationSettingsRow>(),
    supabase
      .from('table_allocations')
      .select('table_id')
      .eq('reservation_id', reservation.id)
      .eq('status', 'active')
      .limit(1)
      .returns<Pick<TableAllocationRow, 'table_id'>[]>(),
  ]);

  if (venueResult.error) throw venueResult.error;
  if (settingsResult.error) throw settingsResult.error;

  let table: RestaurantTableRow | null = null;
  let area: DiningAreaRow | null = null;
  const tableId = allocationResult.data?.[0]?.table_id;
  if (tableId) {
    const { data: tableRow } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('id', tableId)
      .maybeSingle<RestaurantTableRow>();
    table = tableRow ?? null;
    if (table) {
      const { data: areaRow } = await supabase
        .from('dining_areas')
        .select('*')
        .eq('id', table.dining_area_id)
        .maybeSingle<DiningAreaRow>();
      area = areaRow ?? null;
    }
  }

  return { reservation, venue: venueResult.data, settings: settingsResult.data, table, area };
}

export async function getReservationForGuest(token: string): Promise<GuestReservationView | null> {
  const found = await lookupByManagementToken(token);
  if (!found) return null;

  const { reservation, venue, settings, table, area } = found;
  const now = Date.now();
  const cutoffMs = settings.cancellation_cutoff_minutes * 60_000;
  const startsAtMs = new Date(reservation.starts_at).getTime();
  const beforeCutoff = startsAtMs - now > cutoffMs;
  const isLive = reservation.status === 'confirmed' || reservation.status === 'pending';

  const { data: notification } = await getAdminClient()
    .from('notification_outbox')
    .select('status, delivered_at')
    .eq('reservation_id', reservation.id)
    .eq('type', 'reservation_confirmation')
    .order('created_at', { ascending: false })
    .limit(1)
    .returns<Pick<NotificationOutboxRow, 'status' | 'delivered_at'>[]>();

  return {
    confirmationCode: reservation.confirmation_code,
    status: reservation.status,
    startsAt: reservation.starts_at,
    endsAt: reservation.ends_at,
    partySize: reservation.party_size,
    firstName: reservation.guest_first_name,
    lastName: reservation.guest_last_name,
    locale: reservation.locale,
    specialRequests: reservation.special_requests,
    tableCode: table?.code ?? null,
    areaSlug: area?.slug ?? null,
    areaName: area
      ? {
          pl: area.name_pl,
          en: area.name_en,
          ru: area.name_ru,
          uz: area.name_uz,
        }
      : null,
    venue: {
      name: venue.name,
      phone: venue.phone_e164,
      addressLine: venue.address_line,
      postalCode: venue.postal_code,
      city: venue.city,
    },
    policy: {
      cancellationCutoffMinutes: settings.cancellation_cutoff_minutes,
      cancellationPolicy: {
        pl: settings.cancellation_policy_pl,
        en: settings.cancellation_policy_en,
        ru: settings.cancellation_policy_ru,
        uz: settings.cancellation_policy_uz,
      },
    },
    canCancel: isLive && beforeCutoff,
    canReschedule: isLive && beforeCutoff,
    notification: notification?.[0]
      ? { status: notification[0].status, deliveredAt: notification[0].delivered_at }
      : null,
    serverNow: new Date().toISOString(),
  };
}

export async function cancelByManagementToken(
  token: string,
  reason?: string,
): Promise<ReservationOutcome<{ confirmationCode: string }>> {
  const found = await lookupByManagementToken(token);
  if (!found) return fail('reservation_not_found');

  const cutoffMs = found.settings.cancellation_cutoff_minutes * 60_000;
  if (new Date(found.reservation.starts_at).getTime() - Date.now() <= cutoffMs) {
    return fail('cutoff_passed');
  }

  const result = await callFunction<RawResult>('gg_cancel_reservation', {
    p_reservation_id: found.reservation.id,
    p_actor_id: null,
    p_reason: reason?.slice(0, 300) ?? 'Cancelled by guest',
    p_by_staff: false,
    p_notify: true,
  });

  if (!result?.ok) return fail(result?.code);
  return { ok: true, confirmationCode: String(result.confirmation_code) };
}

export async function rescheduleByManagementToken(
  token: string,
  date: string,
  time: string,
  tableId?: string,
): Promise<ReservationOutcome<{ startsAt: string; tableCode: string }>> {
  const found = await lookupByManagementToken(token);
  if (!found) return fail('reservation_not_found');

  const cutoffMs = found.settings.cancellation_cutoff_minutes * 60_000;
  if (new Date(found.reservation.starts_at).getTime() - Date.now() <= cutoffMs) {
    return fail('cutoff_passed');
  }

  const startsAt = parseLocalDateTime(date, time).instant;

  const result = await callFunction<RawResult>('gg_reschedule_reservation', {
    p_reservation_id: found.reservation.id,
    p_actor_id: null,
    p_new_starts_at: startsAt.toISOString(),
    p_new_table_id: tableId ?? null,
    p_new_duration_minutes: null,
    p_new_party_size: null,
    // A guest moving their own booking is still subject to the notice rule.
    p_enforce_lead_time: true,
  });

  if (!result?.ok) return fail(result?.code);
  return {
    ok: true,
    startsAt: String(result.starts_at),
    tableCode: String(result.table_code ?? ''),
  };
}

/**
 * Public confirmation-code lookup.
 *
 * Returns only what is already printed on the guest's own confirmation and
 * nothing that identifies them, because a confirmation code is short enough to
 * guess at scale. The management token is what unlocks the full view.
 */
export async function getReservationSummaryByCode(
  venueSlug: string,
  code: string,
): Promise<{
  confirmationCode: string;
  status: ReservationRow['status'];
  startsAt: string;
  partySize: number;
} | null> {
  if (isReservationPreviewMode()) return getPreviewReservationSummary(code);

  const supabase = getAdminClient();
  const { data: venue } = await supabase
    .from('venues')
    .select('id')
    .eq('slug', venueSlug)
    .maybeSingle<{ id: string }>();
  if (!venue) return null;

  const { data } = await supabase
    .from('reservations')
    .select('confirmation_code, status, starts_at, party_size')
    .eq('venue_id', venue.id)
    .eq('confirmation_code', code.toUpperCase())
    .maybeSingle<
      Pick<ReservationRow, 'confirmation_code' | 'status' | 'starts_at' | 'party_size'>
    >();

  if (!data) return null;
  return {
    confirmationCode: data.confirmation_code,
    status: data.status,
    startsAt: data.starts_at,
    partySize: data.party_size,
  };
}
