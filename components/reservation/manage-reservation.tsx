'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/shared/locale-provider';
import { apiPatch } from '@/lib/api/client';
import type { GuestReservationView } from '@/lib/reservations/service';
import {
  formatLocalDate,
  formatLocalTime,
  toLocalDateString,
  toLocalTimeString,
} from '@/lib/time/warsaw';

export function ManageReservation({
  token,
  initial,
  smsEnabled = true,
}: {
  token: string;
  initial: GuestReservationView;
  /**
   * False when the venue has no SMS channel. This page is then the *only* copy
   * of the management link the guest will ever get: nothing is texted, and the
   * URL contains a token they cannot retype from memory. Closing the tab means
   * telephoning the restaurant. So the link becomes something to save, and the
   * page says so.
   */
  smsEnabled?: boolean;
}) {
  const { locale, dictionary } = useLocale();
  const t = dictionary.manage;
  const [reservation, setReservation] = useState(initial);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * The management URL, read after mount.
   *
   * Not during render: the server has no `window`, so rendering the URL
   * directly would emit an empty input on the server and a populated one in the
   * browser — a hydration mismatch. The field is empty for one frame instead.
   */
  const [manageUrl, setManageUrl] = useState('');
  useEffect(() => {
    setManageUrl(window.location.href.split('?')[0] ?? window.location.href);
  }, []);

  /**
   * Copy the management link.
   *
   * `navigator.clipboard` is unavailable outside a secure context and can be
   * refused by permission, so a failure selects the link instead and leaves the
   * guest one keystroke from copying it themselves. It never reports success it
   * did not achieve — that is the whole point of the button existing.
   */
  const copyLink = async () => {
    const url = manageUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage(t.linkCopied);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      const field = document.getElementById('manage-link-value') as HTMLInputElement | null;
      field?.focus();
      field?.select();
      setMessage(t.linkCopyManual);
    }
  };
  const [date, setDate] = useState(toLocalDateString(new Date(initial.startsAt)));
  const [time, setTime] = useState(toLocalTimeString(new Date(initial.startsAt)));

  const cancel = async () => {
    if (!window.confirm(t.cancelConfirm)) return;
    setBusy(true);
    setError('');
    setMessage('');
    const result = await apiPatch<{ cancelled: boolean }>(`/api/reservations/${token}`, {
      action: 'cancel',
    });
    setBusy(false);
    if (!result.ok) {
      setError(
        result.code === 'cutoff_passed'
          ? t.cutoffPassed.replace(
              '{hours}',
              String(Math.ceil(reservation.policy.cancellationCutoffMinutes / 60)),
            )
          : dictionary.errors.generic,
      );
      return;
    }
    setReservation((current) => ({
      ...current,
      status: 'cancelled',
      canCancel: false,
      canReschedule: false,
    }));
    setMessage(t.cancelled);
  };

  const reschedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const result = await apiPatch<{ startsAt: string; tableCode: string }>(
      `/api/reservations/${token}`,
      {
        action: 'reschedule',
        date,
        time,
      },
    );
    setBusy(false);
    if (!result.ok) {
      setError(
        result.code === 'cutoff_passed'
          ? t.cutoffPassed.replace(
              '{hours}',
              String(Math.ceil(reservation.policy.cancellationCutoffMinutes / 60)),
            )
          : dictionary.errors.generic,
      );
      return;
    }
    setReservation((current) => ({
      ...current,
      startsAt: result.data.startsAt,
      tableCode: result.data.tableCode || current.tableCode,
    }));
    setMessage(t.rescheduled);
  };

  const startsAt = new Date(reservation.startsAt);
  return (
    <div className="panel" style={{ maxWidth: '52rem', margin: '0 auto' }}>
      <p className="eyebrow">Guzar Garden</p>
      <h1>{t.heading}</h1>
      {message ? (
        <div className="notice ok" role="status">
          <div>
            <b>{message}</b>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="notice error" role="alert">
          <div>
            <b>{error}</b>
          </div>
        </div>
      ) : null}
      <div className="code-plate">
        <small>{dictionary.confirmation.code}</small>
        <b>{reservation.confirmationCode}</b>
      </div>

      {/*
        With no SMS, this page is the only place the management link exists.
        Saying so, and making the link copyable, is the difference between a
        guest who can reschedule themselves and one who has to telephone.
      */}
      {reservation.status !== 'cancelled' ? (
        <section className="save-link" aria-labelledby="save-link-heading">
          <h2 id="save-link-heading">{smsEnabled ? t.saveLinkHeading : t.saveLinkHeadingNoSms}</h2>
          <p className="note">{smsEnabled ? t.saveLinkBody : t.saveLinkBodyNoSms}</p>
          <div className="field-row">
            <label className="field" style={{ flex: 1 }}>
              <span className="sr-only">{t.saveLinkLabel}</span>
              <input
                id="manage-link-value"
                type="text"
                readOnly
                value={manageUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <button type="button" className="btn outline" onClick={() => void copyLink()}>
              <span>{copied ? t.linkCopied : t.copyLink}</span>
            </button>
          </div>
        </section>
      ) : null}
      <ul className="summary">
        <li>
          <span className="label">{dictionary.confirmation.guest}</span>
          <span className="value">
            {reservation.firstName} {reservation.lastName}
          </span>
        </li>
        <li>
          <span className="label">{dictionary.confirmation.when}</span>
          <span className="value">
            {formatLocalDate(startsAt, locale)} · {formatLocalTime(startsAt, locale)}
          </span>
        </li>
        <li>
          <span className="label">{dictionary.confirmation.party}</span>
          <span className="value">{reservation.partySize}</span>
        </li>
        <li>
          <span className="label">{dictionary.confirmation.table}</span>
          <span className="value">{reservation.tableCode ?? '—'}</span>
        </li>
        <li>
          <span className="label">{t.status}</span>
          <span className="value">{reservation.status}</span>
        </li>
      </ul>
      {reservation.canReschedule ? (
        <form onSubmit={(event) => void reschedule(event)} style={{ marginTop: '1.6rem' }}>
          <h2>{t.rescheduleHeading}</h2>
          <div className="field-row">
            <label className="field">
              <span>{dictionary.reserve.steps.date}</span>
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{dictionary.reserve.steps.time}</span>
              <input
                type="time"
                required
                step={900}
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
          </div>
          <div className="actions">
            <button className="btn light" disabled={busy}>
              <span>{t.rescheduleSave}</span>
            </button>
          </div>
        </form>
      ) : null}
      {reservation.canCancel ? (
        <div className="actions">
          <button
            type="button"
            className="btn outline"
            disabled={busy}
            onClick={() => void cancel()}
          >
            <span>{t.cancel}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
