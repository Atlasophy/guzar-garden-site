'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '@/lib/api/client';
import type { MenuCategoryRow, MenuItemRow } from '@/lib/database/types';
import { formatStaffMessage } from '@/lib/i18n/staff';
import { localized, pickLocaleColumns } from '@/lib/i18n/fallback';
import { useLocale } from '@/components/shared/locale-provider';
import { useStaffDictionary } from './use-staff-dictionary';

export function MenuAdmin({
  items,
  categories,
  canEdit,
}: {
  items: MenuItemRow[];
  categories: MenuCategoryRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const dictionary = useStaffDictionary();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('pl');
    return q
      ? items.filter((i) => `${i.name_pl} ${i.slug}`.toLocaleLowerCase('pl').includes(q))
      : items;
  }, [items, query]);
  const update = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    const r = await apiPatch(`/api/staff/menu/items/${id}`, body);
    setBusy(null);
    if (!r.ok) {
      alert(r.message);
      return;
    }
    router.refresh();
  };
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>{dictionary.menu}</h1>
          <p>
            {formatStaffMessage(dictionary.menuSummary, {
              items: items.length,
              categories: categories.length,
            })}
          </p>
        </div>
        <div className="staff-actions">
          {canEdit ? (
            <Link className="staff-button" href="/staff/menu/items/new">
              {dictionary.addDish}
            </Link>
          ) : null}
          <Link className="staff-button secondary" href="/staff/menu/categories">
            {dictionary.categories}
          </Link>
        </div>
      </header>
      <label className="staff-field">
        <span>{dictionary.search}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dictionary.searchPlaceholder}
        />
      </label>
      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead>
            <tr>
              <th>{dictionary.dish}</th>
              <th>{dictionary.category}</th>
              <th>{dictionary.price}</th>
              <th>{dictionary.publication}</th>
              <th>{dictionary.availability}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{localized(pickLocaleColumns(item, 'name'), locale)}</strong>
                  <br />
                  <small>
                    {item.slug}
                    {item.archived_at ? ` · ${dictionary.archived}` : ''}
                  </small>
                </td>
                <td>
                  {categoryById.has(item.category_id)
                    ? localized(
                        pickLocaleColumns(categoryById.get(item.category_id)!, 'name'),
                        locale,
                      )
                    : '—'}
                </td>
                <td>{item.price ? `${item.price} ${item.currency}` : '—'}</td>
                <td>
                  <span className={`badge ${item.is_published ? 'confirmed' : 'cancelled'}`}>
                    {item.is_published ? dictionary.public : dictionary.hidden}
                  </span>
                </td>
                <td>
                  <button
                    className="staff-button secondary"
                    disabled={busy === item.id}
                    onClick={() => void update(item.id, { isAvailable: !item.is_available })}
                  >
                    {item.is_available ? dictionary.available : dictionary.soldOut}
                  </button>
                </td>
                <td>
                  {canEdit ? (
                    <Link href={`/staff/menu/items/${item.id}`}>{dictionary.edit}</Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length ? <p className="staff-empty">{dictionary.noResults}</p> : null}
      </div>
    </>
  );
}
