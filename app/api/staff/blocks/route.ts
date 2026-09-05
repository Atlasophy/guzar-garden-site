import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { staffBlockSchema } from '@/lib/validation/schemas';
import { callFunction, getAdminClient } from '@/lib/supabase/admin';
import { addLocalDays, parseLocalDateTime } from '@/lib/time/warsaw';
import type { TableAllocationRow } from '@/lib/database/types';

/**
 * GET  /api/staff/blocks   — the blocks currently on the floor
 * POST /api/staff/blocks   — take a table out of service
 *
 * A block occupies a table exactly the way a booking does — same table, same
 * exclusion constraint — which is the whole point: nothing can be sold on top
 * of a table with a broken leg, whether the seller is a guest, a host or the
 * host's own reschedule.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async (_request: Request) => {
    const context = await authorize('floor.view');
    const { data, error } = await getAdminClient()
      .from('table_allocations')
      .select('*')
      .eq('venue_id', context.venue.id)
      .eq('kind', 'block')
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('starts_at')
      .returns<TableAllocationRow[]>();

    if (error) return ApiErrors.serverError();
    return apiSuccess({ blocks: data ?? [] });
  },
  { rateLimit: 'staffApi' },
);

export const POST = route(
  async (request: Request) => {
    const context = await authorize('blocks.manage');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = staffBlockSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;

    const startsAt = parseLocalDateTime(input.date, input.startTime).instant;
    // A block that runs past midnight — "closed from 23:00 until the carpenter
    // comes at 09:00" — is the normal case for maintenance, not an edge case.
    const endDate =
      input.endsNextDay || input.endTime <= input.startTime
        ? addLocalDays(input.date, 1)
        : input.date;
    const endsAt = parseLocalDateTime(endDate, input.endTime).instant;

    const result = await callFunction<{ ok: boolean; code?: string; allocation_id?: string }>(
      'gg_create_block',
      {
        p_venue_id: context.venue.id,
        p_actor_id: context.userId,
        p_table_id: input.tableId,
        p_starts_at: startsAt.toISOString(),
        p_ends_at: endsAt.toISOString(),
        p_reason: input.reason,
      },
    );

    if (!result?.ok) {
      return result?.code === 'table_unavailable'
        ? ApiErrors.conflict(
            'table_unavailable',
            'Something is already booked on that table in that window.',
          )
        : ApiErrors.conflict(String(result?.code ?? 'block_failed'));
    }

    return apiSuccess({ allocationId: result.allocation_id });
  },
  { rateLimit: 'staffApi' },
);
