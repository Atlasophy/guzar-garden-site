import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { StaffProfileRow, VenueRow } from '@/lib/database/types';
import { can, type Permission } from './permissions';

/**
 * Who is asking, and are they allowed.
 *
 * Every staff page and every staff route handler starts here. The session cookie
 * is verified by Supabase (`getUser` hits the auth server — a decoded JWT is not
 * proof), and then the staff profile is loaded and checked for `is_active`, so
 * revoking somebody's access takes effect on their next request rather than
 * whenever their token happens to expire.
 */

export interface StaffContext {
  userId: string;
  email: string;
  profile: StaffProfileRow;
  venue: VenueRow;
}

/** The signed-in staff member, or null. Never throws, never redirects. */
export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Read the profile with the admin client: the profile is what decides
  // authorisation, so reading it must not itself depend on a policy that the
  // profile grants.
  const admin = getAdminClient();
  const { data: profile } = await admin
    .from('staff_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<StaffProfileRow>();

  if (!profile || !profile.is_active) return null;

  const { data: venue } = await admin
    .from('venues')
    .select('*')
    .eq('id', profile.venue_id)
    .maybeSingle<VenueRow>();

  if (!venue) return null;

  return { userId: user.id, email: user.email ?? profile.email, profile, venue };
}

/** For pages: send an unauthenticated visitor to the login screen. */
export async function requireStaff(nextPath?: string): Promise<StaffContext> {
  const context = await getStaffContext();
  if (!context) {
    redirect(`/staff/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`);
  }
  return context;
}

/** For pages: a role that is signed in but not allowed here gets sent home. */
export async function requirePermission(
  permission: Permission,
  nextPath?: string,
): Promise<StaffContext> {
  const context = await requireStaff(nextPath);
  if (!can(context.profile.role, permission)) {
    redirect('/staff?denied=1');
  }
  return context;
}

export class AuthorizationError extends Error {
  constructor(
    readonly status: 401 | 403,
    readonly code: 'unauthenticated' | 'forbidden',
  ) {
    super(code);
    this.name = 'AuthorizationError';
  }
}

/**
 * For route handlers: throws rather than redirects, so the caller can return
 * JSON. The thrown error carries the status; `lib/api/handler.ts` turns it into
 * a response with no detail about what was missing.
 */
export async function authorize(permission: Permission): Promise<StaffContext> {
  const context = await getStaffContext();
  if (!context) throw new AuthorizationError(401, 'unauthenticated');
  if (!can(context.profile.role, permission)) throw new AuthorizationError(403, 'forbidden');
  return context;
}

/** Record activity, so the staff list can show who is on shift. Best-effort. */
export async function touchLastSeen(userId: string): Promise<void> {
  await getAdminClient()
    .from('staff_profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', userId);
}
