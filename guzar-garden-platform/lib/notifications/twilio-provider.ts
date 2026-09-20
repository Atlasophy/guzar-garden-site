import 'server-only';
import twilio from 'twilio';
import { getServerEnv } from '@/lib/config/env';
import { logEvent, redactPhone } from '@/lib/security/redact';
import type {
  CancellationMessage,
  ConfirmationMessage,
  SmsProvider,
  SmsResult,
  UpdateMessage,
} from './provider';
import { renderCancellation, renderConfirmation, renderUpdate } from './templates';

/**
 * Twilio.
 *
 * Sends through a Messaging Service rather than a bare `from` number: that is
 * what lets the restaurant register a Polish alphanumeric sender ID ("GUZAR")
 * and add or change numbers without a deploy.
 *
 * Errors are classified before they are stored. A 4xx from Twilio means the
 * message will never go — a malformed number, a blocked recipient — and
 * retrying it just burns money and hides the real problem on the dashboard. A
 * 5xx or a network failure is worth retrying, and the outbox backs off.
 */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';

  private client: ReturnType<typeof twilio> | null = null;

  private getClient() {
    if (this.client) return this.client;
    const env = getServerEnv();
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error(
        'Twilio is selected as the SMS provider but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set.',
      );
    }
    this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    return this.client;
  }

  private async send(to: string, body: string): Promise<SmsResult> {
    const env = getServerEnv();
    if (!env.TWILIO_MESSAGING_SERVICE_SID) {
      return {
        ok: false,
        error: 'TWILIO_MESSAGING_SERVICE_SID is not configured',
        retryable: false,
        body,
      };
    }

    try {
      const message = await this.getClient().messages.create({
        to,
        body,
        messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID,
        ...(env.TWILIO_STATUS_CALLBACK_URL
          ? { statusCallback: env.TWILIO_STATUS_CALLBACK_URL }
          : {}),
      });

      if (env.SMS_DEBUG) {
        logEvent('info', 'sms.sent', { to: redactPhone(to), sid: message.sid });
      }

      return { ok: true, providerMessageId: message.sid, body };
    } catch (error) {
      const status = (error as { status?: number }).status ?? 0;
      const code = (error as { code?: number }).code;
      // Never store the provider's full message: it echoes the recipient back.
      const safe = `twilio_error status=${status}${code ? ` code=${code}` : ''}`;

      logEvent('error', 'sms.failed', { to: redactPhone(to), status, code });

      return {
        ok: false,
        error: safe,
        retryable: status === 0 || status === 429 || status >= 500,
        body,
      };
    }
  }

  async sendReservationConfirmation(input: ConfirmationMessage): Promise<SmsResult> {
    return this.send(input.to, renderConfirmation(input));
  }

  async sendReservationUpdate(input: UpdateMessage): Promise<SmsResult> {
    return this.send(input.to, renderUpdate(input));
  }

  async sendReservationCancellation(input: CancellationMessage): Promise<SmsResult> {
    return this.send(input.to, renderCancellation(input));
  }
}

/**
 * Verify a Twilio status callback.
 *
 * Uses Twilio's own signature validator against the raw form body and the exact
 * public URL the request was sent to. Without this, anyone who learns the
 * endpoint could mark every message as delivered — or as failed — and the
 * dashboard would believe them.
 */
export function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  const env = getServerEnv();
  if (!signature || !env.TWILIO_AUTH_TOKEN) return false;
  return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params);
}
