import { redactPhone } from '@/lib/security/redact';
import type {
  CancellationMessage,
  ConfirmationMessage,
  SmsProvider,
  SmsResult,
  UpdateMessage,
} from './provider';
import {
  estimateSegments,
  renderCancellation,
  renderConfirmation,
  renderUpdate,
} from './templates';

/**
 * The development adapter.
 *
 * Prints what would have been sent, with the recipient redacted, and reports
 * success so the outbox drains the way it will in production. It never reaches
 * a network, so a developer without Twilio credentials can still exercise the
 * whole confirmation path — and `lib/config/env.ts` refuses to let this adapter
 * run in production, because a booking system that silently does not send is
 * worse than one that visibly fails.
 */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';

  private deliver(body: string, to: string): SmsResult {
    const { encoding, segments } = estimateSegments(body);
    console.warn(
      [
        '',
        '┌─ SMS (development adapter — nothing was sent) ─────────────',
        `│ to:       ${redactPhone(to)}`,
        `│ encoding: ${encoding}, ${segments} segment(s), ${body.length} chars`,
        '│',
        ...body.split('\n').map((line) => `│ ${line}`),
        '└───────────────────────────────────────────────────────────',
      ].join('\n'),
    );
    return {
      ok: true,
      providerMessageId: `console-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      body,
    };
  }

  async sendReservationConfirmation(input: ConfirmationMessage): Promise<SmsResult> {
    return this.deliver(renderConfirmation(input), input.to);
  }

  async sendReservationUpdate(input: UpdateMessage): Promise<SmsResult> {
    return this.deliver(renderUpdate(input), input.to);
  }

  async sendReservationCancellation(input: CancellationMessage): Promise<SmsResult> {
    return this.deliver(renderCancellation(input), input.to);
  }
}
