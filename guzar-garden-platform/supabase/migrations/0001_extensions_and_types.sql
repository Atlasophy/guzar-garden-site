-- =============================================================================
-- 0001 — extensions, enums and shared helpers
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid(), digest()
create extension if not exists "btree_gist";    -- '=' inside a GiST exclusion constraint
create extension if not exists "citext";        -- case-insensitive e-mail

-- --------------------------------------------------------------------------
-- Enumerated domains
-- --------------------------------------------------------------------------
do $$ begin
  create type reservation_status as enum
    ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reservation_source as enum ('website', 'phone', 'walk_in', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type allocation_kind as enum ('hold', 'reservation', 'block');
exception when duplicate_object then null; end $$;

do $$ begin
  create type allocation_status as enum ('active', 'released', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_role as enum ('admin', 'manager', 'host');
exception when duplicate_object then null; end $$;

do $$ begin
  -- closure          — the venue is shut for the whole day
  -- modified_hours   — the venue opens, but not on its usual schedule
  -- private_event    — the venue (or one area) is taken by a booking
  -- area_closed      — one dining area is unavailable, the rest trades normally
  create type service_exception_kind as enum
    ('closure', 'modified_hours', 'private_event', 'area_closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type table_shape as enum ('round', 'square', 'rectangle', 'booth');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_channel as enum ('sms', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum
    ('reservation_confirmation', 'reservation_update', 'reservation_cancellation',
     'reservation_reminder');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum
    ('pending', 'sending', 'sent', 'delivered', 'failed', 'undelivered', 'cancelled');
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------------------
-- updated_at trigger — one implementation for every table that carries one
-- --------------------------------------------------------------------------
create or replace function gg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- Public confirmation codes.
--
-- Non-sequential and short enough to read down a telephone. Crockford's base32
-- alphabet without I, L, O and U, so a code cannot be misheard as a digit and
-- cannot spell anything unfortunate. 8 characters over a 32-symbol alphabet is
-- ~40 bits; collisions are handled by the unique index and a retry loop.
-- --------------------------------------------------------------------------
create or replace function gg_generate_confirmation_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;
