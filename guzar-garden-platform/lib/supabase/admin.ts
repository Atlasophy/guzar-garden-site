import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/config/env';

/**
 * The service-role client.
 *
 * Bypasses RLS, so it is only ever reached from a server route or a server
 * action that has already decided the caller is allowed to do the thing. The
 * `server-only` import at the top is what makes accidentally pulling this into
 * a client component a build error rather than a leaked key.
 *
 * Nothing here persists a session: this client is not a user, it is the
 * application acting on a user's already-authorised behalf.
 */

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const env = getServerEnv();
  cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-application-name': 'guzar-garden-server' } },
  });
  return cached;
}

/** Test seam — drops the memoised client between cases. */
export function resetAdminClient(): void {
  cached = null;
}

/**
 * Call one of the `gg_*` SQL functions.
 *
 * Those functions return `{ok:true, …}` or `{ok:false, code:'…'}` for expected
 * business outcomes, so this returns the payload as-is and only throws when the
 * database itself failed.
 */
export async function callFunction<T = unknown>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await getAdminClient().rpc(name, args);
  if (error) {
    throw new DatabaseFunctionError(name, error.message, error.code ?? undefined);
  }
  return data as T;
}

export class DatabaseFunctionError extends Error {
  constructor(
    readonly functionName: string,
    message: string,
    readonly code?: string,
  ) {
    super(`${functionName}: ${message}`);
    this.name = 'DatabaseFunctionError';
  }
}

/** The shape every `gg_*` mutation returns. */
export type FunctionResult<T extends object = Record<string, never>> =
  | ({ ok: true } & T & { idempotent?: boolean })
  | { ok: false; code: string };
