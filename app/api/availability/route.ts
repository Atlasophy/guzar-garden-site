import { publicEnv } from '@/lib/config/env';
import { route } from '@/lib/api/handler';
import { ApiErrors, apiSuccess, zodFields } from '@/lib/api/response';
import { availabilityQuerySchema } from '@/lib/validation/schemas';
import { getAvailability } from '@/lib/availability/service';
import { readBookingSession } from '@/lib/security/request';
import { hashToken } from '@/lib/security/tokens';

/**
 * GET /api/availability?date=&partySize=&time=&areaSlug=
 *
 * The public availability read. Returns slots, and — once a time is given — the
 * state of every table at that time.
 *
 * What it deliberately does not return: any guest's name, telephone, e-mail,
 * note or reservation id. A table another party has booked comes back as
 * `reserved`, full stop. The floor plan needs to know a table is taken; it has
 * no business knowing by whom.
 *
 * `serverNow` is included in every response because the client must never use
 * its own clock to decide whether a slot is still bookable.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  async (request: Request) => {
    const url = new URL(request.url);
    const parsed = availabilityQuerySchema.safeParse({
      date: url.searchParams.get('date') ?? '',
      partySize: url.searchParams.get('partySize') ?? '',
      time: url.searchParams.get('time') ?? undefined,
      areaSlug: url.searchParams.get('areaSlug') ?? undefined,
      durationMinutes: url.searchParams.get('durationMinutes') ?? undefined,
    });

    if (!parsed.success) {
      return ApiErrors.validation(zodFields(parsed.error.issues));
    }

    // The caller's own hold, so their table reads as "held for you" rather than
    // as somebody else's occupancy when they come back to the step.
    const holdToken = url.searchParams.get('holdToken');
    const session = await readBookingSession();
    const ownHoldTokenHash = holdToken && session ? hashToken(holdToken) : undefined;

    const availability = await getAvailability({
      venueSlug: publicEnv.venueSlug,
      date: parsed.data.date,
      partySize: parsed.data.partySize,
      ...(parsed.data.time ? { time: parsed.data.time } : {}),
      ...(parsed.data.areaSlug ? { areaSlug: parsed.data.areaSlug } : {}),
      ...(parsed.data.durationMinutes ? { durationMinutes: parsed.data.durationMinutes } : {}),
      ...(ownHoldTokenHash ? { ownHoldTokenHash } : {}),
    });

    if (!availability) return ApiErrors.notFound('venue_unavailable');
    return apiSuccess(availability);
  },
  { rateLimit: 'availability' },
);
