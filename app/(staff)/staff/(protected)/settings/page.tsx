import { requireStaff } from '@/lib/auth/staff';
import { can } from '@/lib/auth/permissions';
import { getAdminClient } from '@/lib/supabase/admin';
import { toLocalDateString } from '@/lib/time/warsaw';
import type {
  BusinessHoursRow,
  DiningAreaRow,
  ReservationSettingsRow,
  RestaurantTableRow,
  ServiceExceptionRow,
  TableAllocationRow,
} from '@/lib/database/types';
import { OperationsAdmin } from '@/components/staff/operations-admin';
import { SettingsAdmin } from '@/components/staff/settings-admin';

export default async function StaffSettingsPage() {
  const staff = await requireStaff();
  const db = getAdminClient();
  const [
    { data: settings },
    { data: hours },
    { data: tables },
    { data: areas },
    { data: blocks },
    { data: exceptions },
  ] = await Promise.all([
    db
      .from('reservation_settings')
      .select('*')
      .eq('venue_id', staff.venue.id)
      .single<ReservationSettingsRow>(),
    db
      .from('business_hours')
      .select('*')
      .eq('venue_id', staff.venue.id)
      .order('weekday')
      .returns<BusinessHoursRow[]>(),
    db
      .from('restaurant_tables')
      .select('*')
      .eq('venue_id', staff.venue.id)
      .order('display_order')
      .returns<RestaurantTableRow[]>(),
    db
      .from('dining_areas')
      .select('*')
      .eq('venue_id', staff.venue.id)
      .order('display_order')
      .returns<DiningAreaRow[]>(),
    db
      .from('table_allocations')
      .select('*')
      .eq('venue_id', staff.venue.id)
      .eq('kind', 'block')
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('starts_at')
      .returns<TableAllocationRow[]>(),
    db
      .from('service_exceptions')
      .select('*')
      .eq('venue_id', staff.venue.id)
      .gte('ends_at', new Date().toISOString())
      .order('starts_at')
      .returns<ServiceExceptionRow[]>(),
  ]);
  if (!settings) return <div className="staff-notice error">Brak konfiguracji rezerwacji.</div>;
  const policy = can(staff.profile.role, 'settings.policy');
  const hoursPermission = can(staff.profile.role, 'settings.hours');
  const tablePermission = can(staff.profile.role, 'settings.tables');
  return (
    <>
      <header className="staff-head">
        <div>
          <h1>Ustawienia</h1>
          <p>Rezerwacje, godziny, blokady i plan stolików</p>
        </div>
      </header>
      <SettingsAdmin
        settings={settings}
        hours={hours ?? []}
        tables={tables ?? []}
        areas={areas ?? []}
        canPolicy={policy}
        canHours={hoursPermission}
        canTables={tablePermission}
      />
      <OperationsAdmin
        tables={tables ?? []}
        areas={areas ?? []}
        blocks={blocks ?? []}
        exceptions={exceptions ?? []}
        today={toLocalDateString(new Date())}
        canBlocks={can(staff.profile.role, 'blocks.manage')}
        canHours={hoursPermission}
      />
    </>
  );
}
