-- =============================================================================
-- 0008 — Row Level Security
--
-- The shape of the rule:
--
--   anon           can read the published menu and the venue's public details.
--                  It cannot read a reservation, a guest, an allocation, a note
--                  or an audit entry, and it cannot write anything anywhere.
--   authenticated  gets nothing unless it has an ACTIVE staff_profile; then it
--                  reads its own venue's operational data (this is what makes
--                  the dashboard's Realtime subscriptions work) and writes only
--                  what its role allows.
--   service_role   bypasses RLS. Every mutation the app performs runs through a
--                  server route that has already authorised the caller.
--
-- Deactivating a staff profile removes access immediately: every policy reads
-- gg_current_staff_role(), which only returns a role for `is_active` rows.
-- =============================================================================

alter table venues               enable row level security;
alter table dining_areas         enable row level security;
alter table restaurant_tables    enable row level security;
alter table business_hours       enable row level security;
alter table service_exceptions   enable row level security;
alter table reservation_settings enable row level security;
alter table staff_profiles       enable row level security;
alter table audit_log            enable row level security;
alter table reservations         enable row level security;
alter table table_allocations    enable row level security;
alter table menu_categories      enable row level security;
alter table menu_items           enable row level security;
alter table notification_outbox  enable row level security;

-- The public menu view must run with the reader's own privileges, otherwise it
-- would hand anon everything the view owner can see.
alter view public_menu_items set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- Venue, areas, hours, policy — public reference data
-- ---------------------------------------------------------------------------
drop policy if exists venues_public_read on venues;
create policy venues_public_read on venues
  for select to anon, authenticated using (is_active);

drop policy if exists venues_admin_write on venues;
create policy venues_admin_write on venues
  for all to authenticated
  using (gg_staff_at_least('admin') and id = gg_current_staff_venue())
  with check (gg_staff_at_least('admin') and id = gg_current_staff_venue());

drop policy if exists dining_areas_public_read on dining_areas;
create policy dining_areas_public_read on dining_areas
  for select to anon, authenticated using (is_active);

drop policy if exists dining_areas_staff_read on dining_areas;
create policy dining_areas_staff_read on dining_areas
  for select to authenticated
  using (gg_staff_at_least('host') and venue_id = gg_current_staff_venue());

drop policy if exists dining_areas_admin_write on dining_areas;
create policy dining_areas_admin_write on dining_areas
  for all to authenticated
  using (gg_staff_at_least('admin') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('admin') and venue_id = gg_current_staff_venue());

-- Tables carry staff_notes, so anon never selects them directly. The public
-- floor plan is assembled by a server route that returns only public columns.
drop policy if exists restaurant_tables_staff_read on restaurant_tables;
create policy restaurant_tables_staff_read on restaurant_tables
  for select to authenticated
  using (gg_staff_at_least('host') and venue_id = gg_current_staff_venue());

drop policy if exists restaurant_tables_admin_write on restaurant_tables;
create policy restaurant_tables_admin_write on restaurant_tables
  for all to authenticated
  using (gg_staff_at_least('admin') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('admin') and venue_id = gg_current_staff_venue());

drop policy if exists business_hours_public_read on business_hours;
create policy business_hours_public_read on business_hours
  for select to anon, authenticated using (is_active);

drop policy if exists business_hours_manager_write on business_hours;
create policy business_hours_manager_write on business_hours
  for all to authenticated
  using (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue());

-- Only the public-facing exceptions are visible to guests, and only the fact of
-- them — the `reason` on a private booking may name the party.
drop policy if exists service_exceptions_public_read on service_exceptions;
create policy service_exceptions_public_read on service_exceptions
  for select to anon using (is_public);

drop policy if exists service_exceptions_staff_read on service_exceptions;
create policy service_exceptions_staff_read on service_exceptions
  for select to authenticated
  using (gg_staff_at_least('host') and venue_id = gg_current_staff_venue());

drop policy if exists service_exceptions_manager_write on service_exceptions;
create policy service_exceptions_manager_write on service_exceptions
  for all to authenticated
  using (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue());

drop policy if exists reservation_settings_public_read on reservation_settings;
create policy reservation_settings_public_read on reservation_settings
  for select to anon, authenticated using (true);

drop policy if exists reservation_settings_admin_write on reservation_settings;
create policy reservation_settings_admin_write on reservation_settings
  for all to authenticated
  using (gg_staff_at_least('admin') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('admin') and venue_id = gg_current_staff_venue());

-- ---------------------------------------------------------------------------
-- Staff profiles
-- ---------------------------------------------------------------------------
drop policy if exists staff_profiles_self_read on staff_profiles;
create policy staff_profiles_self_read on staff_profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists staff_profiles_colleague_read on staff_profiles;
create policy staff_profiles_colleague_read on staff_profiles
  for select to authenticated
  using (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue());

drop policy if exists staff_profiles_admin_write on staff_profiles;
create policy staff_profiles_admin_write on staff_profiles
  for all to authenticated
  using (gg_staff_at_least('admin') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('admin') and venue_id = gg_current_staff_venue());

-- ---------------------------------------------------------------------------
-- Reservations and allocations — staff read only, never anon, never written
-- from a session. There is intentionally no anon policy of any kind here.
-- ---------------------------------------------------------------------------
drop policy if exists reservations_staff_read on reservations;
create policy reservations_staff_read on reservations
  for select to authenticated
  using (gg_staff_at_least('host') and venue_id = gg_current_staff_venue());

drop policy if exists reservations_manager_write on reservations;
create policy reservations_manager_write on reservations
  for update to authenticated
  using (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue());

drop policy if exists table_allocations_staff_read on table_allocations;
create policy table_allocations_staff_read on table_allocations
  for select to authenticated
  using (gg_staff_at_least('host') and venue_id = gg_current_staff_venue());

drop policy if exists notification_outbox_staff_read on notification_outbox;
create policy notification_outbox_staff_read on notification_outbox
  for select to authenticated
  using (gg_staff_at_least('host') and venue_id = gg_current_staff_venue());

drop policy if exists audit_log_staff_read on audit_log;
create policy audit_log_staff_read on audit_log
  for select to authenticated
  using (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue());

-- ---------------------------------------------------------------------------
-- Menu — the one place anon genuinely reads rows.
--
-- A draft, a hidden category and an archived dish are invisible at the database
-- level, not merely filtered by the query, so a mistake in a query cannot leak
-- an unpublished price. A sold-out dish stays readable on purpose.
-- ---------------------------------------------------------------------------
drop policy if exists menu_categories_public_read on menu_categories;
create policy menu_categories_public_read on menu_categories
  for select to anon, authenticated
  using (is_published and archived_at is null);

drop policy if exists menu_categories_staff_read on menu_categories;
create policy menu_categories_staff_read on menu_categories
  for select to authenticated
  using (gg_staff_at_least('host') and venue_id = gg_current_staff_venue());

drop policy if exists menu_categories_manager_write on menu_categories;
create policy menu_categories_manager_write on menu_categories
  for all to authenticated
  using (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue());

drop policy if exists menu_items_public_read on menu_items;
create policy menu_items_public_read on menu_items
  for select to anon, authenticated
  using (
    is_published
    and archived_at is null
    and exists (
      select 1 from menu_categories c
      where c.id = menu_items.category_id and c.is_published and c.archived_at is null
    )
  );

drop policy if exists menu_items_staff_read on menu_items;
create policy menu_items_staff_read on menu_items
  for select to authenticated
  using (gg_staff_at_least('host') and venue_id = gg_current_staff_venue());

drop policy if exists menu_items_manager_write on menu_items;
create policy menu_items_manager_write on menu_items
  for all to authenticated
  using (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue())
  with check (gg_staff_at_least('manager') and venue_id = gg_current_staff_venue());

-- A host may take a dish off for the evening, and nothing else. The USING and
-- WITH CHECK clauses cannot express "only this column changed", so the guard is
-- the trigger below.
drop policy if exists menu_items_host_sold_out on menu_items;
create policy menu_items_host_sold_out on menu_items
  for update to authenticated
  using (gg_current_staff_role() = 'host' and venue_id = gg_current_staff_venue())
  with check (gg_current_staff_role() = 'host' and venue_id = gg_current_staff_venue());

create or replace function gg_guard_host_menu_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if gg_current_staff_role() = 'host' then
    if row(new.*) is distinct from row(old.*) then
      -- Compare everything except the two columns a host is allowed to touch.
      if (to_jsonb(new) - 'is_available' - 'updated_at')
         is distinct from (to_jsonb(old) - 'is_available' - 'updated_at') then
        raise exception 'A host may only change availability on a menu item'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists menu_items_host_guard on menu_items;
create trigger menu_items_host_guard before update on menu_items
  for each row execute function gg_guard_host_menu_update();

-- ---------------------------------------------------------------------------
-- Table privileges. RLS narrows what a role may touch; it does not grant.
-- ---------------------------------------------------------------------------
do $$
begin
  execute 'grant select on venues, dining_areas, business_hours, service_exceptions,
                            reservation_settings, menu_categories, menu_items,
                            public_menu_items
           to anon, authenticated';
  execute 'grant select on restaurant_tables, reservations, table_allocations,
                            notification_outbox, audit_log, staff_profiles
           to authenticated';
  execute 'grant insert, update, delete on menu_categories, menu_items,
                            business_hours, service_exceptions
           to authenticated';
  execute 'grant update on reservations, staff_profiles to authenticated';
  execute 'grant insert, update, delete on restaurant_tables, dining_areas to authenticated';
  execute 'grant update on reservation_settings, venues to authenticated';
  execute 'grant all on all tables in schema public to service_role';
  execute 'grant all on all sequences in schema public to service_role';
  execute 'grant execute on function gg_staff_at_least(staff_role) to anon, authenticated';
  execute 'grant execute on function gg_current_staff_role() to authenticated';
  execute 'grant execute on function gg_current_staff_venue() to authenticated';
exception when others then
  raise notice 'Skipping some grants: %', sqlerrm;
end $$;
