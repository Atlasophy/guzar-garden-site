'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, apiPatch } from '@/lib/api/client';
import type {
  BusinessHoursRow,
  DiningAreaRow,
  ReservationSettingsRow,
  RestaurantTableRow,
} from '@/lib/database/types';
import { useLocale } from '@/components/shared/locale-provider';
import { localized, pickLocaleColumns } from '@/lib/i18n/fallback';
import { formatStaffMessage } from '@/lib/i18n/staff';
import { useStaffDictionary } from './use-staff-dictionary';

const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export function SettingsAdmin({
  settings,
  hours,
  tables,
  areas,
  canPolicy,
  canHours,
  canTables,
}: {
  settings: ReservationSettingsRow;
  hours: BusinessHoursRow[];
  tables: RestaurantTableRow[];
  areas: DiningAreaRow[];
  canPolicy: boolean;
  canHours: boolean;
  canTables: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const dictionary = useStaffDictionary();
  const days = DAY_KEYS.map((key) => dictionary[key]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const savePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const body = {
      slotIntervalMinutes: Number(f.get('slot')),
      defaultDurationMinutes: Number(f.get('duration')),
      turnaroundMinutes: Number(f.get('turnaround')),
      minNoticeMinutes: Number(f.get('notice')),
      bookingHorizonDays: Number(f.get('horizon')),
      maxOnlinePartySize: Number(f.get('party')),
      holdDurationSeconds: Number(f.get('hold')),
      cancellationCutoffMinutes: Number(f.get('cancel')),
      cancellationPolicyPl: String(f.get('policyPl') ?? ''),
      cancellationPolicyEn: String(f.get('policyEn') ?? ''),
      cancellationPolicyRu: String(f.get('policyRu') ?? ''),
      cancellationPolicyUz: String(f.get('policyUz') ?? ''),
    };
    const r = await apiPatch('/api/staff/settings', body);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setMessage(dictionary.rulesSaved);
    router.refresh();
  };
  const saveHours = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const rows = days.map((_, weekday) => ({
      weekday,
      opensAt: String(f.get(`open-${weekday}`)),
      closesAt: String(f.get(`close-${weekday}`)),
      closesNextDay: String(f.get(`close-${weekday}`)) <= String(f.get(`open-${weekday}`)),
      isActive: f.get(`active-${weekday}`) === 'on',
    }));
    const r = await apiFetch('/api/staff/hours', {
      method: 'PUT',
      body: JSON.stringify({ hours: rows }),
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setMessage(dictionary.hoursSaved);
    router.refresh();
  };
  const saveTable = async (e: React.FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const body = {
      diningAreaId: String(f.get('area')),
      code: String(f.get('code')),
      minCapacity: Number(f.get('min')),
      maxCapacity: Number(f.get('max')),
      shape: String(f.get('shape')),
      widthM: Number(f.get('width')),
      depthM: Number(f.get('depth')),
      floorX: Number(f.get('x')),
      floorZ: Number(f.get('z')),
      rotationDeg: Number(f.get('rotation')),
      isAccessible: f.get('accessible') === 'on',
      isActive: f.get('active') === 'on',
      staffNotes: String(f.get('notes') ?? ''),
      displayOrder: Number(f.get('order')),
    };
    const r = await apiPatch(`/api/staff/tables/${id}`, body);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setMessage(formatStaffMessage(dictionary.tableSaved, { code: body.code }));
    router.refresh();
  };
  const hourFor = (day: number) => hours.find((h) => h.weekday === day);
  return (
    <>
      {message ? <div className="staff-notice ok">{message}</div> : null}
      {error ? <div className="staff-notice error">{error}</div> : null}
      <section className="staff-card">
        <h2>{dictionary.reservationRules}</h2>
        <form onSubmit={(e) => void savePolicy(e)}>
          <div className="staff-field-row">
            <label className="staff-field">
              <span>{dictionary.slotInterval}</span>
              <input
                name="slot"
                type="number"
                min="5"
                defaultValue={settings.slot_interval_minutes}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>{dictionary.visitDuration}</span>
              <input
                name="duration"
                type="number"
                min="15"
                defaultValue={settings.default_duration_minutes}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>{dictionary.turnaround}</span>
              <input
                name="turnaround"
                type="number"
                min="0"
                defaultValue={settings.turnaround_minutes}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>{dictionary.minimumNotice}</span>
              <input
                name="notice"
                type="number"
                min="0"
                defaultValue={settings.min_notice_minutes}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>{dictionary.bookingHorizon}</span>
              <input
                name="horizon"
                type="number"
                min="1"
                defaultValue={settings.booking_horizon_days}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>{dictionary.maxOnlineParty}</span>
              <input
                name="party"
                type="number"
                min="1"
                defaultValue={settings.max_online_party_size}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>{dictionary.tableHold}</span>
              <input
                name="hold"
                type="number"
                min="60"
                defaultValue={settings.hold_duration_seconds}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>{dictionary.cancellationLimit}</span>
              <input
                name="cancel"
                type="number"
                min="0"
                defaultValue={settings.cancellation_cutoff_minutes}
                disabled={!canPolicy}
              />
            </label>
          </div>
          <label className="staff-field">
            <span>{formatStaffMessage(dictionary.cancellationPolicy, { language: 'PL' })}</span>
            <textarea
              name="policyPl"
              maxLength={1000}
              defaultValue={settings.cancellation_policy_pl}
              disabled={!canPolicy}
            />
          </label>
          <label className="staff-field">
            <span>{formatStaffMessage(dictionary.cancellationPolicy, { language: 'EN' })}</span>
            <textarea
              name="policyEn"
              maxLength={1000}
              defaultValue={settings.cancellation_policy_en}
              disabled={!canPolicy}
            />
          </label>
          <label className="staff-field">
            <span>{formatStaffMessage(dictionary.cancellationPolicy, { language: 'RU' })}</span>
            <textarea
              name="policyRu"
              maxLength={1000}
              defaultValue={settings.cancellation_policy_ru}
              disabled={!canPolicy}
            />
          </label>
          <label className="staff-field">
            <span>{formatStaffMessage(dictionary.cancellationPolicy, { language: 'UZ' })}</span>
            <textarea
              name="policyUz"
              maxLength={1000}
              defaultValue={settings.cancellation_policy_uz}
              disabled={!canPolicy}
            />
          </label>
          {canPolicy ? (
            <button className="staff-button" disabled={busy}>
              {dictionary.saveRules}
            </button>
          ) : null}
        </form>
      </section>
      <section className="staff-card" style={{ marginTop: '1rem' }}>
        <h2>{dictionary.openingHours}</h2>
        <form onSubmit={(e) => void saveHours(e)}>
          {days.map((day, i) => {
            const row = hourFor(i);
            return (
              <div className="staff-field-row" key={day}>
                <label className="staff-check">
                  <input
                    type="checkbox"
                    name={`active-${i}`}
                    defaultChecked={row?.is_active ?? true}
                    disabled={!canHours}
                  />
                  {day}
                </label>
                <div className="staff-field-row">
                  <label className="staff-field">
                    <span>{dictionary.from}</span>
                    <input
                      type="time"
                      name={`open-${i}`}
                      defaultValue={row?.opens_at.slice(0, 5) ?? '09:00'}
                      disabled={!canHours}
                    />
                  </label>
                  <label className="staff-field">
                    <span>{dictionary.to}</span>
                    <input
                      type="time"
                      name={`close-${i}`}
                      defaultValue={row?.closes_at.slice(0, 5) ?? '00:00'}
                      disabled={!canHours}
                    />
                  </label>
                </div>
              </div>
            );
          })}
          {canHours ? (
            <button className="staff-button" disabled={busy}>
              {dictionary.saveHours}
            </button>
          ) : null}
        </form>
      </section>
      <section style={{ marginTop: '1rem' }}>
        <h2>{dictionary.tablesAndPositions}</h2>
        {tables.map((table) => (
          <form
            className="staff-card"
            style={{ marginBottom: '.75rem' }}
            key={table.id}
            onSubmit={(e) => void saveTable(e, table.id)}
          >
            <div className="staff-field-row">
              <label className="staff-field">
                <span>{dictionary.code}</span>
                <input name="code" defaultValue={table.code} disabled={!canTables} />
              </label>
              <label className="staff-field">
                <span>{dictionary.area}</span>
                <select name="area" defaultValue={table.dining_area_id} disabled={!canTables}>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {localized(pickLocaleColumns(a, 'name'), locale)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="staff-field-row">
              <label className="staff-field">
                <span>{dictionary.minPeople}</span>
                <input
                  name="min"
                  type="number"
                  defaultValue={table.min_capacity}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>{dictionary.maxPeople}</span>
                <input
                  name="max"
                  type="number"
                  defaultValue={table.max_capacity}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>{dictionary.shape}</span>
                <select name="shape" defaultValue={table.shape} disabled={!canTables}>
                  <option value="round">{dictionary.round}</option>
                  <option value="square">{dictionary.square}</option>
                  <option value="rectangle">{dictionary.rectangle}</option>
                  <option value="booth">{dictionary.booth}</option>
                </select>
              </label>
              <label className="staff-field">
                <span>{dictionary.width}</span>
                <input
                  name="width"
                  type="number"
                  step=".1"
                  defaultValue={table.width_m}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>{dictionary.depth}</span>
                <input
                  name="depth"
                  type="number"
                  step=".1"
                  defaultValue={table.depth_m}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>X</span>
                <input
                  name="x"
                  type="number"
                  step=".1"
                  defaultValue={table.floor_x}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>Z</span>
                <input
                  name="z"
                  type="number"
                  step=".1"
                  defaultValue={table.floor_z}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>{dictionary.rotation}</span>
                <input
                  name="rotation"
                  type="number"
                  defaultValue={table.rotation_deg}
                  disabled={!canTables}
                />
              </label>
              <input type="hidden" name="order" value={table.display_order} />
            </div>
            <label className="staff-field">
              <span>{dictionary.notes}</span>
              <input name="notes" defaultValue={table.staff_notes ?? ''} disabled={!canTables} />
            </label>
            <label className="staff-check">
              <input
                name="active"
                type="checkbox"
                defaultChecked={table.is_active}
                disabled={!canTables}
              />{' '}
              {dictionary.active}
            </label>
            <label className="staff-check">
              <input
                name="accessible"
                type="checkbox"
                defaultChecked={table.is_accessible}
                disabled={!canTables}
              />{' '}
              {dictionary.accessible}
            </label>
            {canTables ? (
              <button className="staff-button" disabled={busy}>
                {dictionary.saveTable}
              </button>
            ) : null}
          </form>
        ))}
      </section>
    </>
  );
}
