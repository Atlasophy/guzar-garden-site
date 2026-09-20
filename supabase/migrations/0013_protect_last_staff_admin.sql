-- Keep every venue recoverable even if two account changes arrive at once.
-- The API checks this first for a friendly translated error; the trigger is the
-- final boundary for concurrent requests and direct administrative SQL.

create or replace function gg_protect_last_active_admin()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  removes_active_admin boolean;
begin
  removes_active_admin := old.role = 'admin' and old.is_active and (
    tg_op = 'DELETE' or new.role <> 'admin' or not new.is_active
  );

  if not removes_active_admin then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Serialize this decision per venue, then read again after any earlier
  -- account change commits.
  perform pg_advisory_xact_lock(hashtextextended(old.venue_id::text, 0));

  if not exists (
    select 1
    from staff_profiles
    where venue_id = old.venue_id
      and id <> old.id
      and role = 'admin'
      and is_active
  ) then
    raise exception 'at least one active staff administrator is required'
      using errcode = '23514', constraint = 'staff_profiles_active_admin_required';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists staff_profiles_protect_last_admin on staff_profiles;
create trigger staff_profiles_protect_last_admin
before update of role, is_active or delete on staff_profiles
for each row execute function gg_protect_last_active_admin();
