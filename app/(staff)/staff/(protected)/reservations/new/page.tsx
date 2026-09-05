import { requireStaff } from '@/lib/auth/staff';
import { getAdminClient } from '@/lib/supabase/admin';
import type { RestaurantTableRow } from '@/lib/database/types';
import { NewReservationForm } from '@/components/staff/new-reservation-form';
export default async function NewReservationPage() {
  const staff = await requireStaff();
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
          <h1>Nowa rezerwacja</h1>
          <p>Telefon, walk-in lub rezerwacja obsługi</p>
        </div>
      </header>
      <NewReservationForm tables={data ?? []} />
    </>
  );
}
