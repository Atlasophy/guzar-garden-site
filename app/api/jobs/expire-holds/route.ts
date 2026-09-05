import { route } from '@/lib/api/handler';
import { ApiErrors, apiSuccess } from '@/lib/api/response';
import { getAdminClient } from '@/lib/supabase/admin';
import { hasValidCronSecret } from '@/lib/security/request';
import { logEvent } from '@/lib/security/redact';

/**
 * POST /api/jobs/expire-holds
 *
 * Releases holds whose clock has run out.
 *
 * This is the backstop, not the primary mechanism: every availability read and
 * every hold attempt sweeps first, so a table a guest walked away from is
 * usually free again before this job runs. What the job covers is the case
 * nobody looks at — a quiet Tuesday afternoon where a stale hold would
 * otherwise sit on a table until somebody happened to query it.
 *
 * Idempotent by construction: an already-expired row is not in the WHERE clause,
 * so running it twice, or twice at once, costs nothing.
 */
export const dynamic = 'force-dynamic';

export const POST = route(
  async (request: Request) => {
    if (!hasValidCronSecret(request)) return ApiErrors.unauthenticated();

    const { data, error } = await getAdminClient().rpc('gg_expire_stale_holds', {
      p_venue_id: null,
      p_table_id: null,
    });

    if (error) {
      logEvent('error', 'job.expire_holds_failed', { message: error.message });
      return ApiErrors.serverError();
    }

    const expired = Number(data ?? 0);
    if (expired > 0) logEvent('info', 'job.holds_expired', { expired });
    return apiSuccess({ expired });
  },
  { skipOriginCheck: true },
);

export const GET = POST;
