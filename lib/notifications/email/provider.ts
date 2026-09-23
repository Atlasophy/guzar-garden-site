import type { CancellationMessage, ConfirmationMessage, UpdateMessage } from '../provider';

/**
 * The email provider boundary.
 *
 * Deliberate mirror of `../provider.ts`'s `SmsProvider`: same three operations,
 * same message shapes (an email and a text confirm the same reservation, so
 * there is no reason for the data to differ), same claim/send/record lifecycle
 * through the shared outbox. The concrete sender is a separate file, exactly
 * like Twilio is for SMS — swapping providers later is a new adapter and one
 * line in `getEmailProvider`.
 */

export type { ConfirmationMessage, UpdateMessage, CancellationMessage };

export interface EmailResult {
  /** Accepted by the provider. Delivery/bounce is not tracked here. */
  ok: boolean;
  providerMessageId?: string;
  /** Already safe to store and log: no credentials, no full recipient. */
  error?: string;
  /** True when retrying could plausibly succeed (network, 5xx, throttling). */
  retryable?: boolean;
  /** The plain-text body as sent, for the audit trail and the staff view. */
  body?: string;
}

export interface EmailProvider {
  readonly name: string;
  sendReservationConfirmation(input: ConfirmationMessage): Promise<EmailResult>;
  sendReservationUpdate(input: UpdateMessage): Promise<EmailResult>;
  sendReservationCancellation(input: CancellationMessage): Promise<EmailResult>;
}
