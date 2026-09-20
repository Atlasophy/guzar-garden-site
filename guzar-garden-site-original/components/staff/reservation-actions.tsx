'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '@/lib/api/client';
import type { StaffReservationView } from '@/lib/staff/reservations';
import { formatStaffMessage } from '@/lib/i18n/staff';
import type { StaffDictionary } from '@/lib/i18n/staff';
import { useStaffDictionary } from './use-staff-dictionary';

/**
 * What actually happened to the guest's confirmation message.
 *
 * `status` alone is not the answer, and reading it as one is a trap the host
 * stand would fall into daily: the console adapter records `sent` for a message
 * it only printed to a server log, and the disabled adapter records
 * `undelivered` for a venue that never intended to text anybody. Both look like
 * ordinary delivery outcomes in the database.
 *
 * So the provider decides the wording, and only Twilio is ever described as
 * having reached a phone.
 */
function NotificationStatus({
  notification,
  dictionary,
}: {
  notification: NonNullable<StaffReservationView['notification']>;
  dictionary: StaffDictionary;
}) {
  if (notification.provider === 'disabled' || notification.lastError === 'sms_disabled') {
    return <div className="staff-notice">{dictionary.smsDisabled}</div>;
  }

  if (notification.provider && notification.provider !== 'twilio') {
    return (
      <div className="staff-notice warn">
        {formatStaffMessage(dictionary.testMessage, {
          provider: notification.provider,
          status: notification.status,
        })}
      </div>
    );
  }

  if (notification.deliveredToPhone) {
    return (
      <div className="staff-notice">
        {formatStaffMessage(dictionary.smsDelivered, { status: notification.status })}
      </div>
    );
  }

  return (
    <div className="staff-notice warn">
      {formatStaffMessage(dictionary.smsNotDelivered, {
        status: notification.status,
        error: notification.lastError ? ` — ${notification.lastError}` : '',
      })}
    </div>
  );
}

export function ReservationActions({ reservation }: { reservation: StaffReservationView }) {
  const router = useRouter();
  const dictionary = useStaffDictionary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError('');
    const r = await apiPatch(`/api/staff/reservations/${reservation.id}`, body);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    router.refresh();
  };
  return (
    <section className="staff-card">
      <h2>{dictionary.reservationHandling}</h2>
      {error ? <div className="staff-notice error">{error}</div> : null}
      {reservation.notification ? (
        <NotificationStatus notification={reservation.notification} dictionary={dictionary} />
      ) : null}
      <div className="staff-actions">
        {reservation.status === 'confirmed' ? (
          <button
            className="staff-button"
            disabled={busy}
            onClick={() => void act({ action: 'status', status: 'seated' })}
          >
            {dictionary.seatGuests}
          </button>
        ) : null}
        {reservation.status === 'seated' ? (
          <button
            className="staff-button"
            disabled={busy}
            onClick={() => void act({ action: 'status', status: 'completed' })}
          >
            {dictionary.completeVisit}
          </button>
        ) : null}
        {reservation.status === 'confirmed' ? (
          <button
            className="staff-button secondary"
            disabled={busy}
            onClick={() => void act({ action: 'status', status: 'no_show' })}
          >
            {dictionary.noShow}
          </button>
        ) : null}
        {!['cancelled', 'completed', 'no_show'].includes(reservation.status) ? (
          <button
            className="staff-button danger"
            disabled={busy}
            onClick={() => {
              const reason = window.prompt(
                dictionary.cancelReasonPrompt,
                dictionary.cancelledByStaff,
              );
              if (reason !== null) void act({ action: 'cancel', reason });
            }}
          >
            {dictionary.cancel}
          </button>
        ) : null}
        {/*
          Resending is only offered when a resend could actually reach a phone.
          With SMS_PROVIDER=disabled every confirmation is recorded as
          `undelivered`, so without this check the host stand would show a
          "Wyślij SMS ponownie" button on every single booking, and pressing it
          would fail every single time.
        */}
        {reservation.notification &&
        reservation.notification.provider === 'twilio' &&
        ['failed', 'undelivered'].includes(reservation.notification.status) ? (
          <button
            className="staff-button secondary"
            disabled={busy}
            onClick={() =>
              void act({ action: 'resend_sms', notificationId: reservation.notification?.id })
            }
          >
            {dictionary.resendSms}
          </button>
        ) : null}
      </div>
    </section>
  );
}
