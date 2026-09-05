-- =============================================================================
-- 0004 — reservations and table allocations
--
-- `table_allocations` is the single authority on whether a table is occupied.
-- A reservation row on its own occupies nothing; the allocation does. Holds,
-- confirmed bookings and manual blocks are all the same kind of row, so one
-- exclusion constraint covers every way a table can be taken.
-- =============================================================================

create table if not exists reservations (
  id                 uuid primary key default gen_random_uuid(),
  venue_id           uuid not null references venues (id) on delete cascade,

  -- What the guest is given. Non-sequential; see gg_generate_confirmation_code().
  confirmation_code  text not null,

  status             reservation_status not null default 'pending',
  source             reservation_source not null default 'website',

  starts_at          timestamptz not null,
  -- What the guest is told the table is theirs until.
  ends_at            timestamptz not null,
  -- ends_at + turnaround. This is what the allocation uses, and it is stored
  -- rather than computed so a later policy change cannot retroactively move
  -- occupancy under a booking that is already on the floor.
  occupancy_ends_at  timestamptz not null,

  party_size         int not null,

  guest_first_name   text not null,
  guest_last_name    text not null,
  guest_email        citext,
  guest_phone_e164   text not null,
  locale             text not null default 'pl',
  special_requests   text,

  privacy_accepted_at timestamptz,
  marketing_consent   boolean not null default false,

  -- Only the hash is stored. The raw token exists once, in the URL handed to
  -- the guest; the database can verify it but can never reproduce it.
  management_token_hash text,
  management_token_expires_at timestamptz,

  -- Guards a double-submitted confirmation. Unique per venue.
  idempotency_key    text,

  cancellation_reason text,
  cancelled_by_staff  boolean not null default false,

  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  confirmed_at       timestamptz,
  seated_at          timestamptz,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  no_show_at         timestamptz,

  constraint reservations_code_unique unique (venue_id, confirmation_code),
  constraint reservations_idempotency_unique unique (venue_id, idempotency_key),
  constraint reservations_window check (ends_at > starts_at and occupancy_ends_at >= ends_at),
  constraint reservations_party_size check (party_size between 1 and 100),
  constraint reservations_locale check (locale in ('pl', 'en', 'ru', 'uz')),
  constraint reservations_phone_e164 check (guest_phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  constraint reservations_names_present check (
    length(btrim(guest_first_name)) > 0 and length(btrim(guest_last_name)) > 0
  )
);

drop trigger if exists reservations_touch on reservations;
create trigger reservations_touch before update on reservations
  for each row execute function gg_touch_updated_at();

create index if not exists reservations_venue_start_idx on reservations (venue_id, starts_at);
create index if not exists reservations_status_idx on reservations (venue_id, status, starts_at);
create index if not exists reservations_phone_idx on reservations (venue_id, guest_phone_e164);
create index if not exists reservations_email_idx on reservations (venue_id, guest_email);
create index if not exists reservations_mgmt_token_idx
  on reservations (management_token_hash) where management_token_hash is not null;
-- Staff search by guest name.
create index if not exists reservations_name_search_idx
  on reservations using gin (
    to_tsvector('simple', coalesce(guest_first_name, '') || ' ' || coalesce(guest_last_name, ''))
  );

-- ---------------------------------------------------------------------------
-- table_allocations
-- ---------------------------------------------------------------------------
create table if not exists table_allocations (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references venues (id) on delete cascade,
  table_id       uuid not null references restaurant_tables (id) on delete cascade,
  reservation_id uuid references reservations (id) on delete cascade,

  kind           allocation_kind   not null,
  status         allocation_status not null default 'active',

  starts_at      timestamptz not null,
  -- Includes the turnaround buffer. Half-open: [starts_at, ends_at).
  ends_at        timestamptz not null,

  -- Holds only. Again, only the hash is stored.
  hold_token_hash    text,
  hold_session_hash  text,
  hold_expires_at    timestamptz,

  -- Blocks only.
  block_reason   text,

  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  released_at    timestamptz,

  constraint table_allocations_window check (ends_at > starts_at),
  constraint table_allocations_hold_shape check (
    kind <> 'hold'
    or (hold_token_hash is not null and hold_expires_at is not null and reservation_id is null)
  ),
  constraint table_allocations_reservation_shape check (
    kind <> 'reservation' or reservation_id is not null
  ),
  constraint table_allocations_block_shape check (
    kind <> 'block' or (reservation_id is null and block_reason is not null)
  )
);

drop trigger if exists table_allocations_touch on table_allocations;
create trigger table_allocations_touch before update on table_allocations
  for each row execute function gg_touch_updated_at();

-- ###########################################################################
-- THE constraint.
--
-- Two active allocations may not overlap in time on the same table. The range
-- is half-open, so a booking that ends at 20:00 and one that starts at 20:00 do
-- not collide — that is what makes back-to-back sittings possible.
--
-- This is the last line of defence against double booking and it is a database
-- guarantee, not an application one: "check availability, then insert" loses
-- the race no matter how carefully it is written, because two transactions can
-- both read an empty table before either writes. Every code path that occupies
-- a table goes through this constraint, including staff overrides.
--
-- Expired holds do not weaken it: expiry flips `status` to 'expired', which
-- takes the row out of the predicate. The predicate cannot itself test
-- now() — a constraint index must be immutable — so expiry is always an
-- explicit UPDATE (gg_expire_stale_holds, called opportunistically before
-- every hold attempt and by the scheduled job).
-- ###########################################################################
alter table table_allocations
  drop constraint if exists table_allocations_no_overlap;

alter table table_allocations
  add constraint table_allocations_no_overlap
  exclude using gist (
    table_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status = 'active');

create index if not exists table_allocations_lookup_idx
  on table_allocations (venue_id, starts_at, ends_at) where status = 'active';
create index if not exists table_allocations_reservation_idx
  on table_allocations (reservation_id) where reservation_id is not null;
create index if not exists table_allocations_hold_expiry_idx
  on table_allocations (hold_expires_at) where kind = 'hold' and status = 'active';
create unique index if not exists table_allocations_hold_token_idx
  on table_allocations (hold_token_hash) where hold_token_hash is not null;
