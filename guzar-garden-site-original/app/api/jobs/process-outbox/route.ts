import { route } from '@/lib/api/handler';
import { ApiErrors, apiSuccess } from '@/lib/api/response';
import { hasValidCronSecret } from '@/lib/security/request';
import { processOutbox } from '@/lib/notifications/outbox';
import { logEvent } from '@/lib/security/redact';

/**
 * POST /api/jobs/process-outbox
 *
 * Sends what is owed and retries what failed.
 *
 * The confirmation route kicks this off inline so most texts go out
 * immediately; this is what catches the ones that did not — a Twilio outage, a
 * function that died mid-send, a message whose backoff has now elapsed.
 *
 * Claiming happens inside the database with `for update skip locked`, so two
 * overlapping ticks cannot send the same message twice.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = route(
  async (request: Request) => {
    if (!hasValidCronSecret(request)) return ApiErrors.unauthenticated();

    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 25);
    const result = await processOutbox(Number.isFinite(limit) ? limit : 25);

    if (result.claimed > 0) logEvent('info', 'job.outbox_processed', { ...result });
    return apiSuccess(result);
  },
  { skipOriginCheck: true },
);

export const GET = POST;
