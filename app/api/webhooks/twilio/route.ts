import { NextResponse } from 'next/server';
import { route } from '@/lib/api/handler';
import { callFunction } from '@/lib/supabase/admin';
import { validateTwilioSignature } from '@/lib/notifications/twilio-provider';
import { getServerEnv } from '@/lib/config/env';
import { logEvent } from '@/lib/security/redact';
import type { NotificationStatus } from '@/lib/database/types';

/**
 * POST /api/webhooks/twilio
 *
 * Delivery receipts. Twilio accepting a message only means it took it; whether
 * it reached a handset is this callback's news, and it is the difference
 * between "the guest was told" and "the guest thinks they have no booking".
 *
 * The signature is verified with Twilio's own validator against the raw form
 * body and the exact public URL. Without that check anyone who learned this
 * path could mark every message delivered — or every message failed — and the
 * dashboard would believe them. An unsigned or wrongly-signed request is
 * refused before anything is read out of it.
 *
 * Idempotent: keyed on `MessageSid`, so Twilio's own retries change nothing the
 * second time.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Twilio's message statuses → ours. */
const STATUS_MAP: Record<string, NotificationStatus> = {
  queued: 'sending',
  accepted: 'sending',
  sending: 'sending',
  sent: 'sent',
  delivered: 'delivered',
  undelivered: 'undelivered',
  failed: 'failed',
  read: 'delivered',
};

export const POST = route(
  async (request: Request) => {
    const env = getServerEnv();
    const signature = request.headers.get('x-twilio-signature');

    // The URL Twilio signed is the one it was configured with, which may differ
    // from what a proxy hands us — so the configured value wins when it is set.
    const url = env.TWILIO_STATUS_CALLBACK_URL || request.url;

    const raw = await request.text();
    const params: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(raw)) params[key] = value;

    if (!validateTwilioSignature(signature, url, params)) {
      logEvent('warn', 'twilio.signature_rejected', { has_signature: Boolean(signature) });
      // 403 with no body: an attacker probing this endpoint learns nothing.
      return new NextResponse(null, { status: 403 });
    }

    const messageSid = params.MessageSid ?? params.SmsSid;
    const rawStatus = params.MessageStatus ?? params.SmsStatus;

    if (!messageSid || !rawStatus) {
      return new NextResponse(null, { status: 400 });
    }

    const status = STATUS_MAP[rawStatus.toLowerCase()];
    if (!status) {
      // An unknown status is not an error worth retrying; acknowledge and move on.
      logEvent('info', 'twilio.unknown_status', { status: rawStatus });
      return new NextResponse(null, { status: 204 });
    }

    const errorCode = params.ErrorCode ? `twilio_error_code=${params.ErrorCode}` : null;

    const result = await callFunction<{ ok: boolean; code?: string }>('gg_apply_provider_status', {
      p_provider_message_id: messageSid,
      p_status: status,
      p_error: errorCode,
    });

    if (!result?.ok) {
      // A receipt for a message we have no record of: log it, acknowledge it.
      // Returning an error would only make Twilio retry something we cannot use.
      logEvent('info', 'twilio.unknown_message', { code: result?.code });
    }

    // Twilio wants 2xx with an empty body; anything else earns a retry.
    return new NextResponse(null, { status: 204 });
  },
  { rateLimit: 'webhook', skipOriginCheck: true },
);
