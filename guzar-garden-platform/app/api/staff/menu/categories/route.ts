import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { menuCategorySchema, menuReorderSchema } from '@/lib/validation/schemas';
import { getAdminClient, callFunction } from '@/lib/supabase/admin';
import { listStaffCategories, revalidateMenu } from '@/lib/menu/repository';

/**
 * GET   /api/staff/menu/categories   — every category, drafts and archived too
 * POST  /api/staff/menu/categories   — create one
 * PATCH /api/staff/menu/categories   — reorder (the whole list, in one write)
 *
 * Reordering is one call with the full ordered list rather than a PATCH per
 * row: a drag-and-drop that half-applies leaves two categories claiming the
 * same position, and the fix is worse than the bug.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async () => {
    const context = await authorize('menu.view');
    const categories = await listStaffCategories(context.venue.id);
    return apiSuccess({ categories });
  },
  { rateLimit: 'staffApi' },
);

export const POST = route(
  async (request: Request) => {
    const context = await authorize('menu.edit');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = menuCategorySchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        venue_id: context.venue.id,
        slug: input.slug,
        name_pl: input.namePl,
        name_en: input.nameEn || null,
        name_ru: input.nameRu || null,
        name_uz: input.nameUz || null,
        description_pl: input.descriptionPl || null,
        description_en: input.descriptionEn || null,
        description_ru: input.descriptionRu || null,
        description_uz: input.descriptionUz || null,
        search_aliases: input.searchAliases,
        display_order: input.displayOrder,
        is_published: input.isPublished,
      })
      .select('id')
      .single<{ id: string }>();

    if (error) {
      return error.code === '23505'
        ? ApiErrors.conflict('slug_taken', 'A category already uses that slug.')
        : ApiErrors.conflict('category_create_failed');
    }

    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'menu_category.created',
      entity_type: 'menu_category',
      entity_id: data.id,
      payload: { slug: input.slug, name_pl: input.namePl },
    });

    revalidateMenu();
    return apiSuccess({ id: data.id });
  },
  { rateLimit: 'staffApi' },
);

export const PATCH = route(
  async (request: Request) => {
    const context = await authorize('menu.reorder');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = menuReorderSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));

    const result = await callFunction<{ ok: boolean; updated?: number }>(
      'gg_reorder_menu_categories',
      {
        p_venue_id: context.venue.id,
        p_actor_id: context.userId,
        p_ordered_ids: parsed.data.ids,
      },
    );

    revalidateMenu();
    return apiSuccess({ updated: result?.updated ?? 0 });
  },
  { rateLimit: 'staffApi' },
);
