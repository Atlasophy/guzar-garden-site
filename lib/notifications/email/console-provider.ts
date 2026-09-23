import { redactEmail } from '@/lib/security/redact';
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
 * The development adapter. Prints the subject and plain-text body, with the
 * recipient redacted, and reports success so the outbox drains the way it
 * will in production. `lib/config/env.ts` refuses to let this adapter run in
 * production — a booking system that silently does not send is worse than
 * one that visibly fails.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  private deliver(rendered: RenderedEmail, to: string): EmailResult {
    console.warn(
      [
        '',
        '┌─ Email (development adapter — nothing was sent) ───────────',
        `│ to:      ${redactEmail(to)}`,
        `│ subject: ${rendered.subject}`,
        '│',
        ...rendered.text.split('\n').map((line) => `│ ${line}`),
        '└───────────────────────────────────────────────────────────',
      ].join('\n'),
    );
    return {
      ok: true,
      providerMessageId: `console-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      body: rendered.text,
    };
  }

  async sendReservationConfirmation(input: ConfirmationMessage): Promise<EmailResult> {
    return this.deliver(renderConfirmationEmail(input), input.to);
  }

  async sendReservationUpdate(input: UpdateMessage): Promise<EmailResult> {
    return this.deliver(renderUpdateEmail(input), input.to);
  }

  async sendReservationCancellation(input: CancellationMessage): Promise<EmailResult> {
    return this.deliver(renderCancellationEmail(input), input.to);
  }
}
