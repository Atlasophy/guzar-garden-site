'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '@/lib/api/client';
import type { StaffNotificationView, StaffReservationView } from '@/lib/staff/reservations';
import { formatStaffMessage } from '@/lib/i18n/staff';
import type { StaffDictionary } from '@/lib/i18n/staff';
import { useStaffDictionary } from './use-staff-dictionary';

/**
 * What actually happened to one of the guest's confirmation messages.
 *
 * `status` alone is not the answer, and reading it as one is a trap the host
 * stand would fall into daily: the console adapter records `sent` for a message
 * it only printed to a server log, and the disabled adapter records
 * `undelivered` for a venue that never intended to send anything on that
 * channel. Both look like ordinary delivery outcomes in the database.
 *
 * So the provider decides the wording, and only a real provider (Twilio for
 * SMS; anything but console/disabled for email) is ever described as having
 * reached the guest. One of these renders per channel that has a row.
 */
function NotificationStatus({
  notification,
  dictionary,
}: {
  notification: StaffNotificationView;
  dictionary: StaffDictionary;
}) {
  const isEmail = notification.channel === 'email';
  const disabledKey = isEmail ? 'emailDisabled' : 'smsDisabled';
  const disabledErrorCode = isEmail ? 'email_disabled' : 'sms_disabled';
  const testMessageKey = isEmail ? 'testMessageEmail' : 'testMessage';
  const deliveredKey = isEmail ? 'emailDelivered' : 'smsDelivered';
  const notDeliveredKey = isEmail ? 'emailNotDelivered' : 'smsNotDelivered';

  if (notification.provider === 'disabled' || notification.lastError === disabledErrorCode) {
    return <div className="staff-notice">{dictionary[disabledKey]}</div>;
  }

  const isRealProvider = isEmail
    ? notification.provider !== null &&
      notification.provider !== 'console' &&
      notification.provider !== 'disabled'
    : notification.provider === 'twilio';

  if (notification.provider && !isRealProvider) {
    return (
      <div className="staff-notice warn">
        {formatStaffMessage(dictionary[testMessageKey], {
          provider: notification.provider,
          status: notification.status,
        })}
      </div>
    );
  }

  if (notification.delivered) {
    return (
      <div className="staff-notice">
        {formatStaffMessage(dictionary[deliveredKey], { status: notification.status })}
      </div>
    );
  }

  return (
    <div className="staff-notice warn">
      {formatStaffMessage(dictionary[notDeliveredKey], {
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
      {reservation.notifications.map((notification) => (
        <NotificationStatus
          key={notification.id}
          notification={notification}
          dictionary={dictionary}
        />
      ))}
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
          Resending is only offered per channel when a resend could actually
          reach the guest. With a channel disabled, every message on it is
          recorded as `undelivered`, so without this check the host stand
          would show a resend button for every single booking, on a channel
          that would fail every single time.
        */}
        {reservation.notifications
          .filter((notification) => {
            const reachesGuest =
              notification.channel === 'sms'
                ? notification.provider === 'twilio'
                : notification.provider !== null &&
                  notification.provider !== 'console' &&
                  notification.provider !== 'disabled';
            return reachesGuest && ['failed', 'undelivered'].includes(notification.status);
          })
          .map((notification) => (
            <button
              key={notification.id}
              className="staff-button secondary"
              disabled={busy}
              onClick={() =>
                void act({ action: 'resend_notification', notificationId: notification.id })
              }
            >
              {notification.channel === 'email' ? dictionary.resendEmail : dictionary.resendSms}
            </button>
          ))}
      </div>
    </section>
  );
}
