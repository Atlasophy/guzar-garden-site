import { publicEnv } from '@/lib/config/env';
import { route, readJson } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { createHoldSchema } from '@/lib/validation/schemas';
import { createHold } from '@/lib/reservations/service';
import { getOrCreateBookingSession } from '@/lib/security/request';

/**
 * POST /api/holds
 *
 * Takes a table out of circulation for five minutes while the guest fills in
 * their details.
 *
 * Availability is revalidated inside the database transaction rather than here:
 * whatever this route read a moment ago could already be stale, and the
 * exclusion constraint is what actually decides the race. A guest who loses it
 * gets `table_unavailable` — the same answer whether the table was booked,
 * blocked or held by somebody else, because the difference is not theirs to
 * know.
 */
export const dynamic = 'force-dynamic';

export const POST = route(
  async (request: Request) => {
    const body = await readJson(request);
    if (body === null) return ApiErrors.badRequest('malformed_json', 'Body is not valid JSON.');

    const parsed = createHoldSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validation(zodFields(parsed.error.issues));

    // The hold belongs to this browser, not merely to whoever knows the token.
    const sessionId = await getOrCreateBookingSession();

    const result = await createHold({
      venueSlug: publicEnv.venueSlug,
      tableId: parsed.data.tableId,
      date: parsed.data.date,
      time: parsed.data.time,
      partySize: parsed.data.partySize,
      sessionId,
    });

    if (!result.ok) {
      const status =
        result.code === 'table_unavailable' || result.code === 'duplicate_hold' ? 409 : 422;
      return status === 409
        ? ApiErrors.conflict(result.code)
        : ApiErrors.conflict(result.code, 'That table cannot be held.');
    }

    return apiSuccess({
      holdToken: result.holdToken,
      tableId: result.tableId,
      tableCode: result.tableCode,
      diningAreaId: result.diningAreaId,
      startsAt: result.startsAt,
      endsAt: result.endsAt,
      expiresAt: result.expiresAt,
      serverNow: result.serverNow,
    });
  },
  { rateLimit: 'holdCreate' },
);
