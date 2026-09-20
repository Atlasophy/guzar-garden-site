-- =============================================================================
-- 0002 — venue, dining areas, tables, opening hours, exceptions, policy
--
-- Everything is venue-scoped even though Guzar Garden is a single restaurant:
-- a second address later is then a row, not a migration.
-- =============================================================================

-- --------------------------------------------------------------------------
-- venues
-- --------------------------------------------------------------------------
create table if not exists venues (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  slug         text        not null unique,
  timezone     text        not null default 'Europe/Warsaw',
  address_line text        not null,
  postal_code  text        not null,
  city         text        not null,
  country_code text        not null default 'PL',
  phone_e164   text        not null,
  email        citext,
  latitude     numeric(9, 6),
  longitude    numeric(9, 6),
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint venues_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint venues_phone_e164 check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);

drop trigger if exists venues_touch on venues;
create trigger venues_touch before update on venues
  for each row execute function gg_touch_updated_at();

-- --------------------------------------------------------------------------
-- dining_areas
--
-- `slug` is the stable identity used by code and by the 3D scene. The display
-- name is localised; nothing keys off it.
-- --------------------------------------------------------------------------
create table if not exists dining_areas (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references venues (id) on delete cascade,
  slug          text not null,
  name_pl       text not null,
  name_en       text not null,
  name_ru       text not null,
  name_uz       text not null,
  description_pl text,
  description_en text,
  description_ru text,
  description_uz text,
  -- Floor-plan metadata for the 3D scene: the axis-aligned room footprint in
  -- metres plus a tint. Origin is the venue's own floor origin (see README).
  floor_x       numeric(8, 2) not null default 0,
  floor_z       numeric(8, 2) not null default 0,
  floor_width   numeric(8, 2) not null default 10,
  floor_depth   numeric(8, 2) not null default 10,
  floor_color   text          not null default '#123a28',
  is_outdoor    boolean       not null default false,
  display_order int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint dining_areas_slug_unique unique (venue_id, slug),
  constraint dining_areas_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

drop trigger if exists dining_areas_touch on dining_areas;
create trigger dining_areas_touch before update on dining_areas
  for each row execute function gg_touch_updated_at();

create index if not exists dining_areas_venue_idx on dining_areas (venue_id, display_order);

-- --------------------------------------------------------------------------
-- restaurant_tables
--
-- `code` (T12, G03 …) is the identity staff speak out loud and the identity the
-- database uses. `display_name_*` is decoration only.
-- --------------------------------------------------------------------------
create table if not exists restaurant_tables (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references venues (id) on delete cascade,
  dining_area_id  uuid not null references dining_areas (id) on delete restrict,
  code            text not null,
  display_name_pl text,
  display_name_en text,
  display_name_ru text,
  display_name_uz text,
  min_capacity    int  not null default 1,
  max_capacity    int  not null,
  shape           table_shape not null default 'round',
  width_m         numeric(5, 2) not null default 0.9,
  depth_m         numeric(5, 2) not null default 0.9,
  floor_x         numeric(8, 2) not null default 0,
  floor_y         numeric(8, 2) not null default 0,   -- height off the floor
  floor_z         numeric(8, 2) not null default 0,
  rotation_deg    numeric(6, 2) not null default 0,
  is_accessible   boolean not null default false,
  accessibility_notes text,
  staff_notes     text,
  is_active       boolean not null default true,
  display_order   int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint restaurant_tables_code_unique unique (venue_id, code),
  constraint restaurant_tables_capacity check (min_capacity >= 1 and max_capacity >= min_capacity),
  constraint restaurant_tables_code_format check (code ~ '^[A-Z0-9][A-Z0-9-]{0,11}$')
);

drop trigger if exists restaurant_tables_touch on restaurant_tables;
create trigger restaurant_tables_touch before update on restaurant_tables
  for each row execute function gg_touch_updated_at();

create index if not exists restaurant_tables_area_idx
  on restaurant_tables (dining_area_id, display_order);
create index if not exists restaurant_tables_venue_active_idx
  on restaurant_tables (venue_id) where is_active;

-- --------------------------------------------------------------------------
-- business_hours
--
-- More than one row per weekday is allowed, so a split service (lunch, then
-- dinner) is expressed by two intervals rather than a flag.
--
-- `closes_at` may be less than or equal to `opens_at`; that means the service
-- runs past midnight into the following day. 24:00 is stored as 00:00 with
-- `closes_next_day = true` so it reads unambiguously.
-- --------------------------------------------------------------------------
create table if not exists business_hours (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references venues (id) on delete cascade,
  weekday         int  not null,                       -- 0 = Monday … 6 = Sunday
  opens_at        time not null,
  closes_at       time not null,
  closes_next_day boolean not null default false,
  display_order   int  not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint business_hours_weekday check (weekday between 0 and 6)
);

drop trigger if exists business_hours_touch on business_hours;
create trigger business_hours_touch before update on business_hours
  for each row execute function gg_touch_updated_at();

create index if not exists business_hours_venue_weekday_idx
  on business_hours (venue_id, weekday, display_order);

-- --------------------------------------------------------------------------
-- service_exceptions
--
-- One row overrides the weekly pattern for a window of time. `starts_at` and
-- `ends_at` are absolute instants so a DST-straddling closure cannot be
-- ambiguous; the staff UI writes them from a Warsaw-local date and time.
-- --------------------------------------------------------------------------
create table if not exists service_exceptions (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references venues (id) on delete cascade,
  dining_area_id uuid references dining_areas (id) on delete cascade,
  kind           service_exception_kind not null,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  -- For kind = 'modified_hours': the replacement service window, local time.
  replacement_opens_at  time,
  replacement_closes_at time,
  replacement_closes_next_day boolean not null default false,
  reason         text not null,
  is_public      boolean not null default true,   -- show the reason to guests?
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint service_exceptions_window check (ends_at > starts_at),
  constraint service_exceptions_modified_hours check (
    kind <> 'modified_hours'
    or (replacement_opens_at is not null and replacement_closes_at is not null)
  ),
  constraint service_exceptions_area_scope check (
    kind <> 'area_closed' or dining_area_id is not null
  )
);

drop trigger if exists service_exceptions_touch on service_exceptions;
create trigger service_exceptions_touch before update on service_exceptions
  for each row execute function gg_touch_updated_at();

create index if not exists service_exceptions_window_idx
  on service_exceptions (venue_id, starts_at, ends_at);

-- --------------------------------------------------------------------------
-- reservation_settings — the booking policy, one row per venue
-- --------------------------------------------------------------------------
create table if not exists reservation_settings (
  venue_id                 uuid primary key references venues (id) on delete cascade,
  slot_interval_minutes    int  not null default 15,
  default_duration_minutes int  not null default 120,
  turnaround_minutes       int  not null default 15,
  min_notice_minutes       int  not null default 30,
  booking_horizon_days     int  not null default 90,
  max_online_party_size    int  not null default 12,
  hold_duration_seconds    int  not null default 300,
  -- How close to the sitting a guest may still cancel or move it themselves.
  cancellation_cutoff_minutes int not null default 120,
  cancellation_policy_pl   text not null default '',
  cancellation_policy_en   text not null default '',
  cancellation_policy_ru   text not null default '',
  cancellation_policy_uz   text not null default '',
  large_party_phone_note   boolean not null default true,
  updated_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint reservation_settings_sane check (
    slot_interval_minutes between 5 and 120
    and default_duration_minutes between 15 and 600
    and turnaround_minutes between 0 and 240
    and min_notice_minutes between 0 and 10080
    and booking_horizon_days between 1 and 730
    and max_online_party_size between 1 and 100
    and hold_duration_seconds between 60 and 3600
    and cancellation_cutoff_minutes between 0 and 20160
  )
);

drop trigger if exists reservation_settings_touch on reservation_settings;
create trigger reservation_settings_touch before update on reservation_settings
  for each row execute function gg_touch_updated_at();
