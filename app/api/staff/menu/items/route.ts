import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { menuItemSchema, menuReorderSchema } from '@/lib/validation/schemas';
import { callFunction, getAdminClient } from '@/lib/supabase/admin';
import { listStaffItems, revalidateMenu } from '@/lib/menu/repository';

/**
 * GET   /api/staff/menu/items   — filter by category, published, available, archived
 * POST  /api/staff/menu/items   — create a dish
 * PATCH /api/staff/menu/items   — reorder within a category
 *
 * The price arrives as a decimal string and is passed through as one, all the
 * way into the `numeric` column. Nothing on this path turns it into a
 * JavaScript number, which is what keeps 12.99 exactly 12.99.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async (request: Request) => {
    const context = await authorize('menu.view');
    const url = new URL(request.url);

    const boolParam = (name: string): boolean | undefined => {
      const value = url.searchParams.get(name);
      if (value === null || value === '') return undefined;
      return value === 'true' || value === '1';
    };

    const items = await listStaffItems(context.venue.id, {
      ...(url.searchParams.get('categoryId')
        ? { categoryId: url.searchParams.get('categoryId')! }
        : {}),
      ...(boolParam('published') !== undefined ? { published: boolParam('published') } : {}),
      ...(boolParam('available') !== undefined ? { available: boolParam('available') } : {}),
      ...(boolParam('archived') !== undefined ? { archived: boolParam('archived') } : {}),
      ...(url.searchParams.get('query') ? { query: url.searchParams.get('query')! } : {}),
    });

    return apiSuccess({ items, count: items.length });
  },
  { rateLimit: 'staffApi' },
);

export const POST = route(
  async (request: Request) => {
    const context = await authorize('menu.edit');
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = menuItemSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
    const input = parsed.data;

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        venue_id: context.venue.id,
        category_id: input.categoryId,
        slug: input.slug,
        name_pl: input.namePl,
        name_en: input.nameEn || null,
        name_ru: input.nameRu || null,
        name_uz: input.nameUz || null,
        description_pl: input.descriptionPl || null,
        description_en: input.descriptionEn || null,
        description_ru: input.descriptionRu || null,
        description_uz: input.descriptionUz || null,
        price: input.price ?? null,
        currency: input.currency,
        portion_text: input.portionText || null,
        image_alt_pl: input.imageAltPl || null,
        image_alt_en: input.imageAltEn || null,
        image_alt_ru: input.imageAltRu || null,
        image_alt_uz: input.imageAltUz || null,
        is_signature: input.isSignature,
        signature_order: input.signatureOrder,
        is_available: input.isAvailable,
        is_published: input.isPublished,
        display_order: input.displayOrder,
        allergens: input.allergens,
        dietary_tags: input.dietaryTags,
        search_aliases: input.searchAliases,
      })
      .select('id')
      .single<{ id: string }>();

    if (error) {
      return error.code === '23505'
        ? ApiErrors.conflict('slug_taken', 'A dish already uses that slug.')
        : ApiErrors.conflict('item_create_failed');
    }

    await supabase.from('audit_log').insert({
      venue_id: context.venue.id,
      actor_id: context.userId,
      actor_label: 'staff',
      action: 'menu_item.created',
      entity_type: 'menu_item',
      entity_id: data.id,
      payload: { slug: input.slug, name_pl: input.namePl, price: input.price ?? null },
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

    const result = await callFunction<{ ok: boolean; updated?: number }>('gg_reorder_menu_items', {
      p_venue_id: context.venue.id,
      p_actor_id: context.userId,
      p_ordered_ids: parsed.data.ids,
    });

    revalidateMenu();
    return apiSuccess({ updated: result?.updated ?? 0 });
  },
  { rateLimit: 'staffApi' },
);
