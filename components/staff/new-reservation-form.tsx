'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api/client';
import type { RestaurantTableRow } from '@/lib/database/types';
import { toLocalDateString, toLocalTimeString } from '@/lib/time/warsaw';
import { useLocale } from '@/components/shared/locale-provider';
import { useStaffDictionary } from './use-staff-dictionary';
export function NewReservationForm({ tables }: { tables: RestaurantTableRow[] }) {
  const router = useRouter();
  const { locale } = useLocale();
  const dictionary = useStaffDictionary();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const body = {
      tableId: String(f.get('tableId')),
      date: String(f.get('date')),
      time: String(f.get('time')),
      partySize: Number(f.get('partySize')),
      firstName: String(f.get('firstName')),
      lastName: String(f.get('lastName')),
      email: String(f.get('email') ?? ''),
      phone: String(f.get('phone')),
      locale,
      specialRequests: String(f.get('specialRequests') ?? ''),
      source: String(f.get('source')),
      seatImmediately: f.get('seatImmediately') === 'on',
      privacyAccepted: true,
      marketingConsent: false,
      notify: f.get('notify') === 'on',
      idempotencyKey: crypto.randomUUID().replaceAll('-', ''),
    };
    const r = await apiPost<{ reservationId: string }>('/api/staff/reservations', body);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    router.push(`/staff/reservations/${r.data.reservationId}`);
    router.refresh();
  };
  return (
    <form className="staff-card" onSubmit={(e) => void submit(e)}>
      {error ? <div className="staff-notice error">{error}</div> : null}
      <div className="staff-field-row">
        <label className="staff-field">
          <span>{dictionary.source}</span>
          <select name="source">
            <option value="phone">{dictionary.sourcePhone}</option>
            <option value="walk_in">{dictionary.sourceWalkIn}</option>
            <option value="staff">{dictionary.sourceStaff}</option>
          </select>
        </label>
        <label className="staff-field">
          <span>{dictionary.table}</span>
          <select name="tableId" required>
            {tables
              .filter((t) => t.is_active)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} · {t.min_capacity}–{t.max_capacity} {dictionary.people.toLowerCase()}
                </option>
              ))}
          </select>
        </label>
        <label className="staff-field">
          <span>{dictionary.date}</span>
          <input type="date" name="date" required defaultValue={toLocalDateString(now)} />
        </label>
        <label className="staff-field">
          <span>{dictionary.time}</span>
          <input
            type="time"
            step="900"
            name="time"
            required
            defaultValue={toLocalTimeString(now)}
          />
        </label>
        <label className="staff-field">
          <span>{dictionary.partySize}</span>
          <input type="number" min="1" name="partySize" required defaultValue="2" />
        </label>
      </div>
      <div className="staff-field-row">
        <label className="staff-field">
          <span>{dictionary.firstName}</span>
          <input name="firstName" required />
        </label>
        <label className="staff-field">
          <span>{dictionary.lastName}</span>
          <input name="lastName" />
        </label>
        <label className="staff-field">
          <span>{dictionary.phone}</span>
          <input name="phone" type="tel" required placeholder="+48 500 000 000" />
        </label>
        <label className="staff-field">
          <span>E-mail</span>
          <input name="email" type="email" />
        </label>
      </div>
      <label className="staff-field">
        <span>{dictionary.notes}</span>
        <textarea name="specialRequests" />
      </label>
      <label className="staff-check">
        <input name="notify" type="checkbox" defaultChecked /> {dictionary.sendSms}
      </label>
      <label className="staff-check">
        <input name="seatImmediately" type="checkbox" /> {dictionary.seatImmediately}
      </label>
      <button className="staff-button" disabled={busy}>
        {busy ? dictionary.saving : dictionary.createReservation}
      </button>
    </form>
  );
}
