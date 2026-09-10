'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/shared/locale-provider';
import { SITE, TEL_HREF } from '@/components/shared/site-config';
import { interpolate, pluralPeople } from '@/lib/i18n';
import { localized } from '@/lib/i18n/fallback';
import { apiDelete, apiFetch, apiPost } from '@/lib/api/client';
import { addLocalDays, formatLocalDate, toLocalDateString } from '@/lib/time/warsaw';
import type { AvailabilityResponse, AvailabilityTableView } from '@/lib/availability/service';
import { FloorPlan } from './floor-plan';
import { TableList } from './table-list';
import { useHoldCountdown } from './use-hold-countdown';
import { GuestForm, type GuestFormValues } from './guest-form';

/**
 * The booking journey.
 *
 * Party size → date → time → table → details → review → confirmed.
 *
 * Two rules shape the whole thing:
 *
 *   The server owns the truth. Availability, the hold's clock and the final
 *   commit are all the server's; this component never decides that a table is
 *   free, only asks. `serverNow` comes back with every availability response
 *   precisely so the browser's clock never gets a say.
 *
 *   Going back never costs anything. Changing the party size or the date after
 *   filling in the form keeps the form. The only thing that is deliberately
 *   given up is the hold, because holding a table you have moved away from is
 *   holding it against somebody who wants it.
 */

type Step = 'party' | 'date' | 'time' | 'table' | 'details' | 'review';

const STEP_ORDER: Step[] = ['party', 'date', 'time', 'table', 'details', 'review'];

interface HoldState {
  token: string;
  tableId: string;
  tableCode: string;
  expiresAt: string;
  serverNow: string;
}

export interface BookingFlowProps {
  /** Seeded from the server so the first paint is not empty. */
  initialDate: string;
  maxPartySize: number;
  bookingHorizonDays: number;
  /** False when the venue has no SMS channel; decided on the server. */
  smsEnabled?: boolean;
  /** Set by the end-to-end test that exercises the non-WebGL path. */
  disable3D?: boolean;
}

export function BookingFlow({
  initialDate,
  maxPartySize,
  bookingHorizonDays,
  smsEnabled = true,
  disable3D = false,
}: BookingFlowProps) {
  const router = useRouter();
  const { locale, dictionary } = useLocale();
  const t = dictionary.reserve;

  const [step, setStep] = useState<Step>('party');
  const [partySize, setPartySize] = useState<number | null>(null);
  const [date, setDate] = useState<string>(initialDate);
  const [time, setTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hold, setHold] = useState<HoldState | null>(null);
  const [holdingTableId, setHoldingTableId] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [guest, setGuest] = useState<GuestFormValues | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const countdown = useHoldCountdown(hold?.expiresAt ?? null, hold?.serverNow ?? null);

  /**
   * One idempotency key per journey, generated when the flow starts.
   *
   * Reused for every retry of the confirmation, so a double tap, a flaky
   * connection or a proxy replay all land on the same reservation instead of
   * three. A fresh key is only minted after a completed booking.
   */
  const idempotencyKey = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2).padEnd(16, '0'),
  );

  const today = useMemo(() => toLocalDateString(new Date()), []);

  const dates = useMemo(() => {
    const horizon = Math.min(bookingHorizonDays, 60);
    return Array.from({ length: horizon }, (_, offset) => addLocalDays(today, offset));
  }, [today, bookingHorizonDays]);

  // ---- availability -------------------------------------------------------

  const loadAvailability = useCallback(
    async (nextDate: string, nextPartySize: number, nextTime?: string | null) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        date: nextDate,
        partySize: String(nextPartySize),
      });
      if (nextTime) params.set('time', nextTime);
      if (hold?.token) params.set('holdToken', hold.token);

      const result = await apiFetch<AvailabilityResponse>(`/api/availability?${params}`);
      setLoading(false);

      if (!result.ok) {
        setError({
          code: result.code,
          message:
            result.code === 'network' ? dictionary.errors.network : dictionary.errors.generic,
        });
        return null;
      }

      setAvailability(result.data);
      if (nextTime) {
        setAnnouncement(
          interpolate(t.announceSlotsUpdated, {
            count: result.data.tables.filter((table) => table.selectable).length,
          }),
        );
      } else {
        setAnnouncement(interpolate(t.announceSlotsUpdated, { count: result.data.slots.length }));
      }
      return result.data;
    },
    [hold?.token, dictionary.errors, t.announceSlotsUpdated],
  );

  /**
   * The floor is re-read while the guest is looking at it, and again — always —
   * immediately before a hold is attempted. A plan that is thirty seconds stale
   * shows tables that are already gone, and the guest finds out by being
   * refused.
   */
  useEffect(() => {
    if (step !== 'table' || !time || !partySize) return;
    const timer = window.setInterval(() => {
      void loadAvailability(date, partySize, time);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [step, time, partySize, date, loadAvailability]);

  // ---- holds --------------------------------------------------------------

  const releaseHold = useCallback(async (token: string) => {
    await apiDelete(`/api/holds/${token}`).catch(() => null);
  }, []);

  const selectTable = useCallback(
    async (table: AvailabilityTableView) => {
      if (!partySize || !time) return;
      if (hold?.tableId === table.id) {
        setStep('details');
        return;
      }

      setHoldingTableId(table.id);
      setError(null);

      // Revalidate first: what is on screen may be seconds old, and finding out
      // here is better than finding out from a rejection.
      const fresh = await loadAvailability(date, partySize, time);
      const current = fresh?.tables.find((entry) => entry.id === table.id);
      if (current && !current.selectable) {
        setHoldingTableId(null);
        setError({ code: 'table_unavailable', message: dictionary.errors.tableUnavailable });
        return;
      }

      // Give the previous table back before taking a new one — otherwise a
      // guest browsing tables quietly holds three of them at once.
      if (hold) {
        await releaseHold(hold.token);
        setHold(null);
      }

      const result = await apiPost<{
        holdToken: string;
        tableId: string;
        tableCode: string;
        expiresAt: string;
        serverNow: string;
      }>('/api/holds', { tableId: table.id, date, time, partySize });

      setHoldingTableId(null);

      if (!result.ok) {
        setError({
          code: result.code,
          message:
            result.code === 'table_unavailable'
              ? dictionary.errors.tableUnavailable
              : result.code === 'capacity_mismatch'
                ? dictionary.errors.capacityMismatch
                : result.code === 'network'
                  ? dictionary.errors.network
                  : dictionary.errors.generic,
        });
        void loadAvailability(date, partySize, time);
        return;
      }

      setHold({
        token: result.data.holdToken,
        tableId: result.data.tableId,
        tableCode: result.data.tableCode,
        expiresAt: result.data.expiresAt,
        serverNow: result.data.serverNow,
      });

      const areaName = availability?.areas.find((area) => area.id === table.areaId);
      setAnnouncement(
        interpolate(t.announceTableSelected, {
          code: table.code,
          area: areaName ? localized(areaName.name, locale) : '',
        }),
      );
      setStep('details');
    },
    [
      partySize,
      time,
      date,
      hold,
      availability,
      locale,
      loadAvailability,
      releaseHold,
      dictionary.errors,
      t.announceTableSelected,
    ],
  );

  /*
   * The hold ran out while the guest was typing.
   *
   * The form is kept, the table is not — it went back to the floor and somebody
   * else may already have it. The guest is put back on the table step with what
   * they typed intact and told plainly what happened, rather than discovering
   * it at the moment they press Confirm.
   */
  useEffect(() => {
    if (!hold || !countdown.expired) return;
    setHold(null);
    setError({ code: 'hold_expired', message: t.holdExpiredBody });
    setStep('table');
    if (partySize && time) void loadAvailability(date, partySize, time);
  }, [countdown.expired, hold, partySize, time, date, loadAvailability, t.holdExpiredBody]);

  /*
   * A best-effort release when the tab goes away. `visibilitychange` with
   * `sendBeacon` is the only version of this that fires reliably on mobile —
   * and even so it is a courtesy, not the mechanism: the hold's own expiry and
   * the sweep job are what actually free the table.
   */
  useEffect(() => {
    if (!hold) return;
    const token = hold.token;
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      navigator.sendBeacon?.(`/api/holds/${token}/beacon-release`);
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [hold]);

  // ---- navigation ---------------------------------------------------------

  const goTo = useCallback(
    async (next: Step) => {
      // Stepping back before the table means the hold no longer matches what is
      // being booked, so it is released rather than left dangling.
      const nextIndex = STEP_ORDER.indexOf(next);
      if (hold && nextIndex < STEP_ORDER.indexOf('table')) {
        await releaseHold(hold.token);
        setHold(null);
      }
      setError(null);
      setStep(next);
    },
    [hold, releaseHold],
  );

  const choosePartySize = async (size: number) => {
    setPartySize(size);
    setTime(null);
    if (hold) {
      await releaseHold(hold.token);
      setHold(null);
    }
    setStep('date');
    void loadAvailability(date, size);
  };

  const chooseDate = (nextDate: string) => {
    setDate(nextDate);
    setTime(null);
    setStep('time');
    if (partySize) void loadAvailability(nextDate, partySize);
  };

  const chooseTime = (nextTime: string) => {
    setTime(nextTime);
    setStep('table');
    if (partySize) void loadAvailability(date, partySize, nextTime);
  };

  // ---- confirmation -------------------------------------------------------

  const confirm = async () => {
    if (!hold || !guest || !partySize) return;
    setSubmitting(true);
    setError(null);

    const result = await apiPost<{
      confirmationCode: string;
      manageUrl: string | null;
      startsAt: string;
      tableCode: string;
    }>('/api/reservations', {
      holdToken: hold.token,
      idempotencyKey: idempotencyKey.current,
      guest: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email ?? '',
        phone: guest.phone,
        partySize,
        locale,
        specialRequests: guest.specialRequests ?? '',
        privacyAccepted: guest.privacyAccepted,
        marketingConsent: guest.marketingConsent,
      },
    });

    setSubmitting(false);

    if (!result.ok) {
      const messages: Record<string, string> = {
        table_unavailable: dictionary.errors.tableUnavailable,
        hold_expired: dictionary.errors.holdExpired,
        hold_not_found: dictionary.errors.holdNotFound,
        capacity_mismatch: dictionary.errors.capacityMismatch,
        outside_opening_hours: dictionary.errors.outsideOpeningHours,
        network: dictionary.errors.network,
        rate_limited: dictionary.errors.rateLimited,
      };
      setError({ code: result.code, message: messages[result.code] ?? dictionary.errors.generic });

      if (result.code === 'hold_expired' || result.code === 'table_unavailable') {
        setHold(null);
        setStep('table');
        if (partySize && time) void loadAvailability(date, partySize, time);
      }
      return;
    }

    // The success state exists only now, after the database has committed.
    const manageUrl = result.data.manageUrl;
    const target = manageUrl
      ? `${manageUrl}?just=1`
      : `/reservation/${result.data.confirmationCode}`;
    router.push(target);
  };

  // ---- rendering ----------------------------------------------------------

  const stepIndex = STEP_ORDER.indexOf(step);
  const selectedTable = availability?.tables.find((table) => table.id === hold?.tableId);
  const selectedArea = availability?.areas.find((area) => area.id === selectedTable?.areaId);

  const stepLabels: Record<Step, string> = {
    party: t.steps.party,
    date: t.steps.date,
    time: t.steps.time,
    table: t.steps.table,
    details: t.steps.details,
    review: t.steps.review,
  };

  const stepValues: Record<Step, string> = {
    party: partySize ? `${partySize}` : '—',
    date: date
      ? formatLocalDate(new Date(`${date}T12:00:00Z`), locale, { day: 'numeric', month: 'short' })
      : '—',
    time: time ?? '—',
    table: hold?.tableCode ?? '—',
    details: guest ? `${guest.firstName} ${guest.lastName}`.trim() : '—',
    review: '—',
  };

  return (
    <div className="book-grid">
      <div>
        {/* The rail is a summary and a way back; a step you have not reached yet
            is not a link. */}
        <ol className="steps">
          {STEP_ORDER.map((entry, index) => {
            const state = index === stepIndex ? 'current' : index < stepIndex ? 'done' : '';
            const reachable = index < stepIndex;
            return (
              <li key={entry} className={state}>
                {reachable ? (
                  <button type="button" onClick={() => void goTo(entry)}>
                    <small>{stepLabels[entry]}</small>
                    <b>{stepValues[entry]}</b>
                  </button>
                ) : (
                  <span aria-current={index === stepIndex ? 'step' : undefined}>
                    <small>{stepLabels[entry]}</small>
                    <b>{index === stepIndex ? stepLabels[entry] : stepValues[entry]}</b>
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* Availability changes and selections are announced; without this a
            screen-reader user hears nothing when the list under them changes. */}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        {error ? (
          <div className="notice error" role="alert">
            <div>
              <b>{error.message}</b>
              {error.code === 'table_unavailable' ? (
                <span>{dictionary.errors.tableUnavailableBody}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {hold && step !== 'review' ? (
          <div className={`hold-bar${countdown.urgent ? ' urgent' : ''}`}>
            <span>{interpolate(t.holdCountdown, { time: '' })}</span>
            <span className="time" role="timer" aria-live="off">
              {countdown.formatted}
            </span>
          </div>
        ) : null}

        {/* ---- party size ---- */}
        {step === 'party' ? (
          <section className="panel" aria-labelledby="step-party">
            <h2 id="step-party">{t.partyHeading}</h2>
            <div className="choices">
              {Array.from({ length: maxPartySize }, (_, index) => index + 1).map((size) => (
                <button
                  key={size}
                  type="button"
                  className="choice"
                  aria-pressed={partySize === size}
                  onClick={() => void choosePartySize(size)}
                >
                  <b>{size}</b>
                  <small>{pluralPeople(size, dictionary)}</small>
                </button>
              ))}
            </div>
            <div className="notice" style={{ marginTop: '1.4rem' }}>
              <div>
                <b>{interpolate(t.partyLarge, { max: maxPartySize })}</b>
                <span>
                  {interpolate(t.partyLargeBody, { max: maxPartySize })}{' '}
                  <a href={TEL_HREF}>{SITE.phoneDisplay}</a>
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {/* ---- date ---- */}
        {step === 'date' ? (
          <section className="panel" aria-labelledby="step-date">
            <h2 id="step-date">{t.dateHeading}</h2>
            <div className="choices wide">
              {dates.map((entry, index) => (
                <button
                  key={entry}
                  type="button"
                  className="choice"
                  aria-pressed={date === entry}
                  onClick={() => chooseDate(entry)}
                >
                  <b>
                    {index === 0
                      ? t.dateToday
                      : index === 1
                        ? t.dateTomorrow
                        : formatLocalDate(new Date(`${entry}T12:00:00Z`), locale, {
                            day: 'numeric',
                            month: 'short',
                          })}
                  </b>
                  <small>
                    {formatLocalDate(new Date(`${entry}T12:00:00Z`), locale, { weekday: 'short' })}
                  </small>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* ---- time ---- */}
        {step === 'time' ? (
          <section className="panel" aria-labelledby="step-time">
            <h2 id="step-time">{t.timeHeading}</h2>
            {loading ? <p className="hint">{dictionary.common.loading}</p> : null}

            {!loading && availability?.state === 'closed_that_day' ? (
              <div className="notice warn">
                <div>
                  <b>{t.closedThatDay}</b>
                  {availability.closureReason ? <span>{availability.closureReason}</span> : null}
                </div>
              </div>
            ) : null}

            {!loading &&
            availability &&
            availability.slots.length === 0 &&
            availability.state !== 'closed_that_day' ? (
              <div className="notice warn">
                <div>
                  <b>{t.timeNone}</b>
                  <span>{t.timeNoneHint}</span>
                </div>
              </div>
            ) : null}

            <div className="choices">
              {availability?.slots.map((slot) => (
                <button
                  key={slot.startsAt}
                  type="button"
                  className="choice"
                  aria-pressed={time === slot.time}
                  onClick={() => chooseTime(slot.time)}
                >
                  <b>{slot.time}</b>
                </button>
              ))}
            </div>

            <div className="actions">
              <button type="button" className="btn outline" onClick={() => void goTo('date')}>
                <span>{t.back}</span>
              </button>
            </div>
          </section>
        ) : null}

        {/* ---- table ---- */}
        {step === 'table' ? (
          <section className="panel" aria-labelledby="step-table">
            <h2 id="step-table">{t.tableHeading}</h2>
            <p className="hint">{t.planHint}</p>

            {availability && availability.state === 'no_table_for_party' ? (
              <div className="notice warn">
                <div>
                  <b>{dictionary.errors.capacityMismatch}</b>
                  <span>{t.timeNoneHint}</span>
                </div>
              </div>
            ) : null}

            <FloorPlan
              areas={availability?.areas ?? []}
              tables={availability?.tables ?? []}
              selectedTableId={hold?.tableId ?? null}
              onSelect={(table) => void selectTable(table)}
              disabled={disable3D}
            />

            <TableList
              tables={availability?.tables ?? []}
              areas={availability?.areas ?? []}
              selectedTableId={hold?.tableId ?? null}
              onSelect={(table) => void selectTable(table)}
              busyTableId={holdingTableId}
            />

            <div className="actions">
              <button type="button" className="btn outline" onClick={() => void goTo('time')}>
                <span>{t.back}</span>
              </button>
            </div>
          </section>
        ) : null}

        {/* ---- details ---- */}
        {step === 'details' ? (
          <section className="panel" aria-labelledby="step-details">
            <h2 id="step-details">{t.detailsHeading}</h2>
            <GuestForm
              defaultValues={guest}
              smsEnabled={smsEnabled}
              onBack={() => void goTo('table')}
              onSubmit={(values) => {
                setGuest(values);
                setStep('review');
              }}
            />
          </section>
        ) : null}

        {/* ---- review ---- */}
        {step === 'review' && guest ? (
          <section className="panel" aria-labelledby="step-review">
            <h2 id="step-review">{t.reviewHeading}</h2>

            {hold ? (
              <div className={`hold-bar${countdown.urgent ? ' urgent' : ''}`}>
                <span>{interpolate(t.holdCountdown, { time: '' })}</span>
                <span className="time" role="timer">
                  {countdown.formatted}
                </span>
              </div>
            ) : null}

            <ul className="summary">
              <li>
                <span className="label">{t.steps.date}</span>
                <span className="value">
                  {formatLocalDate(new Date(`${date}T12:00:00Z`), locale)} · {time}
                </span>
              </li>
              <li>
                <span className="label">{t.steps.party}</span>
                <span className="value">
                  {partySize} {partySize ? pluralPeople(partySize, dictionary) : ''}
                </span>
              </li>
              <li>
                <span className="label">{t.steps.table}</span>
                <span className="value">
                  {hold?.tableCode}
                  {selectedArea ? ` · ${localized(selectedArea.name, locale)}` : ''}
                </span>
              </li>
              <li>
                <span className="label">{t.steps.details}</span>
                <span className="value">
                  {guest.firstName} {guest.lastName}
                  <br />
                  {guest.phone}
                  {guest.email ? (
                    <>
                      <br />
                      {guest.email}
                    </>
                  ) : null}
                </span>
              </li>
              {guest.specialRequests ? (
                <li>
                  <span className="label">{t.specialRequests}</span>
                  <span className="value">{guest.specialRequests}</span>
                </li>
              ) : null}
            </ul>

            <div className="actions">
              <button
                type="button"
                className="btn light"
                disabled={submitting || !hold}
                onClick={() => void confirm()}
              >
                <span>{submitting ? t.confirming : t.confirm}</span>
              </button>
              <button
                type="button"
                className="btn outline"
                disabled={submitting}
                onClick={() => void goTo('details')}
              >
                <span>{t.reviewEdit}</span>
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="book-aside">
        <div className="panel">
          <h2>{dictionary.location.reservationsLabel}</h2>
          <p className="hint">{t.phoneAlternative}</p>
          <p style={{ margin: 0 }}>
            <a className="btn outline" href={TEL_HREF} style={{ width: '100%' }}>
              <span>{SITE.phoneDisplay}</span>
            </a>
          </p>
          <ul className="summary" style={{ marginTop: '1.2rem' }}>
            <li>
              <span className="label">{dictionary.confirmation.address}</span>
              <span className="value">
                {SITE.addressLine}
                <br />
                {SITE.postalCode} {SITE.city}
              </span>
            </li>
            {availability?.openingHours.length ? (
              <li>
                <span className="label">{dictionary.location.hoursLabel}</span>
                <span className="value">
                  {availability.openingHours
                    .map((window) => `${window.start} – ${window.end}`)
                    .join(', ')}
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      </aside>
    </div>
  );
}
