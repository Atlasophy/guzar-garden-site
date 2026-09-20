import { route } from '@/lib/api/handler';
import { ApiErrors, apiSuccess } from '@/lib/api/response';
import { describeHold, releaseHold } from '@/lib/reservations/service';
import { readBookingSession } from '@/lib/security/request';
import { looksLikeToken } from '@/lib/security/tokens';

/**
 * GET    /api/holds/[token]   — how long is left, for the countdown
 * DELETE /api/holds/[token]   — give the table back
 *
 * The guest switching tables releases the old hold before taking the new one,
 * and closing the tab is covered by the hold's own expiry plus the sweep job.
 * `beforeunload` is not treated as a cleanup mechanism: it does not fire
 * reliably on mobile, and a booking system that depends on it leaks tables.
 */
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ token: string }>;
}

export const GET = route(
  async (_request: Request, { params }: Params) => {
    const { token } = await params;
    if (!looksLikeToken(token)) return ApiErrors.notFound('hold_not_found');

    const session = await readBookingSession();
    if (!session) return ApiErrors.notFound('hold_not_found');

    const result = await describeHold(token, session);
    if (!result.ok) return ApiErrors.notFound(result.code);

    return apiSuccess({
      tableId: result.tableId,
      startsAt: result.startsAt,
      expiresAt: result.expiresAt,
      serverNow: result.serverNow,
    });
  },
  { rateLimit: 'availability' },
);

export const DELETE = route(
  async (_request: Request, { params }: Params) => {
    const { token } = await params;
    if (!looksLikeToken(token)) {
      // Releasing something that was never a token is not an error worth
      // telling anyone about: the caller's intent is satisfied either way.
      return apiSuccess({ released: 0 });
    }

    const session = await readBookingSession();
    if (!session) return apiSuccess({ released: 0 });

    const result = await releaseHold(token, session);
    return apiSuccess({ released: result.released });
  },
  { rateLimit: 'holdRelease' },
);
