import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/config/env';

/**
 * The staff user's own client, built from the auth cookies on the request.
 *
 * This is the client that RLS applies to, so a query made through it can only
 * ever see what that member of staff is allowed to see. Privileged mutations
 * still go through the admin client, but only after the caller has been
 * identified here first.
 */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where the response headers are
            // already sealed. The proxy refreshes the session instead, which is
            // why that file exists.
          }
        },
      },
    },
  );
}
