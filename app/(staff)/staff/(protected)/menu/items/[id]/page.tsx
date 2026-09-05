import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/staff';
import { getStaffItem, listStaffCategories } from '@/lib/menu/repository';
import { MenuItemForm } from '@/components/staff/menu-item-form';
export default async function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission('menu.edit');
  const { id } = await params;
  const [item, categories] = await Promise.all([
    getStaffItem(id),
    listStaffCategories(staff.venue.id),
  ]);
  if (!item || item.venue_id !== staff.venue.id) notFound();
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>Edytuj danie</h1>
          <p>{item.name_pl}</p>
        </div>
      </header>
      <MenuItemForm item={item} categories={categories} />
    </>
  );
}
