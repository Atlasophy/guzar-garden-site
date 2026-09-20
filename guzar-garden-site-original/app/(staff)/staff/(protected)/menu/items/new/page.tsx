import { requirePermission } from '@/lib/auth/staff';
import { listStaffCategories } from '@/lib/menu/repository';
import { MenuItemForm } from '@/components/staff/menu-item-form';
import { getServerStaffDictionary } from '@/lib/i18n/staff-server';
export default async function NewMenuItemPage() {
  const [staff, dictionary] = await Promise.all([
    requirePermission('menu.edit'),
    getServerStaffDictionary(),
  ]);
  const categories = await listStaffCategories(staff.venue.id);
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>{dictionary.newDish}</h1>
          <p>{dictionary.newDishSubtitle}</p>
        </div>
      </header>
      <MenuItemForm item={null} categories={categories} />
    </>
  );
}
