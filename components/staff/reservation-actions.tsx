'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '@/lib/api/client';
import type { StaffReservationView } from '@/lib/staff/reservations';

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
        {reservation.notification &&
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
