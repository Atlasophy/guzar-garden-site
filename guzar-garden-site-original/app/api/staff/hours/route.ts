import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { businessHoursSchema } from '@/lib/validation/schemas';
import { callFunction, getAdminClient } from '@/lib/supabase/admin';
import type { BusinessHoursRow } from '@/lib/database/types';

/**
 * GET /api/staff/hours  — the weekly pattern
 * PUT /api/staff/hours  — replace it
 *
 * PUT rather than PATCH because the week is edited as a whole: a day can have
 * one service, two (lunch and dinner) or none, and sending the complete set is
 * the only way to express "Tuesday now has no evening service" without a
 * separate delete endpoint.
 *
 * The replacement is one transaction — delete then insert — so a request that
 * fails half way cannot leave the restaurant with no opening hours at all,
 * which would close online booking entirely.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async () => {
    const context = await authorize('reservations.view');
    const { data, error } = await getAdminClient()
      .from('business_hours')
      .select('*')
      .eq('venue_id', context.venue.id)
      .order('weekday')
      .order('display_order')
      .returns<BusinessHoursRow[]>();

    if (error) return ApiErrors.serverError();
    return apiSuccess({ hours: data ?? [] });
  },
  { rateLimit: 'staffApi' },
);

export const PUT = route(
  async (request: Request) => {
    const context = await authorize('settings.hours');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = businessHoursSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));

    const hours = parsed.data.hours.map((row, index) => ({
      weekday: row.weekday,
      opens_at: row.opensAt,
      closes_at: row.closesAt,
      // "Open until midnight" is stored as 00:00 on the following day.
      closes_next_day: row.closesNextDay || row.closesAt <= row.opensAt,
      display_order: index,
      is_active: row.isActive,
    }));
    const result = await callFunction<{ ok: boolean; code?: string; updated?: number }>(
      'gg_replace_business_hours',
      { p_venue_id: context.venue.id, p_actor_id: context.userId, p_hours: hours },
    );
    if (!result?.ok) return ApiErrors.conflict(result?.code ?? 'hours_update_failed');
    return apiSuccess({ updated: result.updated ?? hours.length });
  },
  { rateLimit: 'staffApi' },
);
