import 'server-only';
import { randomUUID } from 'node:crypto';
import { getServerEnv } from '@/lib/config/env';
import { getAdminClient } from '@/lib/supabase/admin';
import { logEvent } from '@/lib/security/redact';
import { processMenuImage, type ProcessedImage } from './image-processing';
import type { MenuItemRow } from '@/lib/database/types';

/**
 * Meal images in Supabase Storage.
 *
 * The object name is a fresh UUID, never the uploaded filename: filenames
 * collide, carry the guest's directory structure, and are attacker-controlled
 * path fragments. Two files are written per image, a display WebP and a
 * thumbnail, under `items/<itemId>/<uuid>.webp`.
 *
 * Replacement is upload-then-swap-then-delete, in that order. The old object is
 * only removed once the database points at the new one, so a failure halfway
 * through leaves the previous photograph serving rather than a broken image. The
 * cost of that ordering is the occasional orphan, and `findOrphanedObjects`
 * exists to sweep those up.
 */

export interface StoredImage {
  path: string;
  thumbnailPath: string;
  width: number;
  height: number;
  mime: string;
  publicUrl: string;
}

function bucket() {
  return getServerEnv().MENU_IMAGE_BUCKET;
}

export function publicUrlFor(path: string): string {
  return getAdminClient().storage.from(bucket()).getPublicUrl(path).data.publicUrl;
}

/** Both derivatives of one image, written under a single UUID. */
export async function uploadMenuImage(
  itemId: string,
  file: Buffer,
): Promise<StoredImage> {
  const env = getServerEnv();
  const processed: ProcessedImage = await processMenuImage(file, {
    maxBytes: env.MAX_MENU_IMAGE_BYTES,
  });

  const id = randomUUID();
  const displayPath = `items/${itemId}/${id}.webp`;
  const thumbnailPath = `items/${itemId}/${id}-thumb.webp`;

  const storage = getAdminClient().storage.from(bucket());

  const displayUpload = await storage.upload(displayPath, processed.display.buffer, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });
  if (displayUpload.error) {
    throw new Error(`Image upload failed: ${displayUpload.error.message}`);
  }

  const thumbUpload = await storage.upload(thumbnailPath, processed.thumbnail.buffer, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });
  if (thumbUpload.error) {
    // Roll the display file back: an image without its thumbnail is a
    // half-written state nothing downstream expects.
    await storage.remove([displayPath]);
    throw new Error(`Thumbnail upload failed: ${thumbUpload.error.message}`);
  }

  return {
    path: displayPath,
    thumbnailPath,
    width: processed.display.width,
    height: processed.display.height,
    mime: 'image/webp',
    publicUrl: publicUrlFor(displayPath),
  };
}

/**
 * Attach an image to a menu item, replacing whatever was there.
 *
 * The delete happens last and its failure is logged rather than raised: by then
 * the item already points at the new image, and turning a successful replacement
 * into an error because a stale file lingered would be the wrong trade.
 */
export async function attachImageToItem(
  itemId: string,
  stored: StoredImage,
): Promise<void> {
  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from('menu_items')
    .select('image_path')
    .eq('id', itemId)
    .maybeSingle<Pick<MenuItemRow, 'image_path'>>();

  const { error } = await supabase
    .from('menu_items')
    .update({
      image_path: stored.path,
      image_width: stored.width,
      image_height: stored.height,
      image_mime: stored.mime,
      image_status: 'ready',
    })
    .eq('id', itemId);

  if (error) {
    // The database did not take the new image, so the new objects are orphans.
    await removeObjects([stored.path, stored.thumbnailPath]);
    throw error;
  }

  const previous = existing?.image_path;
  if (previous && previous !== stored.path) {
    await removeObjects([previous, thumbnailPathFor(previous)]);
  }
}

/** Detach the photograph; the generated artwork takes over on the public menu. */
export async function detachImageFromItem(itemId: string): Promise<void> {
  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from('menu_items')
    .select('image_path')
    .eq('id', itemId)
    .maybeSingle<Pick<MenuItemRow, 'image_path'>>();

  const { error } = await supabase
    .from('menu_items')
    .update({
      image_path: null,
      image_width: null,
      image_height: null,
      image_mime: null,
      image_status: 'ready',
    })
    .eq('id', itemId);

  if (error) throw error;

  if (existing?.image_path) {
    await removeObjects([existing.image_path, thumbnailPathFor(existing.image_path)]);
  }
}

export function thumbnailPathFor(displayPath: string): string {
  return displayPath.replace(/\.webp$/, '-thumb.webp');
}

async function removeObjects(paths: string[]): Promise<void> {
  const { error } = await getAdminClient().storage.from(bucket()).remove(paths);
  if (error) {
    logEvent('warn', 'storage.orphan_left', { paths, message: error.message });
  }
}

/**
 * Objects in the bucket that no menu item references.
 *
 * Read-only on purpose. Deleting files because a query said they were unused is
 * how a race between an in-flight upload and a sweep loses somebody's
 * photograph; the job reports, and `deleteOrphanedObjects` only removes what is
 * both unreferenced and older than the grace period.
 */
export async function findOrphanedObjects(graceMinutes = 60): Promise<string[]> {
  const supabase = getAdminClient();
  const storage = supabase.storage.from(bucket());

  const { data: items } = await supabase
    .from('menu_items')
    .select('image_path')
    .not('image_path', 'is', null)
    .returns<Pick<MenuItemRow, 'image_path'>[]>();

  const referenced = new Set<string>();
  for (const item of items ?? []) {
    if (!item.image_path) continue;
    referenced.add(item.image_path);
    referenced.add(thumbnailPathFor(item.image_path));
  }

  const cutoff = Date.now() - graceMinutes * 60_000;
  const orphans: string[] = [];

  const { data: folders } = await storage.list('items', { limit: 1000 });
  for (const folder of folders ?? []) {
    const { data: files } = await storage.list(`items/${folder.name}`, { limit: 1000 });
    for (const file of files ?? []) {
      const path = `items/${folder.name}/${file.name}`;
      if (referenced.has(path)) continue;
      const created = file.created_at ? new Date(file.created_at).getTime() : 0;
      if (created > cutoff) continue; // still possibly mid-upload
      orphans.push(path);
    }
  }

  return orphans;
}

export async function deleteOrphanedObjects(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0;
  const { error } = await getAdminClient().storage.from(bucket()).remove(paths);
  if (error) {
    logEvent('error', 'storage.orphan_cleanup_failed', { message: error.message });
    return 0;
  }
  logEvent('info', 'storage.orphans_removed', { count: paths.length });
  return paths.length;
}
