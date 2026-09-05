import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { staffTableSchema } from '@/lib/validation/schemas';
import { getAdminClient } from '@/lib/supabase/admin';
import { getFloorView } from '@/lib/staff/dashboard';
import type { DiningAreaRow, RestaurantTableRow } from '@/lib/database/types';

/**
 * GET  /api/staff/tables            — the floor, either as configuration or as
 *                                     live occupancy (`?at=` an ISO instant)
 * POST /api/staff/tables            — add a table
 *
 * The floor plan's coordinates live here rather than in the 3D component, which
 * is the point: the seeded layout is an estimate taken from photographs, and
 * the restaurant corrects it in this screen without anybody touching code.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async (request: Request) => {
    const context = await authorize('floor.view');
    const url = new URL(request.url);
    const at = url.searchParams.get('at');
    const partySize = url.searchParams.get('partySize');

    if (at) {
      const instant = new Date(at);
      if (Number.isNaN(instant.getTime())) return ApiErrors.badRequest('invalid_instant');
      const floor = await getFloorView(
        context.venue.id,
        instant,
        partySize ? Number(partySize) : undefined,
      );
      return apiSuccess(floor);
    }

    const supabase = getAdminClient();
    const [{ data: tables }, { data: areas }] = await Promise.all([
      supabase
        .from('restaurant_tables')
        .select('*')
        .eq('venue_id', context.venue.id)
        .order('display_order')
        .returns<RestaurantTableRow[]>(),
      supabase
        .from('dining_areas')
        .select('*')
        .eq('venue_id', context.venue.id)
        .order('display_order')
        .returns<DiningAreaRow[]>(),
    ]);

    return apiSuccess({ tables: tables ?? [], areas: areas ?? [] });
  },
  { rateLimit: 'staffApi' },
);

export const POST = route(
  async (request: Request) => {
    const context = await authorize('settings.tables');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = staffTableSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;

    if (input.minCapacity > input.maxCapacity) {
      return ApiErrors.validation({ minCapacity: 'capacity_range_invalid' });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        venue_id: context.venue.id,
        dining_area_id: input.diningAreaId,
        code: input.code,
        min_capacity: input.minCapacity,
        max_capacity: input.maxCapacity,
        shape: input.shape,
        width_m: input.widthM,
        depth_m: input.depthM,
        floor_x: input.floorX,
        floor_z: input.floorZ,
        rotation_deg: input.rotationDeg,
        is_accessible: input.isAccessible,
        is_active: input.isActive,
        staff_notes: input.staffNotes || null,
        display_order: input.displayOrder,
      })
      .select('id')
      .single<{ id: string }>();

    if (error) {
      return error.code === '23505'
        ? ApiErrors.conflict('table_code_taken', 'A table already uses that code.')
        : ApiErrors.conflict('table_create_failed');
    }

    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'table.created',
      entity_type: 'restaurant_table',
      entity_id: data.id,
      payload: { code: input.code, capacity: [input.minCapacity, input.maxCapacity] },
    });

    return apiSuccess({ id: data.id });
  },
  { rateLimit: 'staffApi' },
);
