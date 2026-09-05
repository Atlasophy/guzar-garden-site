import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { staffSettingsSchema } from '@/lib/validation/schemas';
import { getAdminClient } from '@/lib/supabase/admin';
import type { ReservationSettingsRow } from '@/lib/database/types';

/**
 * GET   /api/staff/settings — the booking policy
 * PATCH /api/staff/settings — change it
 *
 * These numbers are what the whole reservation system runs on: slot interval,
 * sitting length, turnaround, notice, horizon, party ceiling, hold duration and
 * the cancellation cut-off. They live in one row so the restaurant can tune
 * them from this screen — turning the turnaround down to ten minutes on a busy
 * December, say — without a deploy.
 *
 * Changing them never rewrites bookings that already exist: `occupancy_ends_at`
 * is stored per reservation precisely so a policy change cannot move occupancy
 * under a party that is already sitting down.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async () => {
    const context = await authorize('reservations.view');
    const { data, error } = await getAdminClient()
      .from('reservation_settings')
      .select('*')
      .eq('venue_id', context.venue.id)
      .maybeSingle<ReservationSettingsRow>();

    if (error) return ApiErrors.serverError();
    if (!data) return ApiErrors.notFound('settings_missing');
    return apiSuccess({ settings: data });
  },
  { rateLimit: 'staffApi' },
);

export const PATCH = route(
  async (request: Request) => {
    const context = await authorize('settings.policy');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = staffSettingsSchema.partial().safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;

    const supabase = getAdminClient();
    const { data: before } = await supabase
      .from('reservation_settings')
      .select('*')
      .eq('venue_id', context.venue.id)
      .maybeSingle<ReservationSettingsRow>();

    const patch: Record<string, unknown> = { updated_by: context.userId };
    if (input.slotIntervalMinutes !== undefined)
      patch.slot_interval_minutes = input.slotIntervalMinutes;
    if (input.defaultDurationMinutes !== undefined)
      patch.default_duration_minutes = input.defaultDurationMinutes;
    if (input.turnaroundMinutes !== undefined) patch.turnaround_minutes = input.turnaroundMinutes;
    if (input.minNoticeMinutes !== undefined) patch.min_notice_minutes = input.minNoticeMinutes;
    if (input.bookingHorizonDays !== undefined)
      patch.booking_horizon_days = input.bookingHorizonDays;
    if (input.maxOnlinePartySize !== undefined)
      patch.max_online_party_size = input.maxOnlinePartySize;
    if (input.holdDurationSeconds !== undefined)
      patch.hold_duration_seconds = input.holdDurationSeconds;
    if (input.cancellationCutoffMinutes !== undefined)
      patch.cancellation_cutoff_minutes = input.cancellationCutoffMinutes;
    if (input.cancellationPolicyPl !== undefined)
      patch.cancellation_policy_pl = input.cancellationPolicyPl;
    if (input.cancellationPolicyEn !== undefined)
      patch.cancellation_policy_en = input.cancellationPolicyEn;
    if (input.cancellationPolicyRu !== undefined)
      patch.cancellation_policy_ru = input.cancellationPolicyRu;
    if (input.cancellationPolicyUz !== undefined)
      patch.cancellation_policy_uz = input.cancellationPolicyUz;

    const { error } = await supabase
      .from('reservation_settings')
      .update(patch)
      .eq('venue_id', context.venue.id);

    if (error) return ApiErrors.conflict('settings_update_failed');

    // The whole before/after, because a booking policy that changed silently is
    // the first thing anybody asks about when the floor stops making sense.
    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'reservation_policy.changed',
      entity_type: 'reservation_settings',
      entity_id: context.venue.id,
      payload: {
        changed: Object.keys(patch).filter((key) => key !== 'updated_by'),
        before: before
          ? {
              slot_interval_minutes: before.slot_interval_minutes,
              default_duration_minutes: before.default_duration_minutes,
              turnaround_minutes: before.turnaround_minutes,
              min_notice_minutes: before.min_notice_minutes,
              booking_horizon_days: before.booking_horizon_days,
              max_online_party_size: before.max_online_party_size,
              hold_duration_seconds: before.hold_duration_seconds,
              cancellation_cutoff_minutes: before.cancellation_cutoff_minutes,
            }
          : null,
      },
    });

    return apiSuccess({ updated: true });
  },
  { rateLimit: 'staffApi' },
);
