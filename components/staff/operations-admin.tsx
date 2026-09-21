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
import { useLocale } from '@/components/shared/locale-provider';
import { localized, pickLocaleColumns } from '@/lib/i18n/fallback';
import { useStaffDictionary } from './use-staff-dictionary';

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
  const { locale } = useLocale();
  const dictionary = useStaffDictionary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setBusy(true);
    setError('');
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? dictionary.saveFailed);
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
    (() => {
      const area = areas.find((candidate) => candidate.id === id);
      return area ? localized(pickLocaleColumns(area, 'name'), locale) : dictionary.wholeVenue;
    })();
  const kindName = (kind: string) => {
    const names: Record<string, string> = {
      closure: dictionary.venueClosed,
      modified_hours: dictionary.modifiedHours,
      private_event: dictionary.privateEvent,
      area_closed: dictionary.areaClosed,
    };
    return names[kind] ?? kind;
  };

  return (
    <>
      {error ? <div className="staff-notice error">{error}</div> : null}

      <section className="staff-card" style={{ marginTop: '1rem' }}>
        <h2>{dictionary.tableBlocks}</h2>
        <p>{dictionary.tableBlocksHelp}</p>
        {canBlocks ? (
          <form onSubmit={(event) => void createBlock(event)}>
            <div className="staff-field-row">
              <label className="staff-field">
                <span>{dictionary.table}</span>
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
                <span>{dictionary.date}</span>
                <input name="date" type="date" defaultValue={today} required />
              </label>
              <label className="staff-field">
                <span>{dictionary.from}</span>
                <input name="startTime" type="time" defaultValue="09:00" required />
              </label>
              <label className="staff-field">
                <span>{dictionary.to}</span>
                <input name="endTime" type="time" defaultValue="10:00" required />
              </label>
            </div>
            <label className="staff-check">
              <input name="endsNextDay" type="checkbox" /> {dictionary.endsNextDay}
            </label>
            <label className="staff-field">
              <span>{dictionary.reason}</span>
              <input name="reason" required minLength={2} />
            </label>
            <button className="staff-button" disabled={busy}>
              {dictionary.addBlock}
            </button>
          </form>
        ) : null}
        <div className="staff-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="staff-table">
            <thead>
              <tr>
                <th>{dictionary.table}</th>
                <th>{dictionary.from}</th>
                <th>{dictionary.to}</th>
                <th>{dictionary.reason}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => (
                <tr key={block.id}>
                  <td>{tableCode(block.table_id)}</td>
                  <td>{new Date(block.starts_at).toLocaleString(locale)}</td>
                  <td>{new Date(block.ends_at).toLocaleString(locale)}</td>
                  <td>{block.block_reason}</td>
                  <td>
                    {canBlocks ? (
                      <button
                        className="staff-button danger"
                        type="button"
                        disabled={busy}
                        onClick={() => void run(() => apiDelete(`/api/staff/blocks/${block.id}`))}
                      >
                        {dictionary.delete}
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
        <h2>{dictionary.exceptions}</h2>
        {canHours ? (
          <form onSubmit={(event) => void createException(event)}>
            <div className="staff-field-row">
              <label className="staff-field">
                <span>{dictionary.kind}</span>
                <select name="kind">
                  <option value="closure">{dictionary.venueClosed}</option>
                  <option value="modified_hours">{dictionary.modifiedHours}</option>
                  <option value="private_event">{dictionary.privateEvent}</option>
                  <option value="area_closed">{dictionary.areaClosed}</option>
                </select>
              </label>
              <label className="staff-field">
                <span>{dictionary.optionalArea}</span>
                <select name="diningAreaId">
                  <option value="">{dictionary.wholeVenue}</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {localized(pickLocaleColumns(area, 'name'), locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="staff-field">
                <span>{dictionary.startDate}</span>
                <input name="startDate" type="date" defaultValue={today} required />
              </label>
              <label className="staff-field">
                <span>{dictionary.startTime}</span>
                <input name="startTime" type="time" defaultValue="00:00" required />
              </label>
              <label className="staff-field">
                <span>{dictionary.endDate}</span>
                <input name="endDate" type="date" defaultValue={today} required />
              </label>
              <label className="staff-field">
                <span>{dictionary.endTime}</span>
                <input name="endTime" type="time" defaultValue="00:00" required />
              </label>
              <label className="staff-field">
                <span>{dictionary.replacementOpening}</span>
                <input name="replacementOpensAt" type="time" defaultValue="12:00" />
              </label>
              <label className="staff-field">
                <span>{dictionary.replacementClosing}</span>
                <input name="replacementClosesAt" type="time" defaultValue="22:00" />
              </label>
            </div>
            <label className="staff-check">
              <input name="replacementClosesNextDay" type="checkbox" />{' '}
              {dictionary.replacementClosesNextDay}
            </label>
            <label className="staff-field">
              <span>{dictionary.reason}</span>
              <input name="reason" required minLength={2} />
            </label>
            <label className="staff-check">
              <input name="isPublic" type="checkbox" defaultChecked /> {dictionary.publicReason}
            </label>
            <button className="staff-button" disabled={busy}>
              {dictionary.addException}
            </button>
          </form>
        ) : null}
        <div className="staff-table-wrap" style={{ marginTop: '1rem' }}>
          <table className="staff-table">
            <thead>
              <tr>
                <th>{dictionary.kind}</th>
                <th>{dictionary.range}</th>
                <th>{dictionary.area}</th>
                <th>{dictionary.reason}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {exceptions.map((entry) => (
                <tr key={entry.id}>
                  <td>{kindName(entry.kind)}</td>
                  <td>
                    {new Date(entry.starts_at).toLocaleString(locale)} –{' '}
                    {new Date(entry.ends_at).toLocaleString(locale)}
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
                        {dictionary.delete}
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
