import { route } from '@/lib/api/handler';
import { ApiErrors, apiSuccess } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { resendNotification } from '@/lib/staff/reservations';
import { processOutbox } from '@/lib/notifications/outbox';

/**
 * POST /api/staff/notifications/[id]
 *
 * Queue a failed message for another attempt. The retry counter is reset and
 * the row goes back to `pending`, so the worker picks it up on its next pass —
 * and the attempt is kicked off here so a member of staff standing at the host
 * stand sees the result rather than waiting for a cron tick.
 */
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export const POST = route(
  async (_request: Request, { params }: Params) => {
    const context = await authorize('reservations.resend_notification');
    const { id } = await params;

    const result = await resendNotification(id, context.userId);
    if (!result.ok) return ApiErrors.notFound(result.code);

    const processed = await processOutbox(5).catch(() => null);
    return apiSuccess({ queued: true, processed });
  },
  { rateLimit: 'staffApi' },
);
