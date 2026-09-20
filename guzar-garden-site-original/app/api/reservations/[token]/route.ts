import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { manageReservationSchema } from '@/lib/validation/schemas';
import {
  cancelByManagementToken,
  getReservationForGuest,
  rescheduleByManagementToken,
} from '@/lib/reservations/service';
import { looksLikeToken } from '@/lib/security/tokens';
import { processOutbox } from '@/lib/notifications/outbox';
import { logEvent } from '@/lib/security/redact';

/**
 * GET   /api/reservations/[token]  — the guest's own view of their booking
 * PATCH /api/reservations/[token]  — cancel, or move it
 *
 * `[token]` is the high-entropy management token, not the reservation id and
 * not the confirmation code. Only its HMAC is stored, so this route can verify
 * it and the database cannot reproduce it. An unknown or expired token gets a
 * plain 404 with nothing to distinguish "never existed" from "expired" —
 * anything more would turn this into an oracle.
 *
 * The rate limit here is the one that matters most on the public surface: a
 * 256-bit token is not guessable, but the endpoint should not be usable as free
 * compute either.
 */
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ token: string }>;
}

export const GET = route(
  async (_request: Request, { params }: Params) => {
    const { token } = await params;
    if (!looksLikeToken(token, 32)) return ApiErrors.notFound('reservation_not_found');

    const reservation = await getReservationForGuest(token);
    if (!reservation) return ApiErrors.notFound('reservation_not_found');

    return apiSuccess(reservation);
  },
  { rateLimit: 'managementLookup' },
);

export const PATCH = route(
  async (request: Request, { params }: Params) => {
    const { token } = await params;
    if (!looksLikeToken(token, 32)) return ApiErrors.notFound('reservation_not_found');

    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = manageReservationSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));

    if (parsed.data.action === 'cancel') {
      const result = await cancelByManagementToken(token, parsed.data.reason);
      if (!result.ok) {
        return result.code === 'reservation_not_found'
          ? ApiErrors.notFound(result.code)
          : ApiErrors.conflict(result.code);
      }
      processOutbox(5).catch((error) =>
        logEvent('warn', 'manage.outbox_kick_failed', { message: (error as Error).message }),
      );
      return apiSuccess({ cancelled: true, confirmationCode: result.confirmationCode });
    }

    const result = await rescheduleByManagementToken(
      token,
      parsed.data.date,
      parsed.data.time,
      parsed.data.tableId,
    );
    if (!result.ok) {
      return result.code === 'reservation_not_found'
        ? ApiErrors.notFound(result.code)
        : ApiErrors.conflict(result.code);
    }
    processOutbox(5).catch((error) =>
      logEvent('warn', 'manage.outbox_kick_failed', { message: (error as Error).message }),
    );
    return apiSuccess({ startsAt: result.startsAt, tableCode: result.tableCode });
  },
  { rateLimit: 'reservationManage' },
);
