import { route } from '@/lib/api/handler';
import { apiSuccess } from '@/lib/api/response';
import { releaseHold } from '@/lib/reservations/service';
import { readBookingSession } from '@/lib/security/request';
import { looksLikeToken } from '@/lib/security/tokens';

/** Best-effort hold release used by navigator.sendBeacon when a tab is hidden. */
export const POST = route(
  async (_request: Request, { params }: { params: Promise<{ token: string }> }) => {
    const { token } = await params;
    if (!looksLikeToken(token)) return apiSuccess({ released: 0 });

    const session = await readBookingSession();
    if (!session) return apiSuccess({ released: 0 });

    const result = await releaseHold(token, session);
    return apiSuccess({ released: result.released });
  },
  { rateLimit: 'holdRelease' },
);
