'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPatch } from '@/lib/api/client';
import type { MenuCategoryRow, MenuItemRow } from '@/lib/database/types';

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
          <h1>Menu</h1>
          <p>
            {items.length} pozycji · {categories.length} kategorii
          </p>
        </div>
        <div className="staff-actions">
          {canEdit ? (
            <Link className="staff-button" href="/staff/menu/items/new">
              Dodaj danie
            </Link>
          ) : null}
          <Link className="staff-button secondary" href="/staff/menu/categories">
            Kategorie
          </Link>
        </div>
      </header>
      <label className="staff-field">
        <span>Szukaj</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nazwa lub slug"
        />
      </label>
      <div className="staff-table-wrap">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Danie</th>
              <th>Kategoria</th>
              <th>Cena</th>
              <th>Publikacja</th>
              <th>Dostępność</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name_pl}</strong>
                  <br />
                  <small>
                    {item.slug}
                    {item.archived_at ? ' · archiwum' : ''}
                  </small>
                </td>
                <td>{categoryById.get(item.category_id)?.name_pl ?? '—'}</td>
                <td>{item.price ? `${item.price} ${item.currency}` : '—'}</td>
                <td>
                  <span className={`badge ${item.is_published ? 'confirmed' : 'cancelled'}`}>
                    {item.is_published ? 'publiczne' : 'ukryte'}
                  </span>
                </td>
                <td>
                  <button
                    className="staff-button secondary"
                    disabled={busy === item.id}
                    onClick={() => void update(item.id, { isAvailable: !item.is_available })}
                  >
                    {item.is_available ? 'Dostępne' : 'Wyprzedane'}
                  </button>
                </td>
                <td>
                  {canEdit ? <Link href={`/staff/menu/items/${item.id}`}>Edytuj</Link> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length ? <p className="staff-empty">Brak wyników.</p> : null}
      </div>
    </>
  );
}
