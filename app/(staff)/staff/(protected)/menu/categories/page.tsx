import { requirePermission } from '@/lib/auth/staff';
import { listStaffCategories } from '@/lib/menu/repository';
import { CategoryAdmin } from '@/components/staff/category-admin';
import { getServerStaffDictionary } from '@/lib/i18n/staff-server';
export default async function CategoriesPage() {
  const [staff, dictionary] = await Promise.all([
    requirePermission('menu.edit'),
    getServerStaffDictionary(),
  ]);
  const categories = await listStaffCategories(staff.venue.id);
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>{dictionary.menuCategoriesTitle}</h1>
          <p>{dictionary.menuCategoriesSubtitle}</p>
        </div>
      </header>
      <CategoryAdmin categories={categories} />
    </>
  );
}
