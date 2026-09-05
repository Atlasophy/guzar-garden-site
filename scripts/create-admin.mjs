#!/usr/bin/env node
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './lib/load-env.mjs';

loadEnv();

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const email = readArg('email')?.trim().toLowerCase();
const password = readArg('password') ?? process.env.STAFF_INITIAL_PASSWORD;
const fullName = readArg('name')?.trim() ?? 'Administrator';
const role = readArg('role') ?? 'admin';
const venueSlug = readArg('venue') ?? process.env.NEXT_PUBLIC_VENUE_SLUG ?? 'guzar-garden';

if (!email || !password) {
  console.error(
    'Usage: npm run staff:create-admin -- --email owner@example.com --password "a-strong-password" [--name "Full Name"] [--role admin|manager|host]',
  );
  process.exit(1);
}
if (password.length < 12) {
  console.error('The initial password must contain at least 12 characters.');
  process.exit(1);
}
if (!['admin', 'manager', 'host'].includes(role)) {
  console.error('--role must be admin, manager or host.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id')
    .eq('slug', venueSlug)
    .single();
  if (venueError || !venue)
    throw new Error(`Venue "${venueSlug}" was not found. Run the seed first.`);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) throw createError ?? new Error('Auth user was not created.');

  const { error: profileError } = await supabase.from('staff_profiles').insert({
    id: created.user.id,
    venue_id: venue.id,
    role,
    full_name: fullName,
    email,
    is_active: true,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    throw profileError;
  }

  console.log(`Created ${role} account for ${email} at ${venueSlug}.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
