import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/staff';
import { getStaffItem, listStaffCategories } from '@/lib/menu/repository';
import { MenuItemForm } from '@/components/staff/menu-item-form';
import { getServerStaffDictionary } from '@/lib/i18n/staff-server';
import { getRequestLocale } from '@/lib/i18n/staff-server';
import { localized, pickLocaleColumns } from '@/lib/i18n/fallback';
export default async function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const [staff, dictionary, locale, { id }] = await Promise.all([
    requirePermission('menu.edit'),
    getServerStaffDictionary(),
    getRequestLocale(),
    params,
  ]);
  const [item, categories] = await Promise.all([
    getStaffItem(id),
    listStaffCategories(staff.venue.id),
  ]);
  if (!item || item.venue_id !== staff.venue.id) notFound();
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>{dictionary.editDish}</h1>
          <p>{localized(pickLocaleColumns(item, 'name'), locale)}</p>
        </div>
      </header>
      <MenuItemForm item={item} categories={categories} />
    </>
  );
}
