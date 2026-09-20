-- =============================================================================
-- 0007 — atomic reservation operations
--
-- Every way a table can become occupied goes through one of these functions, so
-- the capacity check, the opening-hours check and the overlap constraint are
-- applied identically to a guest booking, a telephone booking, a walk-in, a
-- reschedule and a staff block.
--
-- Expected business outcomes are returned as jsonb ({ok:false, code:'…'}), not
-- raised, so the caller can react without losing the transaction. Only genuine
-- programming errors raise.
--
-- All of these run with the caller's transaction. They are SECURITY DEFINER so
-- that server-side callers do not depend on RLS being permissive, and EXECUTE
-- is granted to service_role only — nothing reaches them from the browser.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Service windows for one local calendar date.
--
-- Returns the absolute instants the venue is actually open, after applying
-- modified hours and subtracting full closures and venue-wide private events.
-- This is the single authority on "is the restaurant open then"; the
-- TypeScript availability service turns these windows into bookable slots and
-- the write path re-checks against the very same function.
-- ---------------------------------------------------------------------------
create or replace function gg_service_windows(p_venue_id uuid, p_local_date date)
returns table (window_start timestamptz, window_end timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz          text;
  v_weekday     int;
  v_day_start   timestamptz;
  v_day_end     timestamptz;
  v_windows     tstzrange[] := '{}';
  v_next        tstzrange[];
  v_modified    boolean := false;
  r             record;
  w             tstzrange;
  diff          tstzrange[];
begin
  select timezone into v_tz from venues where id = p_venue_id and is_active;
  if v_tz is null then
    return;
  end if;

  -- ISO day of week is 1 = Monday; the schema stores 0 = Monday.
  v_weekday   := extract(isodow from p_local_date)::int - 1;
  v_day_start := (p_local_date::timestamp) at time zone v_tz;
  v_day_end   := ((p_local_date + 1)::timestamp) at time zone v_tz;

  -- 1. Modified hours replace the weekly pattern for the whole day.
  for r in
    select replacement_opens_at, replacement_closes_at, replacement_closes_next_day
    from service_exceptions
    where venue_id = p_venue_id
      and kind = 'modified_hours'
      and dining_area_id is null
      and starts_at < v_day_end
      and ends_at   > v_day_start
    order by starts_at
  loop
    v_modified := true;
    v_windows := v_windows || tstzrange(
      ((p_local_date + r.replacement_opens_at)::timestamp) at time zone v_tz,
      ((p_local_date
        + (case when r.replacement_closes_next_day
                  or r.replacement_closes_at <= r.replacement_opens_at
                then 1 else 0 end)
        + r.replacement_closes_at)::timestamp) at time zone v_tz,
      '[)'
    );
  end loop;

  -- 2. Otherwise the weekly pattern.
  if not v_modified then
    for r in
      select opens_at, closes_at, closes_next_day
      from business_hours
      where venue_id = p_venue_id and weekday = v_weekday and is_active
      order by display_order, opens_at
    loop
      v_windows := v_windows || tstzrange(
        ((p_local_date + r.opens_at)::timestamp) at time zone v_tz,
        ((p_local_date
          + (case when r.closes_next_day or r.closes_at <= r.opens_at then 1 else 0 end)
          + r.closes_at)::timestamp) at time zone v_tz,
        '[)'
      );
    end loop;
  end if;

  -- 3. Subtract every venue-wide closure and private event that touches the day.
  for r in
    select starts_at, ends_at
    from service_exceptions
    where venue_id = p_venue_id
      and kind in ('closure', 'private_event')
      and dining_area_id is null
      and starts_at < v_day_end
      and ends_at   > v_day_start
  loop
    v_next := '{}';
    foreach w in array v_windows loop
      -- range_minus cannot express a hole in the middle, so split by hand.
      if not (w && tstzrange(r.starts_at, r.ends_at, '[)')) then
        v_next := v_next || w;
      else
        diff := '{}';
        if lower(w) < r.starts_at then
          diff := diff || tstzrange(lower(w), r.starts_at, '[)');
        end if;
        if upper(w) > r.ends_at then
          diff := diff || tstzrange(r.ends_at, upper(w), '[)');
        end if;
        v_next := v_next || diff;
      end if;
    end loop;
    v_windows := v_next;
  end loop;

  foreach w in array v_windows loop
    if not isempty(w) and upper(w) > lower(w) then
      window_start := lower(w);
      window_end   := upper(w);
      return next;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Release holds whose clock has run out.
--
-- Called opportunistically before every hold attempt and before every
-- availability read, and again by the scheduled job. Idempotent: a row that is
-- already 'expired' is not in the WHERE clause, so running it twice is free and
-- two workers running it at once cannot double-count.
-- ---------------------------------------------------------------------------
create or replace function gg_expire_stale_holds(
  p_venue_id uuid default null,
  p_table_id uuid default null
)
returns int
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  update table_allocations
     set status = 'expired',
         released_at = now()
   where kind = 'hold'
     and status = 'active'
     and hold_expires_at <= now()
     and (p_venue_id is null or venue_id = p_venue_id)
     and (p_table_id is null or table_id = p_table_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Does [p_starts_at, p_ends_at) sit inside a service window, and is the area
-- open? Returns null when everything is fine, otherwise a reason code.
--
-- `p_enforce_lead_time` is false for staff-created bookings: a host taking a
-- walk-in is standing in front of the guest and the 30-minute notice rule makes
-- no sense there.
-- ---------------------------------------------------------------------------
create or replace function gg_validate_booking_window(
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_dining_area_id uuid default null,
  p_enforce_lead_time boolean default true
)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz        text;
  v_settings  reservation_settings%rowtype;
  v_local_day date;
  v_covered   boolean := false;
  r           record;
begin
  select timezone into v_tz from venues where id = p_venue_id and is_active;
  if v_tz is null then
    return 'venue_unavailable';
  end if;

  select * into v_settings from reservation_settings where venue_id = p_venue_id;
  if not found then
    return 'settings_missing';
  end if;

  if p_ends_at <= p_starts_at then
    return 'invalid_window';
  end if;

  if p_enforce_lead_time then
    if p_starts_at < now() + make_interval(mins => v_settings.min_notice_minutes) then
      return 'too_soon';
    end if;
    if p_starts_at > now() + make_interval(days => v_settings.booking_horizon_days) then
      return 'beyond_horizon';
    end if;
  elsif p_starts_at > now() + make_interval(days => v_settings.booking_horizon_days) then
    return 'beyond_horizon';
  end if;

  -- A sitting may straddle midnight, so check the windows of the local day the
  -- booking starts on and of the day before (a service that began yesterday and
  -- runs past midnight still covers 00:30 today).
  v_local_day := (p_starts_at at time zone v_tz)::date;

  for r in
    select * from gg_service_windows(p_venue_id, v_local_day - 1)
    union all
    select * from gg_service_windows(p_venue_id, v_local_day)
    union all
    select * from gg_service_windows(p_venue_id, v_local_day + 1)
  loop
    if p_starts_at >= r.window_start and p_ends_at <= r.window_end then
      v_covered := true;
      exit;
    end if;
  end loop;

  if not v_covered then
    return 'outside_opening_hours';
  end if;

  -- Closures and private events scoped to this dining area.
  if p_dining_area_id is not null then
    perform 1
      from service_exceptions
     where venue_id = p_venue_id
       and dining_area_id = p_dining_area_id
       and kind in ('area_closed', 'private_event', 'closure')
       and starts_at < p_ends_at
       and ends_at   > p_starts_at;
    if found then
      return 'area_unavailable';
    end if;

    perform 1 from dining_areas where id = p_dining_area_id and is_active;
    if not found then
      return 'area_unavailable';
    end if;
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Floor state for one interval.
--
-- Returns every active table with a state string. Public callers get exactly
-- this and nothing else — no guest names, no reservation ids, no notes. The
-- caller passes the hold it owns so its own hold reads as 'held_by_you' rather
-- than as somebody else's occupancy.
-- ---------------------------------------------------------------------------
create or replace function gg_table_states(
  p_venue_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_party_size int default null,
  p_own_hold_token_hash text default null,
  p_ignore_reservation_id uuid default null
)
returns table (
  table_id uuid,
  state text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with occupancy as (
    select
      a.table_id,
      bool_or(a.kind = 'block')                                              as has_block,
      bool_or(a.kind = 'reservation')                                        as has_reservation,
      bool_or(a.kind = 'hold' and a.hold_expires_at > now()
              and (p_own_hold_token_hash is null
                   or a.hold_token_hash is distinct from p_own_hold_token_hash)) as has_other_hold,
      bool_or(a.kind = 'hold' and a.hold_expires_at > now()
              and a.hold_token_hash = p_own_hold_token_hash)                 as has_own_hold
    from table_allocations a
    where a.venue_id = p_venue_id
      and a.status = 'active'
      and a.starts_at < p_ends_at
      and a.ends_at   > p_starts_at
      and (p_ignore_reservation_id is null
           or a.reservation_id is distinct from p_ignore_reservation_id)
      -- An expired-but-not-yet-swept hold does not occupy anything.
      and (a.kind <> 'hold' or a.hold_expires_at > now())
    group by a.table_id
  ),
  area_block as (
    select da.id as area_id,
           exists (
             select 1 from service_exceptions se
             where se.venue_id = p_venue_id
               and se.dining_area_id = da.id
               and se.kind in ('area_closed', 'private_event', 'closure')
               and se.starts_at < p_ends_at
               and se.ends_at   > p_starts_at
           ) as blocked
    from dining_areas da
    where da.venue_id = p_venue_id
  )
  select
    t.id,
    case
      when not t.is_active                                then 'inactive'
      when not da.is_active or ab.blocked                 then 'area_closed'
      when coalesce(o.has_own_hold, false)                then 'held_by_you'
      when coalesce(o.has_block, false)                   then 'blocked'
      when coalesce(o.has_reservation, false)             then 'reserved'
      when coalesce(o.has_other_hold, false)              then 'held'
      when p_party_size is not null and p_party_size > t.max_capacity then 'too_small'
      when p_party_size is not null and p_party_size < t.min_capacity then 'too_large'
      else 'available'
    end
  from restaurant_tables t
  join dining_areas da on da.id = t.dining_area_id
  left join area_block ab on ab.area_id = t.dining_area_id
  left join occupancy  o  on o.table_id = t.id
  where t.venue_id = p_venue_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Create a temporary hold.
--
-- 1. venue and table exist and are active
-- 2. capacity fits the party
-- 3. inside opening hours, area open
-- 4. lead time and horizon
-- 5. stale holds on this table are expired first
-- 6. insert an active allocation
-- 7. the exclusion constraint decides the race; a loser gets a generic
--    'table_unavailable' and learns nothing about whoever won.
-- ---------------------------------------------------------------------------
create or replace function gg_create_hold(
  p_venue_id uuid,
  p_table_id uuid,
  p_starts_at timestamptz,
  p_party_size int,
  p_hold_token_hash text,
  p_hold_session_hash text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings   reservation_settings%rowtype;
  v_table      restaurant_tables%rowtype;
  v_ends_at    timestamptz;
  v_occ_end    timestamptz;
  v_reason     text;
  v_expires_at timestamptz;
  v_id         uuid;
begin
  select * into v_settings from reservation_settings where venue_id = p_venue_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'settings_missing');
  end if;

  select * into v_table
    from restaurant_tables
   where id = p_table_id and venue_id = p_venue_id and is_active;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'table_unavailable');
  end if;

  if p_party_size < v_table.min_capacity or p_party_size > v_table.max_capacity then
    return jsonb_build_object('ok', false, 'code', 'capacity_mismatch');
  end if;

  if p_party_size > v_settings.max_online_party_size then
    return jsonb_build_object('ok', false, 'code', 'party_too_large');
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_settings.default_duration_minutes);
  v_occ_end := v_ends_at + make_interval(mins => v_settings.turnaround_minutes);

  v_reason := gg_validate_booking_window(
    p_venue_id, p_starts_at, v_ends_at, v_table.dining_area_id, true
  );
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'code', v_reason);
  end if;

  perform gg_expire_stale_holds(p_venue_id, p_table_id);

  v_expires_at := now() + make_interval(secs => v_settings.hold_duration_seconds);

  begin
    insert into table_allocations (
      venue_id, table_id, kind, status, starts_at, ends_at,
      hold_token_hash, hold_session_hash, hold_expires_at
    ) values (
      p_venue_id, p_table_id, 'hold', 'active', p_starts_at, v_occ_end,
      p_hold_token_hash, p_hold_session_hash, v_expires_at
    )
    returning id into v_id;
  exception
    when exclusion_violation then
      return jsonb_build_object('ok', false, 'code', 'table_unavailable');
    when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'duplicate_hold');
  end;

  return jsonb_build_object(
    'ok', true,
    'allocation_id', v_id,
    'table_id', p_table_id,
    'table_code', v_table.code,
    'dining_area_id', v_table.dining_area_id,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at,
    'occupancy_ends_at', v_occ_end,
    'expires_at', v_expires_at,
    'server_now', now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Release a hold the guest still owns.
-- ---------------------------------------------------------------------------
create or replace function gg_release_hold(
  p_hold_token_hash text,
  p_hold_session_hash text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  update table_allocations
     set status = 'released', released_at = now()
   where kind = 'hold'
     and status = 'active'
     and hold_token_hash = p_hold_token_hash
     and hold_session_hash = p_hold_session_hash;
  get diagnostics v_count = row_count;
  -- Releasing an already-released hold is not an error; the guest's intent is
  -- satisfied either way and saying otherwise would leak whether it existed.
  return jsonb_build_object('ok', true, 'released', v_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- Turn a hold into a confirmed reservation.
--
-- The whole thing — reservation row, allocation conversion, outbox entry, audit
-- entry — commits together or not at all. Re-submitting the same idempotency
-- key returns the reservation that already exists instead of making a second.
-- ---------------------------------------------------------------------------
create or replace function gg_confirm_reservation(
  p_venue_id uuid,
  p_hold_token_hash text,
  p_hold_session_hash text,
  p_guest jsonb,
  p_management_token_hash text,
  p_management_token_expires_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_alloc      table_allocations%rowtype;
  v_settings   reservation_settings%rowtype;
  v_table      restaurant_tables%rowtype;
  v_existing   reservations%rowtype;
  v_reason     text;
  v_ends_at    timestamptz;
  v_code       text;
  v_res_id     uuid;
  v_attempt    int := 0;
begin
  -- Idempotent retry: the browser resent, or a proxy did.
  if p_idempotency_key is not null then
    select * into v_existing
      from reservations
     where venue_id = p_venue_id and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'reservation_id', v_existing.id,
        'confirmation_code', v_existing.confirmation_code,
        'starts_at', v_existing.starts_at,
        'ends_at', v_existing.ends_at
      );
    end if;
  end if;

  select * into v_settings from reservation_settings where venue_id = p_venue_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'settings_missing');
  end if;

  select * into v_alloc
    from table_allocations
   where hold_token_hash = p_hold_token_hash
     and kind = 'hold'
     and venue_id = p_venue_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'hold_not_found');
  end if;

  if v_alloc.hold_session_hash is distinct from p_hold_session_hash then
    -- Deliberately the same code as "not found": a caller with the wrong
    -- session must not learn that the token is real.
    return jsonb_build_object('ok', false, 'code', 'hold_not_found');
  end if;

  if v_alloc.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'hold_expired');
  end if;

  if v_alloc.hold_expires_at <= now() then
    update table_allocations
       set status = 'expired', released_at = now()
     where id = v_alloc.id;
    return jsonb_build_object('ok', false, 'code', 'hold_expired');
  end if;

  select * into v_table from restaurant_tables where id = v_alloc.table_id;
  if not found or not v_table.is_active then
    return jsonb_build_object('ok', false, 'code', 'table_unavailable');
  end if;

  if (p_guest->>'party_size')::int < v_table.min_capacity
     or (p_guest->>'party_size')::int > v_table.max_capacity then
    return jsonb_build_object('ok', false, 'code', 'capacity_mismatch');
  end if;

  v_ends_at := v_alloc.ends_at - make_interval(mins => v_settings.turnaround_minutes);

  -- Rules are re-checked at commit time, not trusted from when the hold was made.
  v_reason := gg_validate_booking_window(
    p_venue_id, v_alloc.starts_at, v_ends_at, v_table.dining_area_id, false
  );
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'code', v_reason);
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := gg_generate_confirmation_code();
    begin
      insert into reservations (
        venue_id, confirmation_code, status, source,
        starts_at, ends_at, occupancy_ends_at, party_size,
        guest_first_name, guest_last_name, guest_email, guest_phone_e164,
        locale, special_requests,
        privacy_accepted_at, marketing_consent,
        management_token_hash, management_token_expires_at,
        idempotency_key, confirmed_at
      ) values (
        p_venue_id, v_code, 'confirmed', coalesce((p_guest->>'source')::reservation_source, 'website'),
        v_alloc.starts_at, v_ends_at, v_alloc.ends_at, (p_guest->>'party_size')::int,
        p_guest->>'first_name', p_guest->>'last_name',
        nullif(p_guest->>'email', ''), p_guest->>'phone_e164',
        coalesce(p_guest->>'locale', 'pl'), nullif(p_guest->>'special_requests', ''),
        now(), coalesce((p_guest->>'marketing_consent')::boolean, false),
        p_management_token_hash, p_management_token_expires_at,
        p_idempotency_key, now()
      )
      returning id into v_res_id;
      exit;
    exception when unique_violation then
      -- Either the confirmation code collided (retry) or the idempotency key
      -- was taken by a concurrent identical submission (return that one).
      if v_attempt >= 6 then
        select * into v_existing
          from reservations
         where venue_id = p_venue_id and idempotency_key = p_idempotency_key;
        if found then
          return jsonb_build_object(
            'ok', true, 'idempotent', true,
            'reservation_id', v_existing.id,
            'confirmation_code', v_existing.confirmation_code,
            'starts_at', v_existing.starts_at,
            'ends_at', v_existing.ends_at
          );
        end if;
        return jsonb_build_object('ok', false, 'code', 'code_generation_failed');
      end if;
    end;
  end loop;

  -- Convert the hold in place. Same row, same range: the exclusion constraint
  -- never compares a row against itself, so this cannot self-conflict, and the
  -- table is never momentarily free between the hold and the reservation.
  update table_allocations
     set kind = 'reservation',
         reservation_id = v_res_id,
         hold_token_hash = null,
         hold_session_hash = null,
         hold_expires_at = null
   where id = v_alloc.id;

  insert into notification_outbox (
    venue_id, reservation_id, type, channel, recipient, locale, template_data
  ) values (
    p_venue_id, v_res_id, 'reservation_confirmation', 'sms',
    p_guest->>'phone_e164', coalesce(p_guest->>'locale', 'pl'),
    jsonb_build_object(
      'confirmation_code', v_code,
      'starts_at', v_alloc.starts_at,
      'party_size', (p_guest->>'party_size')::int,
      'table_code', v_table.code,
      'first_name', p_guest->>'first_name'
    )
  );

  insert into audit_log (venue_id, actor_label, action, entity_type, entity_id, payload)
  values (
    p_venue_id, 'guest', 'reservation.created', 'reservation', v_res_id::text,
    jsonb_build_object(
      'source', coalesce(p_guest->>'source', 'website'),
      'confirmation_code', v_code,
      'table_code', v_table.code,
      'party_size', (p_guest->>'party_size')::int,
      'starts_at', v_alloc.starts_at
    )
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'reservation_id', v_res_id,
    'confirmation_code', v_code,
    'starts_at', v_alloc.starts_at,
    'ends_at', v_ends_at,
    'table_code', v_table.code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff-created reservation: telephone booking or walk-in.
--
-- Takes a table directly rather than a hold. Same constraint, same validation,
-- with the lead-time rule relaxed (`p_enforce_lead_time = false`) because the
-- guest is already standing there.
-- ---------------------------------------------------------------------------
create or replace function gg_create_staff_reservation(
  p_venue_id uuid,
  p_actor_id uuid,
  p_table_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes int,
  p_guest jsonb,
  p_source reservation_source,
  p_status reservation_status,
  p_management_token_hash text default null,
  p_management_token_expires_at timestamptz default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings reservation_settings%rowtype;
  v_table    restaurant_tables%rowtype;
  v_existing reservations%rowtype;
  v_ends_at  timestamptz;
  v_occ_end  timestamptz;
  v_reason   text;
  v_code     text;
  v_res_id   uuid;
  v_attempt  int := 0;
begin
  if p_idempotency_key is not null then
    select * into v_existing
      from reservations where venue_id = p_venue_id and idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('ok', true, 'idempotent', true,
        'reservation_id', v_existing.id, 'confirmation_code', v_existing.confirmation_code);
    end if;
  end if;

  select * into v_settings from reservation_settings where venue_id = p_venue_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'settings_missing');
  end if;

  select * into v_table
    from restaurant_tables where id = p_table_id and venue_id = p_venue_id and is_active;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'table_unavailable');
  end if;

  if (p_guest->>'party_size')::int > v_table.max_capacity then
    return jsonb_build_object('ok', false, 'code', 'capacity_mismatch');
  end if;

  v_ends_at := p_starts_at
    + make_interval(mins => coalesce(p_duration_minutes, v_settings.default_duration_minutes));
  v_occ_end := v_ends_at + make_interval(mins => v_settings.turnaround_minutes);

  v_reason := gg_validate_booking_window(
    p_venue_id, p_starts_at, v_ends_at, v_table.dining_area_id, false
  );
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'code', v_reason);
  end if;

  perform gg_expire_stale_holds(p_venue_id, p_table_id);

  loop
    v_attempt := v_attempt + 1;
    v_code := gg_generate_confirmation_code();
    begin
      insert into reservations (
        venue_id, confirmation_code, status, source,
        starts_at, ends_at, occupancy_ends_at, party_size,
        guest_first_name, guest_last_name, guest_email, guest_phone_e164,
        locale, special_requests, privacy_accepted_at, marketing_consent,
        management_token_hash, management_token_expires_at,
        idempotency_key, created_by,
        confirmed_at, seated_at
      ) values (
        p_venue_id, v_code, p_status, p_source,
        p_starts_at, v_ends_at, v_occ_end, (p_guest->>'party_size')::int,
        p_guest->>'first_name', p_guest->>'last_name',
        nullif(p_guest->>'email', ''), p_guest->>'phone_e164',
        coalesce(p_guest->>'locale', 'pl'), nullif(p_guest->>'special_requests', ''),
        case when (p_guest->>'privacy_accepted')::boolean then now() else null end,
        coalesce((p_guest->>'marketing_consent')::boolean, false),
        p_management_token_hash, p_management_token_expires_at,
        p_idempotency_key, p_actor_id,
        case when p_status in ('confirmed', 'seated') then now() end,
        case when p_status = 'seated' then now() end
      )
      returning id into v_res_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 6 then
        return jsonb_build_object('ok', false, 'code', 'code_generation_failed');
      end if;
    end;
  end loop;

  begin
    insert into table_allocations (
      venue_id, table_id, reservation_id, kind, status, starts_at, ends_at, created_by
    ) values (
      p_venue_id, p_table_id, v_res_id, 'reservation', 'active', p_starts_at, v_occ_end, p_actor_id
    );
  exception when exclusion_violation then
    -- Undo the reservation: without an allocation it would be a booking that
    -- occupies nothing, which is worse than no booking at all.
    delete from reservations where id = v_res_id;
    return jsonb_build_object('ok', false, 'code', 'table_unavailable');
  end;

  insert into notification_outbox (
    venue_id, reservation_id, type, channel, recipient, locale, template_data
  ) values (
    p_venue_id, v_res_id, 'reservation_confirmation', 'sms',
    p_guest->>'phone_e164', coalesce(p_guest->>'locale', 'pl'),
    jsonb_build_object(
      'confirmation_code', v_code,
      'starts_at', p_starts_at,
      'party_size', (p_guest->>'party_size')::int,
      'table_code', v_table.code,
      'first_name', p_guest->>'first_name'
    )
  );

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (
    p_venue_id, p_actor_id, 'staff', 'reservation.created', 'reservation', v_res_id::text,
    jsonb_build_object('source', p_source, 'table_code', v_table.code,
                       'party_size', (p_guest->>'party_size')::int, 'starts_at', p_starts_at)
  );

  return jsonb_build_object(
    'ok', true, 'idempotent', false,
    'reservation_id', v_res_id, 'confirmation_code', v_code,
    'starts_at', p_starts_at, 'ends_at', v_ends_at, 'table_code', v_table.code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reschedule and/or move a reservation.
--
-- One function, because moving a table and moving a time are the same write
-- and doing them separately would open a window where the booking is briefly
-- somewhere it should not be. Conflict handling is identical to booking.
-- ---------------------------------------------------------------------------
create or replace function gg_reschedule_reservation(
  p_reservation_id uuid,
  p_actor_id uuid,
  p_new_starts_at timestamptz default null,
  p_new_table_id uuid default null,
  p_new_duration_minutes int default null,
  p_new_party_size int default null,
  p_enforce_lead_time boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_res      reservations%rowtype;
  v_alloc    table_allocations%rowtype;
  v_settings reservation_settings%rowtype;
  v_table    restaurant_tables%rowtype;
  v_starts   timestamptz;
  v_duration int;
  v_ends     timestamptz;
  v_occ_end  timestamptz;
  v_party    int;
  v_reason   text;
begin
  select * into v_res from reservations where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'reservation_not_found');
  end if;
  if v_res.status in ('cancelled', 'completed', 'no_show') then
    return jsonb_build_object('ok', false, 'code', 'reservation_closed');
  end if;

  select * into v_settings from reservation_settings where venue_id = v_res.venue_id;

  select * into v_alloc
    from table_allocations
   where reservation_id = p_reservation_id and status = 'active'
   order by created_at limit 1
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'allocation_missing');
  end if;

  v_starts   := coalesce(p_new_starts_at, v_res.starts_at);
  v_duration := coalesce(
    p_new_duration_minutes,
    (extract(epoch from (v_res.ends_at - v_res.starts_at)) / 60)::int
  );
  v_party    := coalesce(p_new_party_size, v_res.party_size);
  v_ends     := v_starts + make_interval(mins => v_duration);
  v_occ_end  := v_ends + make_interval(mins => v_settings.turnaround_minutes);

  select * into v_table
    from restaurant_tables
   where id = coalesce(p_new_table_id, v_alloc.table_id)
     and venue_id = v_res.venue_id and is_active;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'table_unavailable');
  end if;

  if v_party > v_table.max_capacity then
    return jsonb_build_object('ok', false, 'code', 'capacity_mismatch');
  end if;

  v_reason := gg_validate_booking_window(
    v_res.venue_id, v_starts, v_ends, v_table.dining_area_id, p_enforce_lead_time
  );
  if v_reason is not null then
    return jsonb_build_object('ok', false, 'code', v_reason);
  end if;

  perform gg_expire_stale_holds(v_res.venue_id, v_table.id);

  begin
    update table_allocations
       set table_id = v_table.id, starts_at = v_starts, ends_at = v_occ_end
     where id = v_alloc.id;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'code', 'table_unavailable');
  end;

  update reservations
     set starts_at = v_starts,
         ends_at = v_ends,
         occupancy_ends_at = v_occ_end,
         party_size = v_party
   where id = p_reservation_id;

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (
    v_res.venue_id, p_actor_id, case when p_actor_id is null then 'guest' else 'staff' end,
    case
      when p_new_table_id is not null and p_new_table_id <> v_alloc.table_id
        then 'reservation.table_changed'
      else 'reservation.time_changed'
    end,
    'reservation', p_reservation_id::text,
    jsonb_build_object(
      'from_starts_at', v_res.starts_at, 'to_starts_at', v_starts,
      'from_table_id', v_alloc.table_id, 'to_table_id', v_table.id,
      'to_table_code', v_table.code,
      'from_party_size', v_res.party_size, 'to_party_size', v_party
    )
  );

  insert into notification_outbox (
    venue_id, reservation_id, type, channel, recipient, locale, template_data
  ) values (
    v_res.venue_id, p_reservation_id, 'reservation_update', 'sms',
    v_res.guest_phone_e164, v_res.locale,
    jsonb_build_object(
      'confirmation_code', v_res.confirmation_code,
      'starts_at', v_starts,
      'party_size', v_party,
      'table_code', v_table.code,
      'first_name', v_res.guest_first_name
    )
  );

  return jsonb_build_object(
    'ok', true, 'reservation_id', p_reservation_id,
    'starts_at', v_starts, 'ends_at', v_ends,
    'table_id', v_table.id, 'table_code', v_table.code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancel. Releases the table in the same transaction, so the slot is bookable
-- again the instant the cancellation commits.
-- ---------------------------------------------------------------------------
create or replace function gg_cancel_reservation(
  p_reservation_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_by_staff boolean default false,
  p_notify boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_res reservations%rowtype;
begin
  select * into v_res from reservations where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'reservation_not_found');
  end if;
  if v_res.status = 'cancelled' then
    return jsonb_build_object('ok', true, 'idempotent', true,
      'reservation_id', p_reservation_id, 'confirmation_code', v_res.confirmation_code);
  end if;
  if v_res.status in ('completed', 'no_show') then
    return jsonb_build_object('ok', false, 'code', 'reservation_closed');
  end if;

  update reservations
     set status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = p_reason,
         cancelled_by_staff = p_by_staff
   where id = p_reservation_id;

  update table_allocations
     set status = 'cancelled', released_at = now()
   where reservation_id = p_reservation_id and status = 'active';

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (
    v_res.venue_id, p_actor_id, case when p_by_staff then 'staff' else 'guest' end,
    'reservation.cancelled', 'reservation', p_reservation_id::text,
    jsonb_build_object('reason', p_reason, 'starts_at', v_res.starts_at,
                       'confirmation_code', v_res.confirmation_code)
  );

  if p_notify then
    insert into notification_outbox (
      venue_id, reservation_id, type, channel, recipient, locale, template_data
    ) values (
      v_res.venue_id, p_reservation_id, 'reservation_cancellation', 'sms',
      v_res.guest_phone_e164, v_res.locale,
      jsonb_build_object(
        'confirmation_code', v_res.confirmation_code,
        'starts_at', v_res.starts_at,
        'party_size', v_res.party_size,
        'first_name', v_res.guest_first_name
      )
    );
  end if;

  return jsonb_build_object('ok', true, 'reservation_id', p_reservation_id,
    'confirmation_code', v_res.confirmation_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- Status transitions (seat, complete, no-show, confirm).
-- ---------------------------------------------------------------------------
create or replace function gg_set_reservation_status(
  p_reservation_id uuid,
  p_actor_id uuid,
  p_status reservation_status
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_res reservations%rowtype;
begin
  select * into v_res from reservations where id = p_reservation_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'reservation_not_found');
  end if;
  if p_status = 'cancelled' then
    return jsonb_build_object('ok', false, 'code', 'use_cancel_function');
  end if;

  update reservations
     set status = p_status,
         confirmed_at = case when p_status = 'confirmed' then coalesce(confirmed_at, now())
                             else confirmed_at end,
         seated_at    = case when p_status = 'seated'    then coalesce(seated_at, now())
                             else seated_at end,
         completed_at = case when p_status = 'completed' then coalesce(completed_at, now())
                             else completed_at end,
         no_show_at   = case when p_status = 'no_show'   then coalesce(no_show_at, now())
                             else no_show_at end
   where id = p_reservation_id;

  -- A table that is finished with is a table that can be sold again.
  if p_status in ('completed', 'no_show') then
    update table_allocations
       set ends_at = least(ends_at, now()), status = 'released', released_at = now()
     where reservation_id = p_reservation_id and status = 'active';
  end if;

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (
    v_res.venue_id, p_actor_id, 'staff', 'reservation.status_changed',
    'reservation', p_reservation_id::text,
    jsonb_build_object('from', v_res.status, 'to', p_status)
  );

  return jsonb_build_object('ok', true, 'reservation_id', p_reservation_id, 'status', p_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff table blocks. A block occupies a table exactly the way a booking does,
-- which is the point: nothing can be booked on top of it.
-- ---------------------------------------------------------------------------
create or replace function gg_create_block(
  p_venue_id uuid,
  p_actor_id uuid,
  p_table_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_ends_at <= p_starts_at then
    return jsonb_build_object('ok', false, 'code', 'invalid_window');
  end if;

  perform 1 from restaurant_tables where id = p_table_id and venue_id = p_venue_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'table_unavailable');
  end if;

  perform gg_expire_stale_holds(p_venue_id, p_table_id);

  begin
    insert into table_allocations (
      venue_id, table_id, kind, status, starts_at, ends_at, block_reason, created_by
    ) values (
      p_venue_id, p_table_id, 'block', 'active', p_starts_at, p_ends_at, p_reason, p_actor_id
    ) returning id into v_id;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'code', 'table_unavailable');
  end;

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (p_venue_id, p_actor_id, 'staff', 'table_block.created', 'table_allocation', v_id::text,
          jsonb_build_object('table_id', p_table_id, 'starts_at', p_starts_at,
                             'ends_at', p_ends_at, 'reason', p_reason));

  return jsonb_build_object('ok', true, 'allocation_id', v_id);
end;
$$;

create or replace function gg_remove_block(
  p_allocation_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_alloc table_allocations%rowtype;
begin
  select * into v_alloc from table_allocations where id = p_allocation_id and kind = 'block';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'block_not_found');
  end if;

  update table_allocations
     set status = 'released', released_at = now()
   where id = p_allocation_id and status = 'active';

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (v_alloc.venue_id, p_actor_id, 'staff', 'table_block.removed',
          'table_allocation', p_allocation_id::text,
          jsonb_build_object('table_id', v_alloc.table_id, 'reason', v_alloc.block_reason));

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Nothing here is reachable from a browser session.
-- ---------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'gg_service_windows(uuid, date)',
    'gg_expire_stale_holds(uuid, uuid)',
    'gg_validate_booking_window(uuid, timestamptz, timestamptz, uuid, boolean)',
    'gg_table_states(uuid, timestamptz, timestamptz, int, text, uuid)',
    'gg_create_hold(uuid, uuid, timestamptz, int, text, text)',
    'gg_release_hold(text, text)',
    'gg_confirm_reservation(uuid, text, text, jsonb, text, timestamptz, text)',
    'gg_create_staff_reservation(uuid, uuid, uuid, timestamptz, int, jsonb, reservation_source, reservation_status, text, timestamptz, text)',
    'gg_reschedule_reservation(uuid, uuid, timestamptz, uuid, int, int, boolean)',
    'gg_cancel_reservation(uuid, uuid, text, boolean, boolean)',
    'gg_set_reservation_status(uuid, uuid, reservation_status)',
    'gg_create_block(uuid, uuid, uuid, timestamptz, timestamptz, text)',
    'gg_remove_block(uuid, uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
exception when undefined_object then
  -- `anon` / `authenticated` / `service_role` only exist on Supabase. A plain
  -- Postgres used for integration tests simply skips the grants.
  null;
end $$;
