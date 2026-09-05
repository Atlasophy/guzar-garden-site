import { getServerEnv, isReservationPreviewMode, publicEnv } from '@/lib/config/env';
import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { createReservationSchema } from '@/lib/validation/schemas';
import { confirmReservation } from '@/lib/reservations/service';
import { readBookingSession } from '@/lib/security/request';
import { attachManagementUrl, processOutbox } from '@/lib/notifications/outbox';
import { logEvent } from '@/lib/security/redact';

/**
 * POST /api/reservations
 *
 * Turns a live hold into a confirmed booking.
 *
 * The order matters and is the point of the whole design:
 *
 *   1. the database commits the reservation, the allocation and an outbox row
 *      in one transaction;
 *   2. the guest is told it is confirmed — *after* that commit, never before;
 *   3. the SMS is attempted afterwards, and its failure cannot undo step 1.
 *
 * The attempt is kicked off here rather than left to the next cron tick so the
 * text usually arrives while the guest is still looking at the confirmation
 * page; if it throws, the row stays in the outbox and the worker retries.
 */
export const dynamic = 'force-dynamic';

export const POST = route(
  async (request: Request) => {
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));

    const session = await readBookingSession();
    if (!session) return ApiErrors.conflict('hold_not_found');

    const { guest } = parsed.data;
    const result = await confirmReservation({
      venueSlug: publicEnv.venueSlug,
      holdToken: parsed.data.holdToken,
      sessionId: session,
      idempotencyKey: parsed.data.idempotencyKey,
      guest: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        ...(guest.email ? { email: guest.email } : {}),
        phoneE164: guest.phone,
        locale: guest.locale,
        // Validated here; re-checked against the table's real capacity inside
        // the transaction, which is the check that counts.
        partySize: guest.partySize,
        ...(guest.specialRequests ? { specialRequests: guest.specialRequests } : {}),
        marketingConsent: guest.marketingConsent,
      },
    });

    if (!result.ok) {
      const conflictCodes = new Set([
        'table_unavailable',
        'hold_not_found',
        'hold_expired',
        'capacity_mismatch',
      ]);
      return conflictCodes.has(result.code)
        ? ApiErrors.conflict(result.code)
        : ApiErrors.conflict(result.code, 'The booking could not be completed.');
    }

    // The management link exists exactly once, here. It goes into the SMS and
    // into this response, and only its hash was stored.
    const manageUrl = result.managementToken
      ? `${getServerEnv().APP_BASE_URL}/manage/${result.managementToken}`
      : null;

    if (manageUrl) {
      await attachManagementUrl(result.reservationId, manageUrl).catch((error) => {
        logEvent('warn', 'reservation.manage_url_not_attached', {
          message: (error as Error).message,
        });
      });
    }

    // Fire the outbox now, but never let it fail the response: the booking is
    // already committed and the guest is already booked.
    if (!isReservationPreviewMode()) {
      processOutbox(5).catch((error) => {
        logEvent('warn', 'reservation.outbox_kick_failed', { message: (error as Error).message });
      });
    }

    return apiSuccess({
      confirmationCode: result.confirmationCode,
      startsAt: result.startsAt,
      endsAt: result.endsAt,
      tableCode: result.tableCode,
      manageUrl,
      idempotent: result.idempotent,
    });
  },
  { rateLimit: 'reservationCreate' },
);
