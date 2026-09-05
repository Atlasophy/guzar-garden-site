-- =============================================================================
-- 0010 — menu maintenance and outbox worker functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Permanent deletion of a menu item.
--
-- Archiving is the normal "remove". This is the escape hatch for a record that
-- was created by mistake, it is admin-only at the route layer, and it refuses
-- when the row is not safe to lose: a published item, or one that still owns a
-- storage object, is archived instead so nothing silently disappears.
-- ---------------------------------------------------------------------------
create or replace function gg_delete_menu_item(
  p_item_id uuid,
  p_actor_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_item menu_items%rowtype;
begin
  select * into v_item from menu_items where id = p_item_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'item_not_found');
  end if;

  if not p_force then
    if v_item.is_published and v_item.archived_at is null then
      return jsonb_build_object('ok', false, 'code', 'item_still_published');
    end if;
    if v_item.image_path is not null then
      return jsonb_build_object('ok', false, 'code', 'item_has_image');
    end if;
  end if;

  delete from menu_items where id = p_item_id;

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (
    v_item.venue_id, p_actor_id, 'staff', 'menu_item.deleted', 'menu_item', p_item_id::text,
    jsonb_build_object('slug', v_item.slug, 'name_pl', v_item.name_pl,
                       'price', v_item.price, 'forced', p_force)
  );

  return jsonb_build_object('ok', true, 'image_path', v_item.image_path);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reorder in one statement, so a drag-and-drop never leaves two dishes sharing
-- a position (or a request half-applied).
-- ---------------------------------------------------------------------------
create or replace function gg_reorder_menu_items(
  p_venue_id uuid,
  p_actor_id uuid,
  p_ordered_ids uuid[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated int;
begin
  update menu_items m
     set display_order = o.position
    from (
      select id, (ordinality - 1)::int as position
      from unnest(p_ordered_ids) with ordinality as t(id, ordinality)
    ) o
   where m.id = o.id and m.venue_id = p_venue_id;
  get diagnostics v_updated = row_count;

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (p_venue_id, p_actor_id, 'staff', 'menu_item.reordered', 'menu_item', null,
          jsonb_build_object('count', v_updated));

  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;

create or replace function gg_reorder_menu_categories(
  p_venue_id uuid,
  p_actor_id uuid,
  p_ordered_ids uuid[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated int;
begin
  update menu_categories c
     set display_order = o.position
    from (
      select id, (ordinality - 1)::int as position
      from unnest(p_ordered_ids) with ordinality as t(id, ordinality)
    ) o
   where c.id = o.id and c.venue_id = p_venue_id;
  get diagnostics v_updated = row_count;

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (p_venue_id, p_actor_id, 'staff', 'menu_category.reordered', 'menu_category', null,
          jsonb_build_object('count', v_updated));

  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;

-- ---------------------------------------------------------------------------
-- Outbox worker: claim due messages.
--
-- `for update skip locked` is what makes two workers (or a retry of the same
-- cron tick) safe: each row is handed to exactly one of them. Claimed rows move
-- to 'sending' with the attempt already counted, so a worker that dies mid-send
-- cannot leave a message to be retried forever.
-- ---------------------------------------------------------------------------
create or replace function gg_claim_due_notifications(p_limit int default 20)
returns setof notification_outbox
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with due as (
    select id
    from notification_outbox
    where status in ('pending', 'failed')
      and next_attempt_at <= now()
      and retry_count < 6
    order by next_attempt_at
    for update skip locked
    limit greatest(p_limit, 1)
  )
  update notification_outbox o
     set status = 'sending',
         retry_count = o.retry_count + 1
    from due
   where o.id = due.id
  returning o.*;
end;
$$;

-- ---------------------------------------------------------------------------
-- Record what the provider said. Exponential backoff on failure, capped.
-- ---------------------------------------------------------------------------
create or replace function gg_record_notification_result(
  p_id uuid,
  p_status notification_status,
  p_provider text,
  p_provider_message_id text,
  p_rendered_body text,
  p_error text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_row notification_outbox%rowtype;
begin
  select * into v_row from notification_outbox where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'notification_not_found');
  end if;

  update notification_outbox
     set status = p_status,
         provider = coalesce(p_provider, provider),
         provider_message_id = coalesce(p_provider_message_id, provider_message_id),
         rendered_body = coalesce(p_rendered_body, rendered_body),
         last_error = p_error,
         sent_at = case when p_status in ('sent', 'delivered') then coalesce(sent_at, now())
                        else sent_at end,
         delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
         -- 1, 2, 4, 8, 16, 32 minutes.
         next_attempt_at = case
           when p_status = 'failed'
             then now() + make_interval(mins => least(power(2, v_row.retry_count)::int, 32))
           else next_attempt_at
         end
   where id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Twilio delivery receipt. Keyed on the provider's message id, so a callback
-- that arrives twice (Twilio retries) changes nothing the second time.
-- ---------------------------------------------------------------------------
create or replace function gg_apply_provider_status(
  p_provider_message_id text,
  p_status notification_status,
  p_error text default null
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
  update notification_outbox
     set status = p_status,
         delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now())
                             else delivered_at end,
         last_error = coalesce(p_error, last_error),
         -- An undelivered message is a real operational problem, but retrying a
         -- carrier rejection just burns money; the dashboard surfaces it instead.
         next_attempt_at = next_attempt_at
   where provider_message_id = p_provider_message_id
   returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', false, 'code', 'unknown_message');
  end if;
  return jsonb_build_object('ok', true, 'notification_id', v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Queue a fresh attempt for a message staff decided to resend.
-- ---------------------------------------------------------------------------
create or replace function gg_retry_notification(p_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_row notification_outbox%rowtype;
begin
  select * into v_row from notification_outbox where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'notification_not_found');
  end if;

  update notification_outbox
     set status = 'pending', next_attempt_at = now(), retry_count = 0, last_error = null
   where id = p_id;

  insert into audit_log (venue_id, actor_id, actor_label, action, entity_type, entity_id, payload)
  values (v_row.venue_id, p_actor_id, 'staff', 'notification.resent', 'notification', p_id::text,
          jsonb_build_object('type', v_row.type, 'previous_status', v_row.status));

  return jsonb_build_object('ok', true);
end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'gg_delete_menu_item(uuid, uuid, boolean)',
    'gg_reorder_menu_items(uuid, uuid, uuid[])',
    'gg_reorder_menu_categories(uuid, uuid, uuid[])',
    'gg_claim_due_notifications(int)',
    'gg_record_notification_result(uuid, notification_status, text, text, text, text)',
    'gg_apply_provider_status(text, notification_status, text)',
    'gg_retry_notification(uuid, uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
exception when undefined_object then null;
end $$;
