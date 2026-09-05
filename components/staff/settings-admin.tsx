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

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
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
    setMessage('Zapisano zasady rezerwacji.');
    router.refresh();
  };
  const saveHours = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const rows = DAYS.map((_, weekday) => ({
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
    setMessage('Zapisano godziny otwarcia.');
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
    setMessage(`Zapisano stolik ${body.code}.`);
    router.refresh();
  };
  const hourFor = (day: number) => hours.find((h) => h.weekday === day);
  return (
    <>
      {message ? <div className="staff-notice ok">{message}</div> : null}
      {error ? <div className="staff-notice error">{error}</div> : null}
      <section className="staff-card">
        <h2>Zasady rezerwacji</h2>
        <form onSubmit={(e) => void savePolicy(e)}>
          <div className="staff-field-row">
            <label className="staff-field">
              <span>Interwał (min)</span>
              <input
                name="slot"
                type="number"
                min="5"
                defaultValue={settings.slot_interval_minutes}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>Czas wizyty (min)</span>
              <input
                name="duration"
                type="number"
                min="15"
                defaultValue={settings.default_duration_minutes}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>Bufor (min)</span>
              <input
                name="turnaround"
                type="number"
                min="0"
                defaultValue={settings.turnaround_minutes}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>Minimalne wyprzedzenie</span>
              <input
                name="notice"
                type="number"
                min="0"
                defaultValue={settings.min_notice_minutes}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>Horyzont dni</span>
              <input
                name="horizon"
                type="number"
                min="1"
                defaultValue={settings.booking_horizon_days}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>Maks. grupa online</span>
              <input
                name="party"
                type="number"
                min="1"
                defaultValue={settings.max_online_party_size}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>Blokada stolika (sek.)</span>
              <input
                name="hold"
                type="number"
                min="60"
                defaultValue={settings.hold_duration_seconds}
                disabled={!canPolicy}
              />
            </label>
            <label className="staff-field">
              <span>Limit anulowania (min)</span>
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
            <span>Zasady anulowania PL</span>
            <textarea
              name="policyPl"
              maxLength={1000}
              defaultValue={settings.cancellation_policy_pl}
              disabled={!canPolicy}
            />
          </label>
          <label className="staff-field">
            <span>Zasady anulowania EN</span>
            <textarea
              name="policyEn"
              maxLength={1000}
              defaultValue={settings.cancellation_policy_en}
              disabled={!canPolicy}
            />
          </label>
          <label className="staff-field">
            <span>Zasady anulowania RU</span>
            <textarea
              name="policyRu"
              maxLength={1000}
              defaultValue={settings.cancellation_policy_ru}
              disabled={!canPolicy}
            />
          </label>
          <label className="staff-field">
            <span>Zasady anulowania UZ</span>
            <textarea
              name="policyUz"
              maxLength={1000}
              defaultValue={settings.cancellation_policy_uz}
              disabled={!canPolicy}
            />
          </label>
          {canPolicy ? (
            <button className="staff-button" disabled={busy}>
              Zapisz zasady
            </button>
          ) : null}
        </form>
      </section>
      <section className="staff-card" style={{ marginTop: '1rem' }}>
        <h2>Godziny otwarcia</h2>
        <form onSubmit={(e) => void saveHours(e)}>
          {DAYS.map((day, i) => {
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
                    <span>Od</span>
                    <input
                      type="time"
                      name={`open-${i}`}
                      defaultValue={row?.opens_at.slice(0, 5) ?? '09:00'}
                      disabled={!canHours}
                    />
                  </label>
                  <label className="staff-field">
                    <span>Do</span>
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
              Zapisz godziny
            </button>
          ) : null}
        </form>
      </section>
      <section style={{ marginTop: '1rem' }}>
        <h2>Stoliki i pozycje</h2>
        {tables.map((table) => (
          <form
            className="staff-card"
            style={{ marginBottom: '.75rem' }}
            key={table.id}
            onSubmit={(e) => void saveTable(e, table.id)}
          >
            <div className="staff-field-row">
              <label className="staff-field">
                <span>Kod</span>
                <input name="code" defaultValue={table.code} disabled={!canTables} />
              </label>
              <label className="staff-field">
                <span>Obszar</span>
                <select name="area" defaultValue={table.dining_area_id} disabled={!canTables}>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name_pl}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="staff-field-row">
              <label className="staff-field">
                <span>Min. osób</span>
                <input
                  name="min"
                  type="number"
                  defaultValue={table.min_capacity}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>Maks. osób</span>
                <input
                  name="max"
                  type="number"
                  defaultValue={table.max_capacity}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>Kształt</span>
                <select name="shape" defaultValue={table.shape} disabled={!canTables}>
                  <option value="round">Okrągły</option>
                  <option value="square">Kwadratowy</option>
                  <option value="rectangle">Prostokątny</option>
                  <option value="booth">Loża</option>
                </select>
              </label>
              <label className="staff-field">
                <span>Szerokość</span>
                <input
                  name="width"
                  type="number"
                  step=".1"
                  defaultValue={table.width_m}
                  disabled={!canTables}
                />
              </label>
              <label className="staff-field">
                <span>Głębokość</span>
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
                <span>Obrót</span>
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
              <span>Notatka</span>
              <input name="notes" defaultValue={table.staff_notes ?? ''} disabled={!canTables} />
            </label>
            <label className="staff-check">
              <input
                name="active"
                type="checkbox"
                defaultChecked={table.is_active}
                disabled={!canTables}
              />{' '}
              Aktywny
            </label>
            <label className="staff-check">
              <input
                name="accessible"
                type="checkbox"
                defaultChecked={table.is_accessible}
                disabled={!canTables}
              />{' '}
              Dostępny bez barier
            </label>
            {canTables ? (
              <button className="staff-button" disabled={busy}>
                Zapisz stolik
              </button>
            ) : null}
          </form>
        ))}
      </section>
    </>
  );
}
