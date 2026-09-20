-- =============================================================================
-- 0003 — staff profiles and the audit log
-- =============================================================================

-- --------------------------------------------------------------------------
-- staff_profiles
--
-- One row per Supabase Auth user who is allowed into /staff. There is no public
-- sign-up: rows are created by an admin (see scripts/create-admin.mjs and the
-- staff settings screen). Deactivating a profile removes access on the next
-- request without deleting the audit trail.
-- --------------------------------------------------------------------------
create table if not exists staff_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  venue_id    uuid not null references venues (id) on delete cascade,
  role        staff_role not null default 'host',
  full_name   text not null,
  email       citext not null,
  phone_e164  text,
  is_active   boolean not null default true,
  last_seen_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists staff_profiles_touch on staff_profiles;
create trigger staff_profiles_touch before update on staff_profiles
  for each row execute function gg_touch_updated_at();

create index if not exists staff_profiles_venue_idx on staff_profiles (venue_id) where is_active;

-- --------------------------------------------------------------------------
-- Authorisation helpers.
--
-- These are used by RLS policies and by the SQL functions, so a privileged
-- action is checked in the database as well as in the route handler. They are
-- SECURITY DEFINER so a policy on staff_profiles cannot recurse into itself.
-- --------------------------------------------------------------------------
create or replace function gg_current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from staff_profiles where id = auth.uid() and is_active;
$$;

create or replace function gg_current_staff_venue()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select venue_id from staff_profiles where id = auth.uid() and is_active;
$$;

/** true when the signed-in user is active staff with at least `minimum` rank. */
create or replace function gg_staff_at_least(minimum staff_role)
returns boolean
language sql
stable
as $$
  select case gg_current_staff_role()
           when 'admin'   then 3
           when 'manager' then 2
           when 'host'    then 1
           else 0
         end
       >= case minimum
           when 'admin'   then 3
           when 'manager' then 2
           when 'host'    then 1
         end;
$$;

-- --------------------------------------------------------------------------
-- audit_log
--
-- Append-only. `payload` carries what changed, never a secret and never more
-- guest data than the entry needs to be understood (see lib/security/redact.ts,
-- which is what writes these).
-- --------------------------------------------------------------------------
create table if not exists audit_log (
  id           bigint generated always as identity primary key,
  venue_id     uuid references venues (id) on delete set null,
  actor_id     uuid references auth.users (id) on delete set null,
  actor_label  text not null default 'system',   -- 'staff:Ada N.', 'guest', 'system', 'cron'
  action       text not null,                    -- 'reservation.cancelled', 'menu_item.price_changed' …
  entity_type  text not null,                    -- 'reservation', 'menu_item', 'restaurant_table' …
  entity_id    text,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on audit_log (entity_type, entity_id, created_at desc);
create index if not exists audit_log_venue_time_idx on audit_log (venue_id, created_at desc);
create index if not exists audit_log_action_idx on audit_log (action, created_at desc);
