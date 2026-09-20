import type { StaffRole } from '@/lib/database/types';

export type StaffAccountConflict =
  | 'staff_self_deactivate'
  | 'staff_self_demote'
  | 'staff_last_admin';

export function staffAccountConflict(input: {
  actorId: string;
  targetId: string;
  targetRole: StaffRole;
  targetActive: boolean;
  nextRole?: StaffRole;
  nextActive?: boolean;
  activeAdminCount: number;
}): StaffAccountConflict | null {
  const resultingRole = input.nextRole ?? input.targetRole;
  const resultingActive = input.nextActive ?? input.targetActive;

  if (input.actorId === input.targetId && !resultingActive) return 'staff_self_deactivate';
  if (input.actorId === input.targetId && resultingRole !== 'admin') return 'staff_self_demote';

  const removesActiveAdmin =
    input.targetActive &&
    input.targetRole === 'admin' &&
    (!resultingActive || resultingRole !== 'admin');
  if (removesActiveAdmin && input.activeAdminCount <= 1) return 'staff_last_admin';

  return null;
}
