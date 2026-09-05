import { requirePermission } from '@/lib/auth/staff';
import { listStaffCategories } from '@/lib/menu/repository';
import { CategoryAdmin } from '@/components/staff/category-admin';
export default async function CategoriesPage() {
  const staff = await requirePermission('menu.edit');
  const categories = await listStaffCategories(staff.venue.id);
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>Kategorie menu</h1>
          <p>Publikacja i kolejność działów</p>
        </div>
      </header>
      <CategoryAdmin categories={categories} />
    </>
  );
}
