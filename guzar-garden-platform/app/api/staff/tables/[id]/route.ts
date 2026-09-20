import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { staffTableSchema } from '@/lib/validation/schemas';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * PATCH /api/staff/tables/[id]
 *
 * Position, rotation, capacity, notes and active state. Deactivating a table
 * takes it out of everything that offers tables to guests; it does not delete
 * it, because the bookings that sat on it still need somewhere to point.
 */
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export const PATCH = route(
  async (request: Request, { params }: Params) => {
    const context = await authorize('settings.tables');
    const { id } = await params;

    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = staffTableSchema.partial().safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;

    const patch: Record<string, unknown> = {};
    if (input.diningAreaId !== undefined) patch.dining_area_id = input.diningAreaId;
    if (input.code !== undefined) patch.code = input.code;
    if (input.minCapacity !== undefined) patch.min_capacity = input.minCapacity;
    if (input.maxCapacity !== undefined) patch.max_capacity = input.maxCapacity;
    if (input.shape !== undefined) patch.shape = input.shape;
    if (input.widthM !== undefined) patch.width_m = input.widthM;
    if (input.depthM !== undefined) patch.depth_m = input.depthM;
    if (input.floorX !== undefined) patch.floor_x = input.floorX;
    if (input.floorZ !== undefined) patch.floor_z = input.floorZ;
    if (input.rotationDeg !== undefined) patch.rotation_deg = input.rotationDeg;
    if (input.isAccessible !== undefined) patch.is_accessible = input.isAccessible;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.staffNotes !== undefined) patch.staff_notes = input.staffNotes || null;
    if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;

    if (Object.keys(patch).length === 0) return apiSuccess({ updated: false });

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('restaurant_tables')
      .update(patch)
      .eq('id', id)
      .eq('venue_id', context.venue.id);

    if (error) {
      return error.code === '23505'
        ? ApiErrors.conflict('table_code_taken', 'A table already uses that code.')
        : ApiErrors.conflict('table_update_failed');
    }

    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'table.updated',
      entity_type: 'restaurant_table',
      entity_id: id,
      payload: { fields: Object.keys(patch) },
    });

    return apiSuccess({ updated: true });
  },
  { rateLimit: 'staffApi' },
);
