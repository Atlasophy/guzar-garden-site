import { requirePermission } from '@/lib/auth/staff';
import { listStaffCategories } from '@/lib/menu/repository';
import { MenuItemForm } from '@/components/staff/menu-item-form';
export default async function NewMenuItemPage() {
  const staff = await requirePermission('menu.edit');
  const categories = await listStaffCategories(staff.venue.id);
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>Nowe danie</h1>
          <p>Dodaj pozycję do karty</p>
        </div>
      </header>
      <MenuItemForm item={null} categories={categories} />
    </>
  );
}
