import { route } from '@/lib/api/handler';
import { ApiErrors, apiSuccess } from '@/lib/api/response';
import { authorize } from '@/lib/auth/staff';
import { getServerEnv } from '@/lib/config/env';
import { attachImageToItem, uploadMenuImage } from '@/lib/storage/menu-images';
import { ImageValidationError } from '@/lib/storage/image-processing';
import { getAdminClient } from '@/lib/supabase/admin';
import { getStaffItem, revalidateMenu } from '@/lib/menu/repository';
import { logEvent } from '@/lib/security/redact';

/**
 * POST /api/staff/menu/images
 *
 * multipart/form-data: `itemId` and `file`.
 *
 * The file's own bytes decide whether it is an image — the extension and the
 * declared content type are both attacker-controlled and neither is consulted.
 * An accepted file is rotated to its EXIF orientation, stripped of metadata,
 * converted to WebP at two sizes and stored under a fresh UUID.
 *
 * The database points at the new object before the old one is deleted, so a
 * failure part-way through leaves the previous photograph serving rather than a
 * broken image. The cost is the occasional orphan, which the cleanup job sweeps.
 */
export const dynamic = 'force-dynamic';
// Image processing is not an edge workload.
export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = route(
  async (request: Request) => {
    const context = await authorize('menu.upload_image');
    const env = getServerEnv();

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return ApiErrors.badRequest('malformed_form', 'Expected multipart/form-data.');
    }

    const itemId = form.get('itemId');
    const file = form.get('file');

    if (typeof itemId !== 'string' || !itemId) {
      return ApiErrors.validation({ itemId: 'item_required' });
    }
    if (!(file instanceof File)) {
      return ApiErrors.validation({ file: 'file_required' });
    }
    if (file.size > env.MAX_MENU_IMAGE_BYTES) {
      return ApiErrors.validation({
        file: `too_large:${Math.round(env.MAX_MENU_IMAGE_BYTES / 1024 / 1024)}MB`,
      });
    }

    const item = await getStaffItem(itemId);
    if (!item || item.venue_id !== context.venue.id) {
      return ApiErrors.notFound('item_not_found');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const stored = await uploadMenuImage(itemId, buffer);
      await attachImageToItem(itemId, stored);

      await getAdminClient()
        .from('audit_log')
        .insert({
          venue_id: context.venue.id,
          actor_id: context.userId,
          actor_label: 'staff',
          action: 'menu_item.image_changed',
          entity_type: 'menu_item',
          entity_id: itemId,
          payload: { width: stored.width, height: stored.height, mime: stored.mime },
        });

      revalidateMenu();

      return apiSuccess({
        path: stored.path,
        url: stored.publicUrl,
        width: stored.width,
        height: stored.height,
        mime: stored.mime,
      });
    } catch (error) {
      if (error instanceof ImageValidationError) {
        // Actionable and specific — "unsupported_format" tells the uploader to
        // export a JPEG, where a generic failure tells them nothing.
        return ApiErrors.validation({ file: error.reason });
      }
      logEvent('error', 'menu.image_upload_failed', {
        item_id: itemId,
        message: (error as Error).message,
      });
      return ApiErrors.serverError();
    }
  },
  { rateLimit: 'imageUpload' },
);
