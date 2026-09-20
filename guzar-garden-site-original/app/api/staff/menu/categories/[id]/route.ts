import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { menuCategorySchema } from '@/lib/validation/schemas';
import { getAdminClient } from '@/lib/supabase/admin';
import { revalidateMenu } from '@/lib/menu/repository';

/**
 * PATCH /api/staff/menu/categories/[id]
 *
 * Editing, publishing, hiding, archiving and restoring. Archiving a category
 * takes it and its dishes off the public menu without deleting anything — the
 * dishes keep their rows, their prices and their history, and restoring puts
 * the whole section back exactly as it was.
 */
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export const PATCH = route(
  async (request: Request, { params }: Params) => {
    const context = await authorize('menu.edit');
    const { id } = await params;

    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const schema = menuCategorySchema.partial().extend({});
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;
    const archived = (body as { archived?: boolean }).archived;

    const patch: Record<string, unknown> = {};
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.namePl !== undefined) patch.name_pl = input.namePl;
    if (input.nameEn !== undefined) patch.name_en = input.nameEn || null;
    if (input.nameRu !== undefined) patch.name_ru = input.nameRu || null;
    if (input.nameUz !== undefined) patch.name_uz = input.nameUz || null;
    if (input.descriptionPl !== undefined) patch.description_pl = input.descriptionPl || null;
    if (input.descriptionEn !== undefined) patch.description_en = input.descriptionEn || null;
    if (input.descriptionRu !== undefined) patch.description_ru = input.descriptionRu || null;
    if (input.descriptionUz !== undefined) patch.description_uz = input.descriptionUz || null;
    if (input.searchAliases !== undefined) patch.search_aliases = input.searchAliases;
    if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
    if (input.isPublished !== undefined) patch.is_published = input.isPublished;

    if (archived !== undefined) {
      await authorize('menu.archive');
      patch.archived_at = archived ? new Date().toISOString() : null;
    }

    if (Object.keys(patch).length === 0) return apiSuccess({ updated: false });

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('menu_categories')
      .update(patch)
      .eq('id', id)
      .eq('venue_id', context.venue.id);

    if (error) {
      return error.code === '23505'
        ? ApiErrors.conflict('slug_taken', 'A category already uses that slug.')
        : ApiErrors.conflict('category_update_failed');
    }

    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action:
        archived === true
          ? 'menu_category.archived'
          : archived === false
            ? 'menu_category.restored'
            : 'menu_category.updated',
      entity_type: 'menu_category',
      entity_id: id,
      payload: { fields: Object.keys(patch) },
    });

    revalidateMenu();
    return apiSuccess({ updated: true });
  },
  { rateLimit: 'staffApi' },
);
