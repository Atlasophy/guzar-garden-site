import type {
  CancellationMessage,
  ConfirmationMessage,
  EmailProvider,
  EmailResult,
  UpdateMessage,
} from './provider';
import { renderCancellationEmail, renderConfirmationEmail, renderUpdateEmail } from './templates';

/**
 * The "this venue has no email channel" adapter.
 *
 * Same contract as `DisabledSmsProvider`: refuses permanently and on purpose.
 * `retryable: false` records each message as `undelivered` rather than
 * `failed`, so nothing is retried and nothing goes stale if email is switched
 * on later. The body is still rendered and stored, so staff can see exactly
 * what the guest would have been sent.
 *
 * This is the default. `EMAIL_PROVIDER` must be switched on deliberately —
 * see `isEmailEnabled()` in lib/config/env.ts.
 */
export class DisabledEmailProvider implements EmailProvider {
  readonly name = 'disabled';

  private refuse(body: string): EmailResult {
    return {
      ok: false,
      retryable: false,
      error: 'email_disabled',
      body,
    };
  }

  async sendReservationConfirmation(input: ConfirmationMessage): Promise<EmailResult> {
    return this.refuse(renderConfirmationEmail(input).text);
  }

  async sendReservationUpdate(input: UpdateMessage): Promise<EmailResult> {
    return this.refuse(renderUpdateEmail(input).text);
  }

  async sendReservationCancellation(input: CancellationMessage): Promise<EmailResult> {
    return this.refuse(renderCancellationEmail(input).text);
  }
}
