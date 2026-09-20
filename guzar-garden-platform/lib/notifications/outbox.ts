import 'server-only';
import { getServerEnv } from '@/lib/config/env';
import { getAdminClient, callFunction } from '@/lib/supabase/admin';
import { logEvent, redactPhone } from '@/lib/security/redact';
import { formatLocalDate, formatLocalTime } from '@/lib/time/warsaw';
import { coerceLocale } from '@/lib/i18n/locales';
import type {
  NotificationOutboxRow,
  ReservationRow,
  VenueRow,
} from '@/lib/database/types';
import type { SmsProvider } from './provider';
import { ConsoleSmsProvider } from './console-provider';
import { TwilioSmsProvider } from './twilio-provider';

/**
 * The transactional outbox.
 *
 * A reservation commits together with a row that says "an SMS is owed". Sending
 * happens afterwards, in a separate transaction, driven by this worker. That
 * separation is the whole point: Twilio being down, slow or rate-limited can
 * never roll back — or delay — a booking the guest has already been shown as
 * confirmed. The worst case is a confirmed reservation whose text arrives a
 * minute late, and the dashboard shows exactly which ones those are.
 *
 * Claiming is `for update skip locked` inside the database, so two overlapping
 * cron ticks cannot send the same message twice.
 */

let cachedProvider: SmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (cachedProvider) return cachedProvider;
  cachedProvider = getServerEnv().SMS_PROVIDER === 'twilio'
    ? new TwilioSmsProvider()
    : new ConsoleSmsProvider();
  return cachedProvider;
}

/** Test seam. */
export function setSmsProvider(provider: SmsProvider | null): void {
  cachedProvider = provider;
}

export interface ProcessResult {
  claimed: number;
  sent: number;
  failed: number;
}

interface TemplateData {
  confirmation_code?: string;
  starts_at?: string;
  party_size?: number;
  table_code?: string;
  first_name?: string;
  management_url?: string;
}

/**
 * Drain the outbox.
 *
 * Idempotent and safe to run concurrently. `limit` bounds one tick so a backlog
 * cannot blow a serverless function's time budget; the next tick takes the rest.
 */
export async function processOutbox(limit = 20): Promise<ProcessResult> {
  const supabase = getAdminClient();
  const provider = getSmsProvider();
  const env = getServerEnv();

  const { data: claimed, error } = await supabase.rpc('gg_claim_due_notifications', {
    p_limit: limit,
  });
  if (error) throw error;

  const rows = (claimed ?? []) as NotificationOutboxRow[];
  const result: ProcessResult = { claimed: rows.length, sent: 0, failed: 0 };
  if (rows.length === 0) return result;

  // Fetch the venues and reservations these messages refer to, in two queries
  // rather than two per message.
  const venueIds = [...new Set(rows.map((r) => r.venue_id))];
  const reservationIds = [...new Set(rows.map((r) => r.reservation_id).filter(Boolean))] as string[];

  const [{ data: venues }, { data: reservations }] = await Promise.all([
    supabase.from('venues').select('*').in('id', venueIds).returns<VenueRow[]>(),
    reservationIds.length
      ? supabase
          .from('reservations')
          .select('*')
          .in('id', reservationIds)
          .returns<ReservationRow[]>()
      : Promise.resolve({ data: [] as ReservationRow[] }),
  ]);

  const venueById = new Map((venues ?? []).map((v) => [v.id, v]));
  const reservationById = new Map((reservations ?? []).map((r) => [r.id, r]));

  for (const row of rows) {
    const venue = venueById.get(row.venue_id);
    if (!venue) {
      await recordResult(row.id, 'failed', provider.name, null, null, 'venue_missing');
      result.failed += 1;
      continue;
    }

    const data = (row.template_data ?? {}) as TemplateData;
    const reservation = row.reservation_id ? reservationById.get(row.reservation_id) : undefined;
    const locale = coerceLocale(row.locale);
    const startsAt = new Date(data.starts_at ?? reservation?.starts_at ?? Date.now());

    const common = {
      to: row.recipient,
      locale,
      guestFirstName: data.first_name ?? reservation?.guest_first_name ?? '',
      confirmationCode: data.confirmation_code ?? reservation?.confirmation_code ?? '',
      localDate: formatLocalDate(startsAt, locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      localTime: formatLocalTime(startsAt, locale),
      partySize: data.party_size ?? reservation?.party_size ?? 0,
      tableCode: data.table_code,
      venueName: venue.name,
      venuePhone: formatPhoneForHumans(venue.phone_e164),
      manageUrl: data.management_url,
    };

    try {
      const sendResult =
        row.type === 'reservation_cancellation'
          ? await provider.sendReservationCancellation(common)
          : row.type === 'reservation_update'
            ? await provider.sendReservationUpdate({ ...common, changed: 'time' })
            : await provider.sendReservationConfirmation(common);

      if (sendResult.ok) {
        await recordResult(
          row.id,
          'sent',
          provider.name,
          sendResult.providerMessageId ?? null,
          sendResult.body ?? null,
          null,
        );
        result.sent += 1;
      } else {
        // A permanent failure stops here: it is surfaced on the dashboard for a
        // human rather than retried into the same wall six times.
        await recordResult(
          row.id,
          sendResult.retryable === false ? 'undelivered' : 'failed',
          provider.name,
          null,
          sendResult.body ?? null,
          sendResult.error ?? 'send_failed',
        );
        result.failed += 1;
      }
    } catch (error) {
      logEvent('error', 'outbox.send_threw', {
        notification_id: row.id,
        recipient: redactPhone(row.recipient),
        message: (error as Error).message,
      });
      await recordResult(row.id, 'failed', provider.name, null, null, 'unexpected_error');
      result.failed += 1;
    }
  }

  if (env.SMS_DEBUG) {
    logEvent('info', 'outbox.processed', { ...result });
  }
  return result;
}

async function recordResult(
  id: string,
  status: 'sent' | 'failed' | 'undelivered',
  provider: string,
  providerMessageId: string | null,
  body: string | null,
  error: string | null,
): Promise<void> {
  await callFunction('gg_record_notification_result', {
    p_id: id,
    p_status: status,
    p_provider: provider,
    p_provider_message_id: providerMessageId,
    p_rendered_body: body,
    p_error: error,
  });
}

/** "+48570088888" → "+48 570 088 888". Polish grouping, for a readable SMS. */
export function formatPhoneForHumans(e164: string): string {
  if (e164.startsWith('+48') && e164.length === 12) {
    const digits = e164.slice(3);
    return `+48 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return e164;
}

/**
 * Attach the guest's management URL to a pending confirmation.
 *
 * The URL contains the raw token, which exists exactly once — right after the
 * reservation commits. It is written into the outbox row (not into the
 * reservation) so it lives only as long as the message does.
 */
export async function attachManagementUrl(
  reservationId: string,
  manageUrl: string,
): Promise<void> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('notification_outbox')
    .select('id, template_data')
    .eq('reservation_id', reservationId)
    .eq('type', 'reservation_confirmation')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .returns<Pick<NotificationOutboxRow, 'id' | 'template_data'>[]>();

  const row = data?.[0];
  if (!row) return;

  await supabase
    .from('notification_outbox')
    .update({ template_data: { ...row.template_data, management_url: manageUrl } })
    .eq('id', row.id);
}
