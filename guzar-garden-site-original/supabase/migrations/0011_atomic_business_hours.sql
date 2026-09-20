-- Replace the weekly opening-hours schedule and its audit entry atomically.
create or replace function gg_replace_business_hours(
  p_venue_id uuid,
  p_actor_id uuid,
  p_hours jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_before jsonb;
  v_count int;
begin
  if not exists (
    select 1 from staff_profiles
     where id = p_actor_id
       and venue_id = p_venue_id
       and is_active
       and role in ('manager', 'admin')
  ) then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  select coalesce(jsonb_agg(to_jsonb(h) order by h.weekday, h.display_order), '[]'::jsonb)
    into v_before
    from business_hours h
   where h.venue_id = p_venue_id;

  delete from business_hours where venue_id = p_venue_id;

  insert into business_hours (
    venue_id, weekday, opens_at, closes_at, closes_next_day, display_order, is_active
  )
  select
    p_venue_id,
    h.weekday,
    h.opens_at::time,
    h.closes_at::time,
    h.closes_next_day,
    h.display_order,
    h.is_active
  from jsonb_to_recordset(coalesce(p_hours, '[]'::jsonb)) as h(
    weekday int,
    opens_at text,
    closes_at text,
    closes_next_day boolean,
    display_order int,
    is_active boolean
  );
  get diagnostics v_count = row_count;

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (
    p_venue_id,
    p_actor_id,
    'staff',
    'opening_hours.changed',
    'business_hours',
    p_venue_id::text,
    jsonb_build_object('before', v_before, 'after', coalesce(p_hours, '[]'::jsonb))
  );

  return jsonb_build_object('ok', true, 'updated', v_count);
end;
$$;

revoke all on function gg_replace_business_hours(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function gg_replace_business_hours(uuid, uuid, jsonb) to service_role;
