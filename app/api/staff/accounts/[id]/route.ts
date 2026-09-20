import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { staffAccountConflict } from '@/lib/auth/staff-account-rules';
import { getAdminClient } from '@/lib/supabase/admin';
import { uuidSchema, staffAccountUpdateSchema } from '@/lib/validation/schemas';
import type { StaffProfileRow } from '@/lib/database/types';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export const PATCH = route(
  async (request: Request, { params }: Params) => {
    const context = await authorize('settings.staff');
    const parsedId = uuidSchema.safeParse((await params).id);
    if (!parsedId.success) return ApiErrors.notFound('staff_account_not_found');

    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');
    const parsed = staffAccountUpdateSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;
    const admin = getAdminClient();

    const { data: target, error: targetError } = await admin
      .from('staff_profiles')
      .select('*')
      .eq('id', parsedId.data)
      .eq('venue_id', context.venue.id)
      .maybeSingle<StaffProfileRow>();
    if (targetError) return ApiErrors.serverError();
    if (!target) return ApiErrors.notFound('staff_account_not_found');

    const { count, error: countError } = await admin
      .from('staff_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', context.venue.id)
      .eq('role', 'admin')
      .eq('is_active', true);
    if (countError) return ApiErrors.serverError();

    const conflict = staffAccountConflict({
      actorId: context.userId,
      targetId: target.id,
      targetRole: target.role,
      targetActive: target.is_active,
      nextRole: input.role,
      nextActive: input.isActive,
      activeAdminCount: count ?? 0,
    });
    if (conflict) return ApiErrors.conflict(conflict);

    const profilePatch: Record<string, unknown> = {};
    if (input.fullName !== undefined) profilePatch.full_name = input.fullName;
    if (input.email !== undefined) profilePatch.email = input.email;
    if (input.phone !== undefined) profilePatch.phone_e164 = input.phone || null;
    if (input.role !== undefined) profilePatch.role = input.role;
    if (input.isActive !== undefined) profilePatch.is_active = input.isActive;

    let profile: StaffProfileRow = target;
    if (Object.keys(profilePatch).length > 0) {
      const { data, error } = await admin
        .from('staff_profiles')
        .update(profilePatch)
        .eq('id', target.id)
        .eq('venue_id', context.venue.id)
        .select('*')
        .single<StaffProfileRow>();
      if (error || !data) return ApiErrors.conflict('staff_update_failed');
      profile = data;
    }

    if (input.email !== undefined || input.password !== undefined || input.fullName !== undefined) {
      const { error: authError } = await admin.auth.admin.updateUserById(target.id, {
        ...(input.email !== undefined ? { email: input.email, email_confirm: true } : {}),
        ...(input.password !== undefined ? { password: input.password } : {}),
        ...(input.fullName !== undefined ? { user_metadata: { full_name: input.fullName } } : {}),
      });
      if (authError) {
        if (Object.keys(profilePatch).length > 0) {
          await admin
            .from('staff_profiles')
            .update({
              role: target.role,
              full_name: target.full_name,
              email: target.email,
              phone_e164: target.phone_e164,
              is_active: target.is_active,
            })
            .eq('id', target.id)
            .eq('venue_id', context.venue.id);
        }
        const duplicate = /already|registered|exists/i.test(authError.message);
        return duplicate
          ? ApiErrors.conflict('staff_email_taken', 'An account already uses that email address.')
          : ApiErrors.conflict('staff_auth_update_failed');
      }
    }

    const changed = [
      ...Object.keys(profilePatch),
      ...(input.password !== undefined ? ['password'] : []),
    ];
    await admin.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'staff_account.updated',
      entity_type: 'staff_profile',
      entity_id: target.id,
      payload: { fields: changed },
    });

    return apiSuccess({ account: profile });
  },
  { rateLimit: 'staffApi' },
);
