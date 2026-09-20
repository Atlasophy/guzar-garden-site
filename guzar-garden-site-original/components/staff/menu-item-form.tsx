'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import type { MenuCategoryRow, MenuItemRow } from '@/lib/database/types';
import { formatStaffMessage } from '@/lib/i18n/staff';
import { useStaffDictionary } from './use-staff-dictionary';
import { useLocale } from '@/components/shared/locale-provider';
import { localized, pickLocaleColumns } from '@/lib/i18n/fallback';

type EditableItem = MenuItemRow | null;
export function MenuItemForm({
  item,
  categories,
}: {
  item: EditableItem;
  categories: MenuCategoryRow[];
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const dictionary = useStaffDictionary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? '').trim();
    const body = {
      categoryId: value('categoryId'),
      slug: value('slug'),
      namePl: value('namePl'),
      nameEn: value('nameEn'),
      nameRu: value('nameRu'),
      nameUz: value('nameUz'),
      descriptionPl: value('descriptionPl'),
      descriptionEn: value('descriptionEn'),
      descriptionRu: value('descriptionRu'),
      descriptionUz: value('descriptionUz'),
      price: value('price') || null,
      currency: 'PLN',
      portionText: value('portionText'),
      imageAltPl: value('imageAltPl'),
      imageAltEn: '',
      imageAltRu: '',
      imageAltUz: '',
      isSignature: form.get('isSignature') === 'on',
      signatureOrder: Number(value('signatureOrder') || 0),
      isAvailable: form.get('isAvailable') === 'on',
      isPublished: form.get('isPublished') === 'on',
      displayOrder: Number(value('displayOrder') || 0),
      allergens: value('allergens')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      dietaryTags: value('dietaryTags')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      searchAliases: value('searchAliases'),
      removeImage: form.get('removeImage') === 'on',
    };
    const result = await apiFetch<{ id?: string; updated?: boolean }>(
      item ? `/api/staff/menu/items/${item.id}` : '/api/staff/menu/items',
      { method: item ? 'PATCH' : 'POST', body: JSON.stringify(body) },
    );
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    const id = item?.id ?? result.data.id;
    if (image && id) {
      const upload = new FormData();
      upload.set('itemId', id);
      upload.set('file', image);
      const response = await fetch('/api/staff/menu/images', {
        method: 'POST',
        body: upload,
        credentials: 'same-origin',
      });
      if (!response.ok) {
        setError(dictionary.dishSavedImageFailed);
        setBusy(false);
        return;
      }
    }
    router.push('/staff/menu');
    router.refresh();
  };
  const archive = async () => {
    if (!item) return;
    setBusy(true);
    const r = await apiFetch(`/api/staff/menu/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: !item.archived_at }),
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    router.push('/staff/menu');
    router.refresh();
  };
  return (
    <form className="staff-card" onSubmit={(e) => void submit(e)}>
      {error ? <div className="staff-notice error">{error}</div> : null}
      <div className="staff-field-row">
        <label className="staff-field">
          <span>{dictionary.category}</span>
          <select name="categoryId" required defaultValue={item?.category_id}>
            {categories
              .filter((c) => !c.archived_at)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {localized(pickLocaleColumns(c, 'name'), locale)}
                </option>
              ))}
          </select>
        </label>
        <label className="staff-field">
          <span>{dictionary.slug}</span>
          <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={item?.slug} />
        </label>
      </div>
      <div className="staff-field-row">
        <label className="staff-field">
          <span>{dictionary.namePl}</span>
          <input name="namePl" required defaultValue={item?.name_pl} />
        </label>
        <label className="staff-field">
          <span>{dictionary.nameEn}</span>
          <input name="nameEn" defaultValue={item?.name_en ?? ''} />
        </label>
      </div>
      <div className="staff-field-row">
        <label className="staff-field">
          <span>{dictionary.nameRu}</span>
          <input name="nameRu" defaultValue={item?.name_ru ?? ''} />
        </label>
        <label className="staff-field">
          <span>{dictionary.nameUz}</span>
          <input name="nameUz" defaultValue={item?.name_uz ?? ''} />
        </label>
      </div>
      {(['Pl', 'En', 'Ru', 'Uz'] as const).map((lang) => (
        <label key={lang} className="staff-field">
          <span>
            {formatStaffMessage(dictionary.descriptionLanguage, { language: lang.toUpperCase() })}
          </span>
          <textarea
            name={`description${lang}`}
            defaultValue={
              (item?.[`description_${lang.toLowerCase()}` as keyof MenuItemRow] as string) ?? ''
            }
          />
        </label>
      ))}
      <div className="staff-field-row">
        <label className="staff-field">
          <span>{dictionary.pricePln}</span>
          <input
            name="price"
            inputMode="decimal"
            pattern="\d+([.,]\d{1,2})?"
            defaultValue={item?.price ?? ''}
          />
        </label>
        <label className="staff-field">
          <span>{dictionary.portion}</span>
          <input name="portionText" defaultValue={item?.portion_text ?? ''} />
        </label>
      </div>
      <div className="staff-field-row">
        <label className="staff-field">
          <span>{dictionary.displayOrder}</span>
          <input
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={item?.display_order ?? 0}
          />
        </label>
        <label className="staff-field">
          <span>{dictionary.homepageOrder}</span>
          <input
            name="signatureOrder"
            type="number"
            min="0"
            defaultValue={item?.signature_order ?? 0}
          />
        </label>
      </div>
      <label className="staff-field">
        <span>{dictionary.allergens}</span>
        <input name="allergens" defaultValue={item?.allergens.join(', ') ?? ''} />
      </label>
      <label className="staff-field">
        <span>{dictionary.dietaryTags}</span>
        <input name="dietaryTags" defaultValue={item?.dietary_tags.join(', ') ?? ''} />
      </label>
      <label className="staff-field">
        <span>{dictionary.searchAliases}</span>
        <input name="searchAliases" defaultValue={item?.search_aliases ?? ''} />
      </label>
      <label className="staff-field">
        <span>{dictionary.dishImage}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="staff-field">
        <span>{dictionary.imageAltPl}</span>
        <input name="imageAltPl" defaultValue={item?.image_alt_pl ?? ''} />
      </label>
      {item?.image_path ? (
        <label className="staff-check">
          <input name="removeImage" type="checkbox" /> {dictionary.removeImage}
        </label>
      ) : null}
      <label className="staff-check">
        <input name="isAvailable" type="checkbox" defaultChecked={item?.is_available ?? true} />{' '}
        {dictionary.available}
      </label>
      <label className="staff-check">
        <input name="isPublished" type="checkbox" defaultChecked={item?.is_published ?? true} />{' '}
        {dictionary.published}
      </label>
      <label className="staff-check">
        <input name="isSignature" type="checkbox" defaultChecked={item?.is_signature ?? false} />{' '}
        {dictionary.showOnHomepage}
      </label>
      <div className="staff-actions">
        <button className="staff-button" disabled={busy}>
          {busy ? dictionary.saving : dictionary.save}
        </button>
        <button
          type="button"
          className="staff-button secondary"
          onClick={() => router.push('/staff/menu')}
        >
          {dictionary.cancel}
        </button>
        {item ? (
          <button
            type="button"
            className="staff-button danger"
            disabled={busy}
            onClick={() => void archive()}
          >
            {item.archived_at ? dictionary.restore : dictionary.archive}
          </button>
        ) : null}
      </div>
    </form>
  );
}
