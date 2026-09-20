-- =============================================================================
-- 0006 — notification outbox
--
-- The transactional outbox. A reservation commit writes the row that says "an
-- SMS is owed"; a separate worker sends it. That is what stops a Twilio outage
-- from rolling back a booking the guest has already been told is confirmed.
-- =============================================================================

create table if not exists notification_outbox (
  id                uuid primary key default gen_random_uuid(),
  venue_id          uuid not null references venues (id) on delete cascade,
  reservation_id    uuid references reservations (id) on delete cascade,

  type              notification_type    not null,
  channel           notification_channel not null default 'sms',
  recipient         text not null,               -- E.164 for sms
  locale            text not null default 'pl',

  -- Everything the template needs, so a message can still be rendered after the
  -- reservation has moved on. No secrets, no management token.
  template_data     jsonb not null default '{}'::jsonb,
  rendered_body     text,

  provider          text,                        -- 'twilio' | 'console'
  provider_message_id text,

  status            notification_status not null default 'pending',
  retry_count       int not null default 0,
  next_attempt_at   timestamptz not null default now(),
  last_error        text,                        -- already redacted by the caller

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  sent_at           timestamptz,
  delivered_at      timestamptz,

  constraint notification_outbox_locale check (locale in ('pl', 'en', 'ru', 'uz')),
  constraint notification_outbox_retry check (retry_count >= 0)
);

drop trigger if exists notification_outbox_touch on notification_outbox;
create trigger notification_outbox_touch before update on notification_outbox
  for each row execute function gg_touch_updated_at();

-- The worker's claim query rides this index.
create index if not exists notification_outbox_due_idx
  on notification_outbox (next_attempt_at)
  where status in ('pending', 'failed');
create index if not exists notification_outbox_reservation_idx
  on notification_outbox (reservation_id, created_at desc);
create unique index if not exists notification_outbox_provider_msg_idx
  on notification_outbox (provider_message_id)
  where provider_message_id is not null;
-- What the dashboard's "failed notifications" panel reads.
create index if not exists notification_outbox_failed_idx
  on notification_outbox (venue_id, updated_at desc)
  where status in ('failed', 'undelivered');
