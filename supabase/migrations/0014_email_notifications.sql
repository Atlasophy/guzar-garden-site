-- =============================================================================
-- 0014 — reservation confirmation emails
--
-- notification_outbox.channel already had 'email' as a valid value (see 0001),
-- and reservations.guest_email has been collected since 0004. Nothing ever
-- enqueued an email row. This migration adds one email insert alongside each
-- existing SMS insert, guarded on the guest actually having given an address —
-- same outbox, same worker, same delivery guarantees, one more channel.
--
-- `create or replace function` requires the full body, so these four functions
-- are restated in full from 0007 with only the new email insert added.
-- =============================================================================

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

  if coalesce(nullif(p_guest->>'email', ''), '') <> '' then
    insert into notification_outbox (
      venue_id, reservation_id, type, channel, recipient, locale, template_data
    ) values (
      p_venue_id, v_res_id, 'reservation_confirmation', 'email',
      p_guest->>'email', coalesce(p_guest->>'locale', 'pl'),
      jsonb_build_object(
        'confirmation_code', v_code,
        'starts_at', v_alloc.starts_at,
        'party_size', (p_guest->>'party_size')::int,
        'table_code', v_table.code,
        'first_name', p_guest->>'first_name'
      )
    );
  end if;

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

  if coalesce(nullif(p_guest->>'email', ''), '') <> '' then
    insert into notification_outbox (
      venue_id, reservation_id, type, channel, recipient, locale, template_data
    ) values (
      p_venue_id, v_res_id, 'reservation_confirmation', 'email',
      p_guest->>'email', coalesce(p_guest->>'locale', 'pl'),
      jsonb_build_object(
        'confirmation_code', v_code,
        'starts_at', p_starts_at,
        'party_size', (p_guest->>'party_size')::int,
        'table_code', v_table.code,
        'first_name', p_guest->>'first_name'
      )
    );
  end if;

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

  if v_res.guest_email is not null then
    insert into notification_outbox (
      venue_id, reservation_id, type, channel, recipient, locale, template_data
    ) values (
      v_res.venue_id, p_reservation_id, 'reservation_update', 'email',
      v_res.guest_email, v_res.locale,
      jsonb_build_object(
        'confirmation_code', v_res.confirmation_code,
        'starts_at', v_starts,
        'party_size', v_party,
        'table_code', v_table.code,
        'first_name', v_res.guest_first_name
      )
    );
  end if;

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

    if v_res.guest_email is not null then
      insert into notification_outbox (
        venue_id, reservation_id, type, channel, recipient, locale, template_data
      ) values (
        v_res.venue_id, p_reservation_id, 'reservation_cancellation', 'email',
        v_res.guest_email, v_res.locale,
        jsonb_build_object(
          'confirmation_code', v_res.confirmation_code,
          'starts_at', v_res.starts_at,
          'party_size', v_res.party_size,
          'first_name', v_res.guest_first_name
        )
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'reservation_id', p_reservation_id,
    'confirmation_code', v_res.confirmation_code);
end;
$$;
