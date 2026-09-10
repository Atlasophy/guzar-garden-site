import type {
  CancellationMessage,
  ConfirmationMessage,
  SmsProvider,
  SmsResult,
  UpdateMessage,
} from './provider';
import { renderCancellation, renderConfirmation, renderUpdate } from './templates';

/**
 * The "this venue has no SMS channel" adapter.
 *
 * Guzar Garden launched before Twilio existed for it, and the alternative to
 * this adapter was worse in both directions: the console adapter reports
 * success for a message nobody sent, and leaving `SMS_PROVIDER=twilio` unset
 * stops the application booting at all.
 *
 * So this one refuses, permanently and on purpose. `retryable: false` makes the
 * outbox record each message as `undelivered` rather than `failed`, which means
 * it is never retried and — importantly — is already terminal if Twilio is
 * switched on later. Nobody receives a stale confirmation for a dinner that
 * happened three weeks ago.
 *
 * The body is still rendered and stored. Staff can read exactly what the guest
 * would have been told, which is what makes the dashboard's "not sent" honest
 * rather than merely empty.
 *
 * The other half of this contract lives in the booking form: when SMS is
 * disabled the guest is never promised a text in the first place. See
 * `isSmsEnabled()` in lib/config/env.ts.
 */
export class DisabledSmsProvider implements SmsProvider {
  readonly name = 'disabled';

  private refuse(body: string): SmsResult {
    return {
      ok: false,
      retryable: false,
      error: 'sms_disabled',
      body,
    };
  }

  async sendReservationConfirmation(input: ConfirmationMessage): Promise<SmsResult> {
    return this.refuse(renderConfirmation(input));
  }

  async sendReservationUpdate(input: UpdateMessage): Promise<SmsResult> {
    return this.refuse(renderUpdate(input));
  }

  async sendReservationCancellation(input: CancellationMessage): Promise<SmsResult> {
    return this.refuse(renderCancellation(input));
  }
}
