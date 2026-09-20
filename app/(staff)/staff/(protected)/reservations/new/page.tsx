import { requireStaff } from '@/lib/auth/staff';
import { getAdminClient } from '@/lib/supabase/admin';
import type { RestaurantTableRow } from '@/lib/database/types';
import { NewReservationForm } from '@/components/staff/new-reservation-form';
import { getServerStaffDictionary } from '@/lib/i18n/staff-server';
export default async function NewReservationPage() {
  const [staff, dictionary] = await Promise.all([requireStaff(), getServerStaffDictionary()]);
  const { data } = await getAdminClient()
    .from('restaurant_tables')
    .select('*')
    .eq('venue_id', staff.venue.id)
    .order('display_order')
    .returns<RestaurantTableRow[]>();
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>{dictionary.newReservation}</h1>
          <p>{dictionary.newReservationSubtitle}</p>
        </div>
      </header>
      <NewReservationForm tables={data ?? []} />
    </>
  );
}
