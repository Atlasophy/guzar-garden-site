'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import type { MenuCategoryRow } from '@/lib/database/types';
export function CategoryAdmin({ categories }: { categories: MenuCategoryRow[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      slug: String(f.get('slug') ?? ''),
      namePl: String(f.get('namePl') ?? ''),
      nameEn: '',
      nameRu: '',
      nameUz: '',
      descriptionPl: '',
      descriptionEn: '',
      descriptionRu: '',
      descriptionUz: '',
      searchAliases: '',
      isPublished: true,
      displayOrder: categories.length,
    };
    const r = await apiFetch('/api/staff/menu/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      setError(r.message);
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  };
  const toggle = async (c: MenuCategoryRow) => {
    const r = await apiFetch(`/api/staff/menu/categories/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: !c.archived_at }),
    });
    if (!r.ok) {
      setError(r.message);
      return;
    }
    router.refresh();
  };
  return (
    <>
      {error ? <div className="staff-notice error">{error}</div> : null}
      <form className="staff-card" onSubmit={(e) => void create(e)}>
        <h2>Nowa kategoria</h2>
        <div className="staff-field-row">
          <label className="staff-field">
            <span>Nazwa PL</span>
            <input name="namePl" required />
          </label>
          <label className="staff-field">
            <span>Slug</span>
            <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
          </label>
        </div>
        <button className="staff-button">Dodaj kategorię</button>
      </form>
      <div className="staff-table-wrap" style={{ marginTop: '1rem' }}>
        <table className="staff-table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Slug</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name_pl}</td>
                <td>{c.slug}</td>
                <td>{c.archived_at ? 'Archiwum' : c.is_published ? 'Publiczna' : 'Ukryta'}</td>
                <td>
                  <button className="staff-button secondary" onClick={() => void toggle(c)}>
                    {c.archived_at ? 'Przywróć' : 'Archiwizuj'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
