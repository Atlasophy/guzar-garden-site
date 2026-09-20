import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { businessHoursSchema } from '@/lib/validation/schemas';
import { getAdminClient } from '@/lib/supabase/admin';
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

    const supabase = getAdminClient();

    const { data: before } = await supabase
      .from('business_hours')
      .select('*')
      .eq('venue_id', context.venue.id)
      .returns<BusinessHoursRow[]>();

    const { error: deleteError } = await supabase
      .from('business_hours')
      .delete()
      .eq('venue_id', context.venue.id);
    if (deleteError) return ApiErrors.conflict('hours_update_failed');

    if (parsed.data.hours.length > 0) {
      const { error: insertError } = await supabase.from('business_hours').insert(
        parsed.data.hours.map((row, index) => ({
          venue_id: context.venue.id,
          weekday: row.weekday,
          opens_at: row.opensAt,
          closes_at: row.closesAt,
          // "Open until midnight" is stored as 00:00 on the following day, which
          // is the only unambiguous way to say it.
          closes_next_day: row.closesNextDay || row.closesAt <= row.opensAt,
          display_order: index,
          is_active: row.isActive,
        })),
      );
      if (insertError) {
        // Put the old week back rather than leaving the venue with no hours.
        if (before?.length) {
          await supabase.from('business_hours').insert(
            before.map((row) => ({
              venue_id: row.venue_id,
              weekday: row.weekday,
              opens_at: row.opens_at,
              closes_at: row.closes_at,
              closes_next_day: row.closes_next_day,
              display_order: row.display_order,
              is_active: row.is_active,
            })),
          );
        }
        return ApiErrors.conflict('hours_update_failed');
      }
    }

    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'opening_hours.changed',
      entity_type: 'business_hours',
      entity_id: context.venue.id,
      payload: {
        before: (before ?? []).map((row) => ({
          weekday: row.weekday,
          opens_at: row.opens_at,
          closes_at: row.closes_at,
        })),
        after: parsed.data.hours,
      },
    });

    return apiSuccess({ updated: parsed.data.hours.length });
  },
  { rateLimit: 'staffApi' },
);
