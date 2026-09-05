import type { Locale } from '@/lib/i18n/locales';

/**
 * The SMS provider boundary.
 *
 * Twilio is the first implementation, not the interface. Everything above this
 * line talks about "send a confirmation"; everything below it knows about
 * messaging service SIDs and status callbacks. Swapping to a Polish aggregator
 * later is a new file and one line in `getSmsProvider`.
 */

export interface ConfirmationMessage {
  to: string;
  locale: Locale;
  guestFirstName: string;
  confirmationCode: string;
  /** Warsaw-local, already formatted for the guest's language. */
  localDate: string;
  localTime: string;
  partySize: number;
  tableCode?: string;
  venueName: string;
  venuePhone: string;
  manageUrl?: string;
}

export interface UpdateMessage extends ConfirmationMessage {
  /** What changed, so the message can lead with it. */
  changed: 'time' | 'table' | 'party_size' | 'details';
}

export interface CancellationMessage {
  to: string;
  locale: Locale;
  guestFirstName: string;
  confirmationCode: string;
  localDate: string;
  localTime: string;
  venueName: string;
  venuePhone: string;
}

export interface SmsResult {
  /** Accepted by the provider. Delivery is confirmed later, by callback. */
  ok: boolean;
  providerMessageId?: string;
  /** Already safe to store and log: no credentials, no full recipient. */
  error?: string;
  /** True when retrying could plausibly succeed (network, 5xx, throttling). */
  retryable?: boolean;
  /** The body as sent, for the audit trail and the staff view. */
  body?: string;
}

export interface SmsProvider {
  readonly name: string;
  sendReservationConfirmation(input: ConfirmationMessage): Promise<SmsResult>;
  sendReservationUpdate(input: UpdateMessage): Promise<SmsResult>;
  sendReservationCancellation(input: CancellationMessage): Promise<SmsResult>;
}
