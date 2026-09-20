import 'server-only';
import { getAdminClient } from '@/lib/supabase/admin';
import type { BusinessHoursRow, ReservationSettingsRow, VenueRow } from '@/lib/database/types';

/**
 * The venue facts the public pages render: address, telephone, opening hours
 * and the booking policy the "book a table" copy has to be honest about.
 *
 * The old pages hardcoded "9:00 – 24:00, every day" in three places and in four
 * languages. Now there is one source, and changing Sunday's hours is a form in
 * /staff/settings rather than a find-and-replace across two HTML files.
 */

export interface PublicHours {
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  /** "09:00" */
  opensAt: string;
  /** "24:00" when the service runs to midnight — what a menu board would print. */
  closesAt: string;
}

export interface PublicVenueInfo {
  name: string;
  timezone: string;
  phoneE164: string;
  addressLine: string;
  postalCode: string;
  city: string;
  hours: PublicHours[];
  /** True when every day has identical hours — the footer's "Monday – Sunday". */
  uniformHours: boolean;
  policy: {
    maxOnlinePartySize: number;
    bookingHorizonDays: number;
    minNoticeMinutes: number;
    cancellationCutoffMinutes: number;
    cancellationPolicy: Record<string, string>;
  };
}

function trimSeconds(time: string): string {
  return time.slice(0, 5);
}

export async function getPublicVenueInfo(venueSlug: string): Promise<PublicVenueInfo | null> {
  const supabase = getAdminClient();

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('slug', venueSlug)
    .eq('is_active', true)
    .maybeSingle<VenueRow>();

  if (!venue) return null;

  const [{ data: hours }, { data: settings }] = await Promise.all([
    supabase
      .from('business_hours')
      .select('*')
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .order('weekday')
      .order('display_order')
      .returns<BusinessHoursRow[]>(),
    supabase
      .from('reservation_settings')
      .select('*')
      .eq('venue_id', venue.id)
      .maybeSingle<ReservationSettingsRow>(),
  ]);

  const publicHours: PublicHours[] = (hours ?? []).map((row) => ({
    weekday: row.weekday,
    opensAt: trimSeconds(row.opens_at),
    // A service that runs "to next-day 00:00" is midnight, and a menu board
    // writes that as 24:00 rather than 00:00 — the original pages did too.
    closesAt:
      row.closes_next_day && trimSeconds(row.closes_at) === '00:00'
        ? '24:00'
        : trimSeconds(row.closes_at),
  }));

  const first = publicHours[0];
  const uniformHours =
    publicHours.length === 7 &&
    first !== undefined &&
    publicHours.every((h) => h.opensAt === first.opensAt && h.closesAt === first.closesAt);

  return {
    name: venue.name,
    timezone: venue.timezone,
    phoneE164: venue.phone_e164,
    addressLine: venue.address_line,
    postalCode: venue.postal_code,
    city: venue.city,
    hours: publicHours,
    uniformHours,
    policy: {
      maxOnlinePartySize: settings?.max_online_party_size ?? 12,
      bookingHorizonDays: settings?.booking_horizon_days ?? 90,
      minNoticeMinutes: settings?.min_notice_minutes ?? 30,
      cancellationCutoffMinutes: settings?.cancellation_cutoff_minutes ?? 120,
      cancellationPolicy: {
        pl: settings?.cancellation_policy_pl ?? '',
        en: settings?.cancellation_policy_en ?? '',
        ru: settings?.cancellation_policy_ru ?? '',
        uz: settings?.cancellation_policy_uz ?? '',
      },
    },
  };
}
