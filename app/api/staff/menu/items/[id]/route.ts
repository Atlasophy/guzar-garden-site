import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { menuItemPatchSchema, menuItemAvailabilitySchema } from '@/lib/validation/schemas';
import { callFunction, getAdminClient } from '@/lib/supabase/admin';
import { getStaffItem, revalidateMenu } from '@/lib/menu/repository';
import { detachImageFromItem, thumbnailPathFor } from '@/lib/storage/menu-images';
import { logEvent } from '@/lib/security/redact';
import { can } from '@/lib/auth/permissions';

/**
 * GET    /api/staff/menu/items/[id]
 * PATCH  /api/staff/menu/items/[id]  — edit, publish, hide, archive, restore,
 *                                      mark sold out, remove the photograph
 * DELETE /api/staff/menu/items/[id]  — permanent, admin only, and refused when
 *                                      the row is not safe to lose
 *
 * A host is allowed exactly one field here — `isAvailable` — because taking a
 * dish off for the evening is a service decision, and re-pricing it is not.
 * The narrowing happens on the server, and a database trigger enforces the same
 * rule underneath in case anything ever reaches the table another way.
 */
export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = route(
  async (_request: Request, { params }: Params) => {
    await authorize('menu.view');
    const { id } = await params;
    const item = await getStaffItem(id);
    if (!item) return ApiErrors.notFound('item_not_found');
    return apiSuccess({ item });
  },
  { rateLimit: 'staffApi' },
);

export const PATCH = route(
  async (request: Request, { params }: Params) => {
    const { id } = await params;
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    // A host may only ever change availability, so their request is parsed
    // against a schema that admits nothing else.
    const context = await authorize('menu.toggle_availability');
    const isHost = !can(context.profile.role, 'menu.edit');

    const supabase = getAdminClient();
    const patch: Record<string, unknown> = {};
    let action = 'menu_item.updated';

    if (isHost) {
      const parsed = menuItemAvailabilitySchema.safeParse(body);
      if (!parsed.success) return ApiErrors.forbidden();
      patch.is_available = parsed.data.isAvailable;
      action = parsed.data.isAvailable ? 'menu_item.available' : 'menu_item.sold_out';
    } else {
      const parsed = menuItemPatchSchema.safeParse(body);
      if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));
      const input = parsed.data;

      const existing = await getStaffItem(id);
      if (!existing) return ApiErrors.notFound('item_not_found');

      if (input.categoryId !== undefined) patch.category_id = input.categoryId;
      if (input.slug !== undefined) patch.slug = input.slug;
      if (input.namePl !== undefined) patch.name_pl = input.namePl;
      if (input.nameEn !== undefined) patch.name_en = input.nameEn || null;
      if (input.nameRu !== undefined) patch.name_ru = input.nameRu || null;
      if (input.nameUz !== undefined) patch.name_uz = input.nameUz || null;
      if (input.descriptionPl !== undefined) patch.description_pl = input.descriptionPl || null;
      if (input.descriptionEn !== undefined) patch.description_en = input.descriptionEn || null;
      if (input.descriptionRu !== undefined) patch.description_ru = input.descriptionRu || null;
      if (input.descriptionUz !== undefined) patch.description_uz = input.descriptionUz || null;
      if (input.price !== undefined) patch.price = input.price ?? null;
      if (input.currency !== undefined) patch.currency = input.currency;
      if (input.portionText !== undefined) patch.portion_text = input.portionText || null;
      if (input.imageAltPl !== undefined) patch.image_alt_pl = input.imageAltPl || null;
      if (input.imageAltEn !== undefined) patch.image_alt_en = input.imageAltEn || null;
      if (input.imageAltRu !== undefined) patch.image_alt_ru = input.imageAltRu || null;
      if (input.imageAltUz !== undefined) patch.image_alt_uz = input.imageAltUz || null;
      if (input.isSignature !== undefined) patch.is_signature = input.isSignature;
      if (input.signatureOrder !== undefined) patch.signature_order = input.signatureOrder;
      if (input.isAvailable !== undefined) patch.is_available = input.isAvailable;
      if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
      if (input.allergens !== undefined) patch.allergens = input.allergens;
      if (input.dietaryTags !== undefined) patch.dietary_tags = input.dietaryTags;
      if (input.searchAliases !== undefined) patch.search_aliases = input.searchAliases;

      if (input.isPublished !== undefined) {
        await authorize('menu.publish');
        patch.is_published = input.isPublished;
        action = input.isPublished ? 'menu_item.published' : 'menu_item.hidden';
      }

      if (input.archived !== undefined) {
        await authorize('menu.archive');
        patch.archived_at = input.archived ? new Date().toISOString() : null;
        action = input.archived ? 'menu_item.archived' : 'menu_item.restored';
      }

      // A price change is audited as its own action, with both values, because
      // "who changed the plov to 39 zł and when" is the question that actually
      // gets asked.
      if (input.price !== undefined && existing.price !== (input.price ?? null)) {
        await supabase.from('audit_log').insert({
          venue_id: context.venue.id,
          actor_id: context.userId,
          actor_label: 'staff',
          action: 'menu_item.price_changed',
          entity_type: 'menu_item',
          entity_id: id,
          payload: { from: existing.price, to: input.price ?? null, slug: existing.slug },
        });
      }

      if (input.categoryId !== undefined && existing.category_id !== input.categoryId) {
        await supabase.from('audit_log').insert({
          venue_id: context.venue.id,
          actor_id: context.userId,
          actor_label: 'staff',
          action: 'menu_item.category_changed',
          entity_type: 'menu_item',
          entity_id: id,
          payload: { from: existing.category_id, to: input.categoryId },
        });
      }
    }

    // Removing a photograph is its own intent, and the storage objects go with it.
    const removeImage = (body as { removeImage?: boolean }).removeImage === true;
    if (removeImage) {
      await authorize('menu.upload_image');
      await detachImageFromItem(id);
      await supabase.from('audit_log').insert({
        venue_id: context.venue.id,
        actor_id: context.userId,
        actor_label: 'staff',
        action: 'menu_item.image_removed',
        entity_type: 'menu_item',
        entity_id: id,
        payload: {},
      });
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from('menu_items')
        .update(patch)
        .eq('id', id)
        .eq('venue_id', context.venue.id);

      if (error) {
        return error.code === '23505'
          ? ApiErrors.conflict('slug_taken', 'A dish already uses that slug.')
          : ApiErrors.conflict('item_update_failed');
      }

      await supabase.from('audit_log').insert({
        venue_id: context.venue.id,
        actor_id: context.userId,
        actor_label: 'staff',
        action,
        entity_type: 'menu_item',
        entity_id: id,
        payload: { fields: Object.keys(patch) },
      });
    }

    revalidateMenu();
    return apiSuccess({ updated: true });
  },
  { rateLimit: 'staffApi' },
);

export const DELETE = route(
  async (request: Request, { params }: Params) => {
    const context = await authorize('menu.delete_permanently');
    const { id } = await params;
    const url = new URL(request.url);
    // Two deliberate steps: admin permission, and an explicit confirm parameter.
    // This is not something to reach by mis-clicking Archive.
    if (url.searchParams.get('confirm') !== 'permanent') {
      return ApiErrors.badRequest(
        'confirmation_required',
        'Permanent deletion needs ?confirm=permanent.',
      );
    }
    const force = url.searchParams.get('force') === 'true';

    const item = await getStaffItem(id);

    const result = await callFunction<{ ok: boolean; code?: string; image_path?: string | null }>(
      'gg_delete_menu_item',
      { p_item_id: id, p_actor_id: context.userId, p_force: force },
    );

    if (!result?.ok) {
      const code = String(result?.code ?? 'delete_failed');
      const messages: Record<string, string> = {
        item_still_published: 'Hide or archive the dish before deleting it permanently.',
        item_has_image: 'Remove the photograph first, or pass force=true.',
        item_not_found: 'Not found.',
      };
      return code === 'item_not_found'
        ? ApiErrors.notFound(code)
        : ApiErrors.conflict(code, messages[code] ?? 'Cannot delete this dish.');
    }

    // Only after the row is gone; a failure here leaves an orphan for the
    // cleanup job, which is much better than a dish pointing at nothing.
    if (item?.image_path) {
      const supabase = getAdminClient();
      const { error } = await supabase.storage
        .from(process.env.MENU_IMAGE_BUCKET ?? 'menu-images')
        .remove([item.image_path, thumbnailPathFor(item.image_path)]);
      if (error) logEvent('warn', 'menu.image_orphaned', { message: error.message });
    }

    revalidateMenu();
    return apiSuccess({ deleted: true });
  },
  { rateLimit: 'staffApi' },
);
