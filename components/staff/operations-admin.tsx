'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiDelete, apiFetch, apiPost } from '@/lib/api/client';
import type {
  DiningAreaRow,
  RestaurantTableRow,
  ServiceExceptionRow,
  TableAllocationRow,
} from '@/lib/database/types';

interface Props {
  tables: RestaurantTableRow[];
  areas: DiningAreaRow[];
  blocks: TableAllocationRow[];
  exceptions: ServiceExceptionRow[];
  today: string;
  canBlocks: boolean;
  canHours: boolean;
}

export function OperationsAdmin({
  tables,
  areas,
  blocks,
  exceptions,
  today,
  canBlocks,
  canHours,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(true);
    setError('');
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'Nie udało się zapisać zmiany.');
      return;
    }
    router.refresh();
  };

  const createBlock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    return run(() =>
      apiPost('/api/staff/blocks', {
        tableId: String(form.get('tableId')),
        date: String(form.get('date')),
        startTime: String(form.get('startTime')),
        endTime: String(form.get('endTime')),
        endsNextDay: form.get('endsNextDay') === 'on',
        reason: String(form.get('reason')),
      }),
    );
  };

  const createException = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kind = String(form.get('kind'));
    const area = String(form.get('diningAreaId') ?? '');
    return run(() =>
      apiPost('/api/staff/exceptions', {
        kind,
        ...(area ? { diningAreaId: area } : {}),
        startDate: String(form.get('startDate')),
        startTime: String(form.get('startTime')),
        endDate: String(form.get('endDate')),
        endTime: String(form.get('endTime')),
        replacementOpensAt:
          kind === 'modified_hours' ? String(form.get('replacementOpensAt')) : undefined,
        replacementClosesAt:
          kind === 'modified_hours' ? String(form.get('replacementClosesAt')) : undefined,
        replacementClosesNextDay: form.get('replacementClosesNextDay') === 'on',
        reason: String(form.get('reason')),
        isPublic: form.get('isPublic') === 'on',
      }),
    );
  };

  const tableCode = (id: string) => tables.find((table) => table.id === id)?.code ?? '—';
  const areaName = (id: string | null) =>
    areas.find((area) => area.id === id)?.name_pl ?? 'Cały lokal';

  return (
    <>
      {error ? <div className="staff-notice error">{error}</div> : null}

      <section className="staff-card" style={{ marginTop: '1rem' }}>
        <h2>Blokady stolików</h2>
        <p>Wyłącz stolik z rezerwacji na czas naprawy, przygotowania sali lub wydarzenia.</p>
        {canBlocks ? (
          <form onSubmit={(event) => void createBlock(event)}>
            <div className="staff-field-row">
              <label className="staff-field">
                <span>Stolik</span>
                <select name="tableId" required>
                  {tables
                    .filter((table) => table.is_active)
                    .map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.code}
                      </option>
                    ))}
                </select>
              </label>
              <label className="staff-field">
                <span>Data</span>
                <input name="date" type="date" defaultValue={today} required />
              </label>
              <label className="staff-field">
                <span>Od</span>
                <input name="startTime" type="time" defaultValue="09:00" required />
              </label>
              <label className="staff-field">
                <span>Do</span>
                <input name="endTime" type="time" defaultValue="10:00" required />
              </label>
            </div>
            <label className="staff-check">
              <input name="endsNextDay" type="checkbox" /> Kończy się następnego dnia
            </label>
            <label className="staff-field">
              <span>Powód</span>
              <input name="reason" required minLength={2} />
            </label>
            <button className="staff-button" disabled={busy}>
              Dodaj blokadę
            </button>
          </form>
        ) : null}
        <div className="staff-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="staff-table">
            <thead>
              <tr>
                <th>Stolik</th>
                <th>Od</th>
                <th>Do</th>
                <th>Powód</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.id}>
                  <td>{tableCode(block.table_id)}</td>
                  <td>{new Date(block.starts_at).toLocaleString('pl-PL')}</td>
                  <td>{new Date(block.ends_at).toLocaleString('pl-PL')}</td>
                  <td>{block.block_reason}</td>
                  <td>
                    {canBlocks ? (
                      <button
                        className="staff-button danger"
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => apiDelete(`/api/staff/blocks/${block.id}`))}
                      >
                        Usuń
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="staff-card" style={{ marginTop: '1rem' }}>
        <h2>Wyjątki i zamknięcia</h2>
        {canHours ? (
          <form onSubmit={(event) => void createException(event)}>
            <div className="staff-field-row">
              <label className="staff-field">
                <span>Rodzaj</span>
                <select name="kind">
                  <option value="closure">Lokal zamknięty</option>
                  <option value="modified_hours">Zmienione godziny</option>
                  <option value="private_event">Wydarzenie prywatne</option>
                  <option value="area_closed">Obszar zamknięty</option>
                </select>
              </label>
              <label className="staff-field">
                <span>Obszar (opcjonalnie)</span>
                <select name="diningAreaId">
                  <option value="">Cały lokal</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name_pl}
                    </option>
                  ))}
                </select>
              </label>
              <label className="staff-field">
                <span>Data od</span>
                <input name="startDate" type="date" defaultValue={today} required />
              </label>
              <label className="staff-field">
                <span>Godzina od</span>
                <input name="startTime" type="time" defaultValue="00:00" required />
              </label>
              <label className="staff-field">
                <span>Data do</span>
                <input name="endDate" type="date" defaultValue={today} required />
              </label>
              <label className="staff-field">
                <span>Godzina do</span>
                <input name="endTime" type="time" defaultValue="00:00" required />
              </label>
              <label className="staff-field">
                <span>Otwarcie zastępcze</span>
                <input name="replacementOpensAt" type="time" defaultValue="12:00" />
              </label>
              <label className="staff-field">
                <span>Zamknięcie zastępcze</span>
                <input name="replacementClosesAt" type="time" defaultValue="22:00" />
              </label>
            </div>
            <label className="staff-check">
              <input name="replacementClosesNextDay" type="checkbox" /> Zamknięcie zastępcze
              następnego dnia
            </label>
            <label className="staff-field">
              <span>Powód</span>
              <input name="reason" required minLength={2} />
            </label>
            <label className="staff-check">
              <input name="isPublic" type="checkbox" defaultChecked /> Powód może być pokazany
              gościom
            </label>
            <button className="staff-button" disabled={busy}>
              Dodaj wyjątek
            </button>
          </form>
        ) : null}
        <div className="staff-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="staff-table">
            <thead>
              <tr>
                <th>Rodzaj</th>
                <th>Zakres</th>
                <th>Obszar</th>
                <th>Powód</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {exceptions.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.kind}</td>
                  <td>
                    {new Date(entry.starts_at).toLocaleString('pl-PL')} –{' '}
                    {new Date(entry.ends_at).toLocaleString('pl-PL')}
                  </td>
                  <td>{areaName(entry.dining_area_id)}</td>
                  <td>{entry.reason}</td>
                  <td>
                    {canHours ? (
                      <button
                        className="staff-button danger"
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            apiFetch(`/api/staff/exceptions?id=${entry.id}`, { method: 'DELETE' }),
                          )
                        }
                      >
                        Usuń
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
