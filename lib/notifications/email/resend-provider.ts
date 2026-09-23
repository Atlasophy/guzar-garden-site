import 'server-only';
import { getServerEnv } from '@/lib/config/env';
import { logEvent, redactEmail } from '@/lib/security/redact';
import type {
  CancellationMessage,
  ConfirmationMessage,
  EmailProvider,
  EmailResult,
  UpdateMessage,
} from './provider';
import { renderCancellationEmail, renderConfirmationEmail, renderUpdateEmail } from './templates';
import type { RenderedEmail } from './templates';

/**
 * Resend.
 *
 * A single JSON POST to their HTTP API — no SDK dependency, same reasoning
 * Twilio's own client library exists for a richer surface (delivery
 * callbacks, signed webhooks) that this integration does not need yet.
 *
 * Errors are classified before they are stored, mirroring
 * `twilio-provider.ts`: a 4xx means the message will never go (bad address,
 * unverified sender domain) and retrying just repeats the failure, while a
 * 429 or 5xx is worth retrying.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  private async send(to: string, rendered: RenderedEmail): Promise<EmailResult> {
    const env = getServerEnv();
    if (!env.RESEND_API_KEY) {
      return {
        ok: false,
        error: 'RESEND_API_KEY is not configured',
        retryable: false,
        body: rendered.text,
      };
    }
    if (!env.EMAIL_FROM_ADDRESS) {
      return {
        ok: false,
        error: 'EMAIL_FROM_ADDRESS is not configured',
        retryable: false,
        body: rendered.text,
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM_ADDRESS,
          to,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });

      if (response.ok) {
        const data = (await response.json().catch(() => null)) as { id?: string } | null;
        if (env.EMAIL_DEBUG) {
          logEvent('info', 'email.sent', { to: redactEmail(to), id: data?.id ?? null });
        }
        return { ok: true, providerMessageId: data?.id, body: rendered.text };
      }

      const status = response.status;
      // Never store the provider's full response: Resend's error body can
      // echo the recipient and subject back verbatim.
      const safe = `resend_error status=${status}`;
      logEvent('error', 'email.failed', { to: redactEmail(to), status });

      return {
        ok: false,
        error: safe,
        retryable: status === 429 || status >= 500,
        body: rendered.text,
      };
    } catch (error) {
      logEvent('error', 'email.threw', { to: redactEmail(to), message: (error as Error).message });
      return { ok: false, error: 'network_error', retryable: true, body: rendered.text };
    }
  }

  async sendReservationConfirmation(input: ConfirmationMessage): Promise<EmailResult> {
    return this.send(input.to, renderConfirmationEmail(input));
  }

  async sendReservationUpdate(input: UpdateMessage): Promise<EmailResult> {
    return this.send(input.to, renderUpdateEmail(input));
  }

  async sendReservationCancellation(input: CancellationMessage): Promise<EmailResult> {
    return this.send(input.to, renderCancellationEmail(input));
  }
}
