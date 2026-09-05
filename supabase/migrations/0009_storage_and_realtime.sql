-- =============================================================================
-- 0009 — Supabase Storage bucket, storage policies, Realtime publication
--
-- Everything in this file is Supabase-specific and guarded, so a plain
-- PostgreSQL used for integration testing skips it cleanly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- menu-images bucket
--
-- Public read (a menu photograph on a public menu is public), staff-only write.
-- The size and MIME limits are enforced here as well as in the upload route:
-- the route can be bypassed by a leaked session, the bucket cannot.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not present — skipping bucket setup (plain PostgreSQL).';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'menu-images', 'menu-images', true, 8388608,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
end $$;

do $$
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;

  -- Anyone may read a menu image.
  execute 'drop policy if exists menu_images_public_read on storage.objects';
  execute $p$
    create policy menu_images_public_read on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'menu-images')
  $p$;

  -- Only an active manager or admin may add, replace or remove one.
  execute 'drop policy if exists menu_images_staff_insert on storage.objects';
  execute $p$
    create policy menu_images_staff_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'menu-images' and gg_staff_at_least('manager'))
  $p$;

  execute 'drop policy if exists menu_images_staff_update on storage.objects';
  execute $p$
    create policy menu_images_staff_update on storage.objects
      for update to authenticated
      using (bucket_id = 'menu-images' and gg_staff_at_least('manager'))
      with check (bucket_id = 'menu-images' and gg_staff_at_least('manager'))
  $p$;

  execute 'drop policy if exists menu_images_staff_delete on storage.objects';
  execute $p$
    create policy menu_images_staff_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'menu-images' and gg_staff_at_least('manager'))
  $p$;
exception when others then
  raise notice 'Skipping storage policies: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime
--
-- Only the three tables the staff dashboard reacts to, and only for
-- authenticated subscribers — the RLS policies above are what actually decide
-- who receives a row, so an anonymous socket sees nothing.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication not present — skipping.';
    return;
  end if;

  begin
    execute 'alter publication supabase_realtime add table reservations';
  exception when duplicate_object then null; end;

  begin
    execute 'alter publication supabase_realtime add table table_allocations';
  exception when duplicate_object then null; end;

  begin
    execute 'alter publication supabase_realtime add table notification_outbox';
  exception when duplicate_object then null; end;
end $$;

-- Realtime needs the previous row image to evaluate RLS on UPDATE/DELETE.
alter table reservations       replica identity full;
alter table table_allocations  replica identity full;
alter table notification_outbox replica identity full;
