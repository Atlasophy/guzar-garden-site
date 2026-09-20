import { route } from '@/lib/api/handler';
import { ApiErrors, apiSuccess } from '@/lib/api/response';
import { hasValidCronSecret } from '@/lib/security/request';
import { deleteOrphanedObjects, findOrphanedObjects } from '@/lib/storage/menu-images';
import { logEvent } from '@/lib/security/redact';

/**
 * POST /api/jobs/cleanup-images
 *
 * Removes storage objects no menu item points at.
 *
 * Orphans exist by design: an image is uploaded before the database is told
 * about it, so a failure between the two leaves a file behind. That ordering is
 * deliberate — the alternative loses the guest's photograph rather than leaking
 * a file — and this is the other half of the bargain.
 *
 * A one-hour grace period keeps it from deleting a file that is mid-upload
 * right now. `?dryRun=true` reports without touching anything, which is how it
 * should be run the first time.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = route(
  async (request: Request) => {
    if (!hasValidCronSecret(request)) return ApiErrors.unauthenticated();

    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dryRun') === 'true';
    const graceMinutes = Number(url.searchParams.get('graceMinutes') ?? 60);

    const orphans = await findOrphanedObjects(Number.isFinite(graceMinutes) ? graceMinutes : 60);

    if (dryRun) return apiSuccess({ found: orphans.length, deleted: 0, dryRun: true, orphans });

    const deleted = await deleteOrphanedObjects(orphans);
    if (deleted > 0) logEvent('info', 'job.images_cleaned', { deleted });
    return apiSuccess({ found: orphans.length, deleted, dryRun: false });
  },
  { skipOriginCheck: true },
);

export const GET = POST;
