import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { staffUpdateReservationSchema } from '@/lib/validation/schemas';
import {
  cancelReservation,
  getReservation,
  getReservationAudit,
  rescheduleReservation,
  resendNotification,
  setReservationStatus,
  updateGuestDetails,
} from '@/lib/staff/reservations';
import { processOutbox } from '@/lib/notifications/outbox';
import { logEvent } from '@/lib/security/redact';

/**
 * GET    /api/staff/reservations/[id]  — detail plus audit history
 * PATCH  /api/staff/reservations/[id]  — one named action per request
 * DELETE /api/staff/reservations/[id]  — cancel (never a hard delete)
 *
 * DELETE cancels rather than removes. A booking that vanishes takes its audit
 * trail and the answer to "why did the 20:00 table free up" with it; a
 * cancelled one keeps both and still releases the table.
 *
 * Each PATCH names one `action`, and every action that touches time or table
 * goes through `gg_reschedule_reservation` — one transaction, one conflict
 * check — rather than two writes with a gap between them.
 */
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = route(
  async (_request: Request, { params }: Params) => {
    const context = await authorize('reservations.view');
    const { id } = await params;

    const reservation = await getReservation(context.venue.id, id);
    if (!reservation) return ApiErrors.notFound('reservation_not_found');

    // The audit trail is a manager's tool; a host sees the booking, not who
    // changed what about it three weeks ago.
    const audit = context.profile.role === 'host' ? [] : await getReservationAudit(id);
    return apiSuccess({ reservation, audit });
  },
  { rateLimit: 'staffApi' },
);

export const PATCH = route(
  async (request: Request, { params }: Params) => {
    const { id } = await params;
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = staffUpdateReservationSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;

    switch (input.action) {
      case 'status': {
        if (!input.status) return ApiErrors.badRequest('status_required');
        // Seating and completing are a host's job; confirming a pending booking
        // changes the booking itself, so it needs a manager.
        const permission =
          input.status === 'seated'
            ? 'reservations.seat'
            : input.status === 'completed'
              ? 'reservations.complete'
              : input.status === 'no_show'
                ? 'reservations.no_show'
                : 'reservations.edit';
        const context = await authorize(permission);
        const result = await setReservationStatus(id, context.userId, input.status);
        return result.ok ? apiSuccess({ status: input.status }) : ApiErrors.conflict(result.code);
      }

      case 'update_details': {
        const context = await authorize('reservations.edit');
        const result = await updateGuestDetails(context.venue.id, id, context.userId, {
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.phone !== undefined ? { phoneE164: input.phone } : {}),
          ...(input.specialRequests !== undefined
            ? { specialRequests: input.specialRequests }
            : {}),
        });
        if (!result.ok) return ApiErrors.conflict(result.code);

        // Party size is checked against the table's capacity, so it goes
        // through the allocation path rather than a bare column update.
        if (input.partySize !== undefined) {
          const moved = await rescheduleReservation(id, context.userId, {
            partySize: input.partySize,
          });
          if (!moved.ok) return ApiErrors.conflict(moved.code);
        }
        return apiSuccess({ updated: true });
      }

      case 'reschedule':
      case 'move': {
        const permission =
          input.action === 'move' ? 'reservations.move_table' : 'reservations.reschedule';
        const context = await authorize(permission);
        const result = await rescheduleReservation(id, context.userId, {
          ...(input.date ? { date: input.date } : {}),
          ...(input.time ? { time: input.time } : {}),
          ...(input.tableId ? { tableId: input.tableId } : {}),
          ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
          ...(input.partySize ? { partySize: input.partySize } : {}),
        });
        if (!result.ok) {
          return result.code === 'table_unavailable'
            ? ApiErrors.conflict('table_unavailable')
            : ApiErrors.conflict(result.code);
        }
        processOutbox(5).catch((error) =>
          logEvent('warn', 'staff.outbox_kick_failed', { message: (error as Error).message }),
        );
        return apiSuccess({ startsAt: result.startsAt, tableCode: result.tableCode });
      }

      case 'cancel': {
        const context = await authorize('reservations.cancel');
        const result = await cancelReservation(
          id,
          context.userId,
          input.reason ?? 'Cancelled by staff',
        );
        if (!result.ok) return ApiErrors.conflict(result.code);
        processOutbox(5).catch(() => {});
        return apiSuccess({ cancelled: true });
      }

      case 'resend_notification': {
        const context = await authorize('reservations.resend_notification');
        if (!input.notificationId) return ApiErrors.badRequest('notification_required');
        const result = await resendNotification(input.notificationId, context.userId);
        if (!result.ok) return ApiErrors.conflict(result.code);
        processOutbox(5).catch(() => {});
        return apiSuccess({ queued: true });
      }

      default:
        return ApiErrors.badRequest('unknown_action');
    }
  },
  { rateLimit: 'staffApi' },
);

export const DELETE = route(
  async (request: Request, { params }: Params) => {
    const context = await authorize('reservations.cancel');
    const { id } = await params;
    const reason = new URL(request.url).searchParams.get('reason') ?? 'Cancelled by staff';

    const result = await cancelReservation(id, context.userId, reason.slice(0, 300));
    if (!result.ok) return ApiErrors.conflict(result.code);
    processOutbox(5).catch(() => {});
    return apiSuccess({ cancelled: true });
  },
  { rateLimit: 'staffApi' },
);
