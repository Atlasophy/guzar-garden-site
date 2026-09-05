import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { serviceExceptionSchema } from '@/lib/validation/schemas';
import { getAdminClient } from '@/lib/supabase/admin';
import { parseLocalDateTime, addLocalDays } from '@/lib/time/warsaw';
import type { ServiceExceptionRow } from '@/lib/database/types';

/**
 * GET    /api/staff/exceptions        — closures, changed hours, private events
 * POST   /api/staff/exceptions        — add one
 * DELETE /api/staff/exceptions?id=    — remove one
 *
 * Four kinds, and the difference between them matters to guests:
 *
 *   closure         the venue is shut — no bookings that day
 *   modified_hours  it opens, on a different schedule
 *   private_event   it is taken; a venue-wide one closes booking, an
 *                   area-scoped one only closes that room
 *   area_closed     one room is out of use, the rest trades normally
 *
 * `is_public` decides whether the *reason* is shown to guests. "Maintenance
 * day" is fine to publish; the name on a wedding booking is not.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async (request: Request) => {
    const context = await authorize('reservations.view');
    const from = new URL(request.url).searchParams.get('from');
    const since = from
      ? parseLocalDateTime(from, '00:00').instant
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data, error } = await getAdminClient()
      .from('service_exceptions')
      .select('*')
      .eq('venue_id', context.venue.id)
      .gte('ends_at', since.toISOString())
      .order('starts_at')
      .returns<ServiceExceptionRow[]>();

    if (error) return ApiErrors.serverError();
    return apiSuccess({ exceptions: data ?? [] });
  },
  { rateLimit: 'staffApi' },
);

export const POST = route(
  async (request: Request) => {
    const context = await authorize('settings.hours');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = serviceExceptionSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;

    const startsAt = parseLocalDateTime(input.startDate, input.startTime).instant;
    // "00:00" as an end time means the end of that day, not its beginning.
    const endDate = input.endTime === '00:00' ? addLocalDays(input.endDate, 1) : input.endDate;
    const endsAt = parseLocalDateTime(endDate, input.endTime).instant;

    if (endsAt <= startsAt) return ApiErrors.validation({ endDate: 'window_invalid' });

    if (input.kind === 'area_closed' && !input.diningAreaId) {
      return ApiErrors.validation({ diningAreaId: 'area_required' });
    }
    if (
      input.kind === 'modified_hours' &&
      (!input.replacementOpensAt || !input.replacementClosesAt)
    ) {
      return ApiErrors.validation({ replacementOpensAt: 'replacement_hours_required' });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('service_exceptions')
      .insert({
        venue_id: context.venue.id,
        dining_area_id: input.diningAreaId ?? null,
        kind: input.kind,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        replacement_opens_at: input.replacementOpensAt ?? null,
        replacement_closes_at: input.replacementClosesAt ?? null,
        replacement_closes_next_day: input.replacementClosesNextDay,
        reason: input.reason,
        is_public: input.isPublic,
        created_by: context.userId,
      })
      .select('id')
      .single<{ id: string }>();

    if (error) return ApiErrors.conflict('exception_create_failed');

    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'service_exception.created',
      entity_type: 'service_exception',
      entity_id: data.id,
      payload: { kind: input.kind, starts_at: startsAt, ends_at: endsAt },
    });

    return apiSuccess({ id: data.id });
  },
  { rateLimit: 'staffApi' },
);

export const DELETE = route(
  async (request: Request) => {
    const context = await authorize('settings.hours');
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return ApiErrors.badRequest('id_required');

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('service_exceptions')
      .delete()
      .eq('id', id)
      .eq('venue_id', context.venue.id);

    if (error) return ApiErrors.conflict('exception_delete_failed');

    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'service_exception.removed',
      entity_type: 'service_exception',
      entity_id: id,
      payload: {},
    });

    return apiSuccess({ removed: true });
  },
  { rateLimit: 'staffApi' },
);
