import { describe, expect, it } from 'vitest';
import { staffAccountConflict } from '@/lib/auth/staff-account-rules';
import { staffAccountCreateSchema, staffAccountUpdateSchema } from '@/lib/validation/schemas';

describe('staff account management', () => {
  it('requires a strong temporary password for new accounts', () => {
    expect(
      staffAccountCreateSchema.safeParse({
        fullName: 'Test Host',
        email: 'host@example.com',
        password: 'too-short',
        role: 'host',
        phone: '',
      }).success,
    ).toBe(false);
    expect(
      staffAccountCreateSchema.safeParse({
        fullName: 'Test Host',
        email: 'HOST@EXAMPLE.COM',
        password: 'long-temporary-password',
        role: 'host',
        phone: '',
      }).data?.email,
    ).toBe('host@example.com');
  });

  it('does not accept an empty account update', () => {
    expect(staffAccountUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('prevents an administrator from disabling or demoting their own account', () => {
    const base = {
      actorId: 'admin-1',
      targetId: 'admin-1',
      targetRole: 'admin' as const,
      targetActive: true,
      activeAdminCount: 2,
    };
    expect(staffAccountConflict({ ...base, nextActive: false })).toBe('staff_self_deactivate');
    expect(staffAccountConflict({ ...base, nextRole: 'manager' })).toBe('staff_self_demote');
  });

  it('keeps at least one active administrator', () => {
    expect(
      staffAccountConflict({
        actorId: 'admin-2',
        targetId: 'admin-1',
        targetRole: 'admin',
        targetActive: true,
        nextActive: false,
        activeAdminCount: 1,
      }),
    ).toBe('staff_last_admin');
  });
});
