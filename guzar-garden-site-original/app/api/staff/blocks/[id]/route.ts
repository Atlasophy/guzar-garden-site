import { route } from '@/lib/api/handler';
import { ApiErrors, apiSuccess } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { callFunction } from '@/lib/supabase/admin';

/** DELETE /api/staff/blocks/[id] — put a table back into service. */
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export const DELETE = route(
  async (_request: Request, { params }: Params) => {
    const context = await authorize('blocks.manage');
    const { id } = await params;

    const result = await callFunction<{ ok: boolean; code?: string }>('gg_remove_block', {
      p_allocation_id: id,
      p_actor_id: context.userId,
    });

    if (!result?.ok) return ApiErrors.notFound(String(result?.code ?? 'block_not_found'));
    return apiSuccess({ removed: true });
  },
  { rateLimit: 'staffApi' },
);
