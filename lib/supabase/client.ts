'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/config/env';

/**
 * The browser client. Used for exactly one thing: the staff dashboard's
 * Realtime subscription. Every read and write still goes through a route
 * handler, and RLS decides what a subscription is allowed to receive.
 */
let cached: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  cached ??= createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
  return cached;
}
