import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { staffCreateReservationSchema, staffReservationListSchema } from '@/lib/validation/schemas';
import { createStaffReservation, listReservations } from '@/lib/staff/reservations';
import { attachManagementUrl, processOutbox } from '@/lib/notifications/outbox';
import { logEvent } from '@/lib/security/redact';
import { getServerEnv } from '@/lib/config/env';

/**
 * GET  /api/staff/reservations   — list, filter and search
 * POST /api/staff/reservations   — a telephone booking or a walk-in
 *
 * Both go through `authorize`, which verifies the session with Supabase and
 * then checks the staff profile's role. Search results carry guest names and
 * telephone numbers, so this is one of the few endpoints where PII crosses the
 * wire — which is exactly why it is gated on the server rather than by hiding a
 * form.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async (request: Request) => {
    const context = await authorize('reservations.view');
    const url = new URL(request.url);

    const parsed = staffReservationListSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));

    const rows = await listReservations(context.venue.id, parsed.data);
    return apiSuccess({ reservations: rows, count: rows.length });
  },
  { rateLimit: 'staffApi' },
);

export const POST = route(
  async (request: Request) => {
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = staffCreateReservationSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));

    const input = parsed.data;
    const permission =
      input.source === 'walk_in' ? 'reservations.create_walk_in' : 'reservations.create_phone';
    const context = await authorize(permission);

    const result = await createStaffReservation({
      venueId: context.venue.id,
      actorId: context.userId,
      tableId: input.tableId,
      date: input.date,
      time: input.time,
      ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
      partySize: input.partySize,
      firstName: input.firstName,
      lastName: input.lastName || '—',
      ...(input.email ? { email: input.email } : {}),
      phoneE164: input.phone,
      locale: input.locale,
      ...(input.specialRequests ? { specialRequests: input.specialRequests } : {}),
      source: input.source,
      seatImmediately: input.seatImmediately,
      privacyAccepted: input.privacyAccepted,
      marketingConsent: input.marketingConsent,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });

    if (!result.ok) {
      return result.code === 'table_unavailable'
        ? ApiErrors.conflict('table_unavailable')
        : ApiErrors.conflict(result.code, 'The booking could not be created.');
    }

    if (input.notify && !result.idempotent) {
      const manageUrl = `${getServerEnv().APP_BASE_URL}/manage/${result.managementToken}`;
      await attachManagementUrl(result.reservationId, manageUrl).catch(() => {});
      processOutbox(5).catch((error) =>
        logEvent('warn', 'staff.outbox_kick_failed', { message: (error as Error).message }),
      );
    }

    return apiSuccess({
      reservationId: result.reservationId,
      confirmationCode: result.confirmationCode,
      idempotent: result.idempotent,
    });
  },
  { rateLimit: 'staffApi' },
);
