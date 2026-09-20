import { requireStaff } from '@/lib/auth/staff';
import { can } from '@/lib/auth/permissions';
import { listStaffCategories, listStaffItems } from '@/lib/menu/repository';
import { MenuAdmin } from '@/components/staff/menu-admin';
export default async function StaffMenuPage() {
  const staff = await requireStaff();
  const [items, categories] = await Promise.all([
    listStaffItems(staff.venue.id),
    listStaffCategories(staff.venue.id),
  ]);
  return (
    <MenuAdmin
      items={items}
      categories={categories}
      canEdit={can(staff.profile.role, 'menu.edit')}
    />
  );
}
