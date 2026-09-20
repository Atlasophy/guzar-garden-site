import { requirePermission } from '@/lib/auth/staff';
import { getAdminClient } from '@/lib/supabase/admin';
import { getServerStaffDictionary } from '@/lib/i18n/staff-server';
import type { StaffProfileRow } from '@/lib/database/types';
import { StaffAccountsAdmin } from '@/components/staff/staff-accounts-admin';

export default async function StaffTeamPage() {
  const [staff, dictionary] = await Promise.all([
    requirePermission('settings.staff', '/staff/team'),
    getServerStaffDictionary(),
  ]);
  const { data: accounts, error } = await getAdminClient()
    .from('staff_profiles')
    .select('*')
    .eq('venue_id', staff.venue.id)
    .order('is_active', { ascending: false })
    .order('full_name')
    .returns<StaffProfileRow[]>();

  return (
    <>
      <header className="staff-head">
        <div>
          <h1>{dictionary.team}</h1>
          <p>{dictionary.teamSubtitle}</p>
        </div>
      </header>
      {error ? (
        <div className="staff-notice error">{dictionary.accountsLoadFailed}</div>
      ) : (
        <StaffAccountsAdmin accounts={accounts ?? []} currentUserId={staff.userId} />
      )}
    </>
  );
}
