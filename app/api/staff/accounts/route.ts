import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { getAdminClient } from '@/lib/supabase/admin';
import { staffAccountCreateSchema } from '@/lib/validation/schemas';
import type { StaffProfileRow } from '@/lib/database/types';

export const dynamic = 'force-dynamic';

export const GET = route(
  async () => {
    const context = await authorize('settings.staff');
    const { data, error } = await getAdminClient()
      .from('staff_profiles')
      .select('*')
      .eq('venue_id', context.venue.id)
      .order('is_active', { ascending: false })
      .order('full_name')
      .returns<StaffProfileRow[]>();

    if (error) return ApiErrors.serverError();
    return apiSuccess({ accounts: data ?? [] });
  },
  { rateLimit: 'staffApi' },
);

export const POST = route(
  async (request: Request) => {
    const context = await authorize('settings.staff');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = staffAccountCreateSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;
    const admin = getAdminClient();

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });
    if (authError || !created.user) {
      const duplicate = /already|registered|exists/i.test(authError?.message ?? '');
      return duplicate
        ? ApiErrors.conflict('staff_email_taken', 'An account already uses that email address.')
        : ApiErrors.conflict('staff_create_failed', 'The staff account could not be created.');
    }

    const { data: profile, error: profileError } = await admin
      .from('staff_profiles')
      .insert({
        id: created.user.id,
        venue_id: context.venue.id,
        role: input.role,
        full_name: input.fullName,
        email: input.email,
        phone_e164: input.phone || null,
        is_active: true,
      })
      .select('*')
      .single<StaffProfileRow>();

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      return ApiErrors.conflict('staff_create_failed', 'The staff account could not be created.');
    }

    await admin.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'staff_account.created',
      entity_type: 'staff_profile',
      entity_id: profile.id,
      payload: { role: profile.role, full_name: profile.full_name },
    });

    return apiSuccess({ account: profile }, { status: 201 });
  },
  { rateLimit: 'staffApi' },
);
