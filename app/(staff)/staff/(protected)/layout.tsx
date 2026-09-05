import type { ReactNode } from 'react';
import { requireStaff } from '@/lib/auth/staff';
import { StaffShell } from '@/components/staff/staff-shell';

export const dynamic = 'force-dynamic';
export default async function ProtectedStaffLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaff();
  return (
    <StaffShell name={staff.profile.full_name} role={staff.profile.role}>
      {children}
    </StaffShell>
  );
}
