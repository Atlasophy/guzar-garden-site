'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '@/lib/api/client';
import type { StaffReservationView } from '@/lib/staff/reservations';

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
}: {
  notification: NonNullable<StaffReservationView['notification']>;
}) {
  if (notification.provider === 'disabled' || notification.lastError === 'sms_disabled') {
    return (
      <div className="staff-notice">
        SMS jest wyłączony — gość nie dostał wiadomości. Potwierdzenie zobaczył na ekranie.
      </div>
    );
  }

  if (notification.provider && notification.provider !== 'twilio') {
    return (
      <div className="staff-notice warn">
        Tryb testowy ({notification.provider}) — nic nie zostało wysłane na telefon. Status „
        {notification.status}” pochodzi z testu.
      </div>
    );
  }

  if (notification.deliveredToPhone) {
    return (
      <div className="staff-notice">SMS wysłany na telefon gościa ({notification.status}).</div>
    );
  }

  return (
    <div className="staff-notice warn">
      SMS nie dotarł ({notification.status}
      {notification.lastError ? ` — ${notification.lastError}` : ''}).
    </div>
  );
}

export function ReservationActions({ reservation }: { reservation: StaffReservationView }) {
  const router = useRouter();
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
      <h2>Obsługa rezerwacji</h2>
      {error ? <div className="staff-notice error">{error}</div> : null}
      {reservation.notification ? (
        <NotificationStatus notification={reservation.notification} />
      ) : null}
      <div className="staff-actions">
        {reservation.status === 'confirmed' ? (
          <button
            className="staff-button"
            disabled={busy}
            onClick={() => void act({ action: 'status', status: 'seated' })}
          >
            Posadź gości
          </button>
        ) : null}
        {reservation.status === 'seated' ? (
          <button
            className="staff-button"
            disabled={busy}
            onClick={() => void act({ action: 'status', status: 'completed' })}
          >
            Zakończ wizytę
          </button>
        ) : null}
        {reservation.status === 'confirmed' ? (
          <button
            className="staff-button secondary"
            disabled={busy}
            onClick={() => void act({ action: 'status', status: 'no_show' })}
          >
            Nieobecność
          </button>
        ) : null}
        {!['cancelled', 'completed', 'no_show'].includes(reservation.status) ? (
          <button
            className="staff-button danger"
            disabled={busy}
            onClick={() => {
              const reason = window.prompt('Powód anulowania:', 'Anulowane przez obsługę');
              if (reason !== null) void act({ action: 'cancel', reason });
            }}
          >
            Anuluj
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
            Wyślij SMS ponownie
          </button>
        ) : null}
      </div>
    </section>
  );
}
