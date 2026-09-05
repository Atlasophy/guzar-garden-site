-- =============================================================================
-- Development seed — Guzar Garden
--
-- Safe to run repeatedly: every insert is idempotent on a natural key.
--
-- ⚠ THE FLOOR PLAN IS AN ESTIMATE.
-- No measured drawing was supplied. The areas, table counts, capacities and
-- coordinates below were inferred from the venue photographs (a long
-- festoon-lit main room with a marble service counter down one side; a
-- whitewashed alcove with banquette seating and patterned cushions) and from
-- the website's own copy ("a big dining room, a garden by Skaryszewski Park, a
-- fireplace for colder evenings"). They are plausible, not surveyed. Every
-- number lives in the database precisely so the restaurant can correct it in
-- /staff/settings without a deploy. See README ▸ Assumptions.
--
-- ⚠ NO REAL GUEST DATA. Sample bookings use `.example` addresses and telephone
-- numbers in the ITU-reserved +999 range, which cannot reach anybody.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Venue
-- ---------------------------------------------------------------------------
insert into venues (
  name, slug, timezone, address_line, postal_code, city, country_code,
  phone_e164, latitude, longitude, is_active
) values (
  'Guzar Garden', 'guzar-garden', 'Europe/Warsaw',
  'al. Zieleniecka 6/8', '03-727', 'Warszawa', 'PL',
  '+48570088888', 52.244100, 21.049700, true
)
on conflict (slug) do update set
  name = excluded.name,
  timezone = excluded.timezone,
  address_line = excluded.address_line,
  postal_code = excluded.postal_code,
  city = excluded.city,
  phone_e164 = excluded.phone_e164,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

-- ---------------------------------------------------------------------------
-- Opening hours — 09:00 to midnight, every day.
--
-- Midnight is stored as 00:00 with closes_next_day = true rather than as
-- "24:00", which is not a time. The schema allows several rows per weekday, so
-- a split lunch/dinner service later is two rows, not a code change.
-- ---------------------------------------------------------------------------
do $$
declare
  v_venue uuid;
  d int;
begin
  select id into v_venue from venues where slug = 'guzar-garden';

  delete from business_hours where venue_id = v_venue;
  for d in 0..6 loop
    insert into business_hours (venue_id, weekday, opens_at, closes_at, closes_next_day, display_order)
    values (v_venue, d, '09:00', '00:00', true, 0);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Booking policy
-- ---------------------------------------------------------------------------
do $$
declare v_venue uuid;
begin
  select id into v_venue from venues where slug = 'guzar-garden';

  insert into reservation_settings (
    venue_id, slot_interval_minutes, default_duration_minutes, turnaround_minutes,
    min_notice_minutes, booking_horizon_days, max_online_party_size,
    hold_duration_seconds, cancellation_cutoff_minutes,
    cancellation_policy_pl, cancellation_policy_en,
    cancellation_policy_ru, cancellation_policy_uz
  ) values (
    v_venue, 15, 120, 15, 30, 90, 12, 300, 120,
    'Rezerwację można bezpłatnie odwołać lub zmienić do 2 godzin przed wizytą. Później prosimy o telefon.',
    'You can cancel or change your booking free of charge up to 2 hours before it starts. After that, please call us.',
    'Бронь можно бесплатно отменить или изменить не позднее чем за 2 часа до визита. Позже — позвоните нам.',
    'Bronni tashrifdan 2 soat oldin bepul bekor qilish yoki o''zgartirish mumkin. Undan keyin bizga qo''ng''iroq qiling.'
  )
  on conflict (venue_id) do update set
    slot_interval_minutes = excluded.slot_interval_minutes,
    default_duration_minutes = excluded.default_duration_minutes,
    turnaround_minutes = excluded.turnaround_minutes,
    min_notice_minutes = excluded.min_notice_minutes,
    booking_horizon_days = excluded.booking_horizon_days,
    max_online_party_size = excluded.max_online_party_size,
    hold_duration_seconds = excluded.hold_duration_seconds,
    cancellation_cutoff_minutes = excluded.cancellation_cutoff_minutes,
    cancellation_policy_pl = excluded.cancellation_policy_pl,
    cancellation_policy_en = excluded.cancellation_policy_en,
    cancellation_policy_ru = excluded.cancellation_policy_ru,
    cancellation_policy_uz = excluded.cancellation_policy_uz;
end $$;

-- ---------------------------------------------------------------------------
-- Dining areas
--
-- Plan coordinates are metres. The origin (0,0) is the inside face of the
-- entrance wall, +X runs right along the frontage and +Z runs into the
-- building. The 3D scene reads these straight out of the database.
-- ---------------------------------------------------------------------------
do $$
declare v_venue uuid;
begin
  select id into v_venue from venues where slug = 'guzar-garden';

  insert into dining_areas (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    floor_x, floor_z, floor_width, floor_depth, floor_color, is_outdoor, display_order
  ) values
  (
    v_venue, 'main-hall',
    'Sala główna', 'Main hall', 'Основной зал', 'Asosiy zal',
    'Długa sala z lampkami pod sufitem i kamiennym barem.',
    'The long room, festoon lights overhead and the stone counter down one side.',
    'Длинный зал с гирляндами под потолком и каменной барной стойкой.',
    'Shift chiroqlari va tosh bar bilan uzun zal.',
    0, 0, 14.0, 9.0, '#123a28', false, 0
  ),
  (
    v_venue, 'chaikhana',
    'Czajchana', 'Chaikhana', 'Чайхана', 'Choyxona',
    'Bielone ściany, niskie ławy i poduszki — kąt do długiej herbaty.',
    'Whitewashed walls, low banquettes and cushions — the corner for a long pot of tea.',
    'Белёные стены, низкие лавки и подушки — угол для долгого чаепития.',
    'Oqlangan devorlar, past kursilar va yostiqlar — uzoq choy uchun burchak.',
    14.5, 0, 6.5, 9.0, '#15412c', false, 1
  ),
  (
    v_venue, 'fireplace',
    'Sala z kominkiem', 'Fireplace room', 'Зал с камином', 'Kaminli zal',
    'Ciepła sala na jesienne i zimowe wieczory.',
    'A warm room for autumn and winter evenings.',
    'Тёплый зал для осенних и зимних вечеров.',
    'Kuz va qish kechalari uchun issiq zal.',
    0, 9.5, 8.0, 6.0, '#17442f', false, 2
  ),
  (
    v_venue, 'garden',
    'Ogród', 'Garden', 'Сад', 'Hovli',
    'Stoliki na zewnątrz przy Parku Skaryszewskim. Sezonowo.',
    'Outdoor tables beside Skaryszewski Park. Seasonal.',
    'Столики на улице у парка Скарышевского. Сезонно.',
    'Skaryszewski bog''i yonida ochiq havoda stollar. Mavsumiy.',
    8.5, 9.5, 12.0, 6.0, '#0f3524', true, 3
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl, description_en = excluded.description_en,
    description_ru = excluded.description_ru, description_uz = excluded.description_uz,
    floor_x = excluded.floor_x, floor_z = excluded.floor_z,
    floor_width = excluded.floor_width, floor_depth = excluded.floor_depth,
    floor_color = excluded.floor_color, is_outdoor = excluded.is_outdoor,
    display_order = excluded.display_order;
end $$;

-- ---------------------------------------------------------------------------
-- Tables — 40 across four areas.
--
-- Numbering follows the area: T = main hall, C = chaikhana, F = fireplace,
-- G = garden. Capacities are a range, so a two-top is never offered to six
-- people and a twelve-seat banquet table is never given to a couple.
-- ---------------------------------------------------------------------------
do $$
declare
  v_venue uuid;
  v_main  uuid;
  v_chai  uuid;
  v_fire  uuid;
  v_gard  uuid;
begin
  select id into v_venue from venues where slug = 'guzar-garden';
  select id into v_main from dining_areas where venue_id = v_venue and slug = 'main-hall';
  select id into v_chai from dining_areas where venue_id = v_venue and slug = 'chaikhana';
  select id into v_fire from dining_areas where venue_id = v_venue and slug = 'fireplace';
  select id into v_gard from dining_areas where venue_id = v_venue and slug = 'garden';

  insert into restaurant_tables (
    venue_id, dining_area_id, code, min_capacity, max_capacity, shape,
    width_m, depth_m, floor_x, floor_z, rotation_deg, is_accessible, display_order, staff_notes
  ) values
  -- Main hall, four rows running away from the entrance -----------------------
  (v_venue, v_main, 'T01', 1, 2, 'round',     0.80, 0.80,  2.2, 1.6,  0, true,   1, null),
  (v_venue, v_main, 'T02', 1, 2, 'round',     0.80, 0.80,  4.4, 1.6,  0, true,   2, null),
  (v_venue, v_main, 'T03', 2, 4, 'square',    1.10, 1.10,  6.6, 1.6,  0, true,   3, null),
  (v_venue, v_main, 'T04', 2, 4, 'square',    1.10, 1.10,  8.8, 1.6,  0, true,   4, 'By the window — bright at lunch.'),
  (v_venue, v_main, 'T05', 2, 4, 'square',    1.10, 1.10,  2.2, 3.6,  0, false,  5, null),
  (v_venue, v_main, 'T06', 2, 4, 'square',    1.10, 1.10,  4.4, 3.6,  0, false,  6, null),
  (v_venue, v_main, 'T07', 2, 4, 'square',    1.10, 1.10,  6.6, 3.6,  0, false,  7, null),
  (v_venue, v_main, 'T08', 4, 6, 'rectangle', 1.60, 0.90,  8.8, 3.6,  0, false,  8, null),
  (v_venue, v_main, 'T09', 2, 4, 'square',    1.10, 1.10,  2.2, 5.6,  0, false,  9, null),
  (v_venue, v_main, 'T10', 2, 4, 'square',    1.10, 1.10,  4.4, 5.6,  0, false, 10, null),
  (v_venue, v_main, 'T11', 4, 6, 'round',     1.30, 1.30,  6.6, 5.6,  0, false, 11, null),
  (v_venue, v_main, 'T12', 4, 6, 'round',     1.30, 1.30,  8.8, 5.6,  0, false, 12, null),
  (v_venue, v_main, 'T13', 2, 4, 'square',    1.10, 1.10,  2.6, 7.6,  0, false, 13, 'Nearest the kitchen pass — noisier.'),
  (v_venue, v_main, 'T14', 4, 6, 'rectangle', 1.60, 0.90,  5.4, 7.6,  0, false, 14, null),
  (v_venue, v_main, 'T15', 4, 6, 'rectangle', 1.60, 0.90,  8.2, 7.6,  0, false, 15, null),
  (v_venue, v_main, 'T16', 2, 4, 'booth',     1.40, 0.90,  0.8, 2.6, 90, false, 16, 'Banquette against the left wall.'),
  (v_venue, v_main, 'T17', 2, 4, 'booth',     1.40, 0.90,  0.8, 5.0, 90, false, 17, 'Banquette against the left wall.'),
  (v_venue, v_main, 'T18', 8,12, 'rectangle', 2.60, 1.00, 11.4, 4.6,  0, false, 18, 'The long table by the counter. Used for parties.'),

  -- Chaikhana — low banquettes along both walls -------------------------------
  (v_venue, v_chai, 'C01', 2, 4, 'booth',     1.40, 0.90, 15.8, 1.5,  0, false,  1, null),
  (v_venue, v_chai, 'C02', 2, 4, 'booth',     1.40, 0.90, 15.8, 4.0,  0, false,  2, null),
  (v_venue, v_chai, 'C03', 4, 6, 'booth',     1.80, 0.95, 15.8, 6.5,  0, false,  3, null),
  (v_venue, v_chai, 'C04', 2, 4, 'booth',     1.40, 0.90, 18.6, 1.5,180, false,  4, null),
  (v_venue, v_chai, 'C05', 4, 6, 'booth',     1.80, 0.95, 18.6, 4.0,180, false,  5, null),
  (v_venue, v_chai, 'C06', 4, 8, 'rectangle', 2.20, 1.00, 18.6, 6.8,  0, false,  6, 'The big cushioned platform. Shoes off.'),

  -- Fireplace room ------------------------------------------------------------
  (v_venue, v_fire, 'F01', 1, 2, 'round',     0.80, 0.80,  1.6, 11.2, 0, true,   1, null),
  (v_venue, v_fire, 'F02', 2, 4, 'round',     1.10, 1.10,  4.0, 11.2, 0, true,   2, 'Closest to the fire.'),
  (v_venue, v_fire, 'F03', 2, 4, 'round',     1.10, 1.10,  6.4, 11.2, 0, false,  3, null),
  (v_venue, v_fire, 'F04', 2, 4, 'square',    1.10, 1.10,  1.6, 13.4, 0, false,  4, null),
  (v_venue, v_fire, 'F05', 4, 6, 'round',     1.30, 1.30,  4.0, 13.4, 0, false,  5, null),
  (v_venue, v_fire, 'F06', 4, 6, 'round',     1.30, 1.30,  6.4, 13.4, 0, false,  6, null),

  -- Garden — seasonal, outdoors ------------------------------------------------
  (v_venue, v_gard, 'G01', 2, 4, 'square',    1.00, 1.00,  9.8, 11.0, 0, true,   1, null),
  (v_venue, v_gard, 'G02', 2, 4, 'square',    1.00, 1.00, 12.0, 11.0, 0, true,   2, null),
  (v_venue, v_gard, 'G03', 2, 4, 'square',    1.00, 1.00, 14.2, 11.0, 0, true,   3, null),
  (v_venue, v_gard, 'G04', 2, 4, 'square',    1.00, 1.00, 16.4, 11.0, 0, false,  4, null),
  (v_venue, v_gard, 'G05', 1, 2, 'round',     0.80, 0.80, 18.6, 11.0, 0, false,  5, null),
  (v_venue, v_gard, 'G06', 2, 4, 'square',    1.00, 1.00,  9.8, 13.6, 0, false,  6, null),
  (v_venue, v_gard, 'G07', 2, 4, 'square',    1.00, 1.00, 12.0, 13.6, 0, false,  7, null),
  (v_venue, v_gard, 'G08', 4, 6, 'rectangle', 1.60, 0.90, 14.5, 13.6, 0, false,  8, null),
  (v_venue, v_gard, 'G09', 4, 6, 'rectangle', 1.60, 0.90, 17.2, 13.6, 0, false,  9, null),
  (v_venue, v_gard, 'G10', 8,12, 'rectangle', 2.60, 1.00, 19.4, 12.3,90, false, 10, 'The long garden table under the awning.')
  on conflict (venue_id, code) do update set
    dining_area_id = excluded.dining_area_id,
    min_capacity = excluded.min_capacity, max_capacity = excluded.max_capacity,
    shape = excluded.shape, width_m = excluded.width_m, depth_m = excluded.depth_m,
    floor_x = excluded.floor_x, floor_z = excluded.floor_z,
    rotation_deg = excluded.rotation_deg, is_accessible = excluded.is_accessible,
    display_order = excluded.display_order, staff_notes = excluded.staff_notes;
end $$;

-- ---------------------------------------------------------------------------
-- Sample operational data.
--
-- Only runs when the venue has no reservations yet, so re-seeding an in-use
-- development database does not bury real test bookings under fixtures.
-- ---------------------------------------------------------------------------
do $$
declare
  v_venue     uuid;
  v_settings  reservation_settings%rowtype;
  v_today     date;
  v_res       uuid;
  v_tbl       uuid;
  v_code      text;
begin
  select id into v_venue from venues where slug = 'guzar-garden';
  select * into v_settings from reservation_settings where venue_id = v_venue;

  if exists (select 1 from reservations where venue_id = v_venue) then
    raise notice 'Reservations already present — skipping sample bookings.';
    return;
  end if;

  v_today := (now() at time zone 'Europe/Warsaw')::date;

  -- A confirmed booking this evening ----------------------------------------
  select id into v_tbl from restaurant_tables where venue_id = v_venue and code = 'T11';
  v_code := gg_generate_confirmation_code();
  insert into reservations (
    venue_id, confirmation_code, status, source, starts_at, ends_at, occupancy_ends_at,
    party_size, guest_first_name, guest_last_name, guest_email, guest_phone_e164,
    locale, special_requests, privacy_accepted_at, marketing_consent, confirmed_at
  ) values (
    v_venue, v_code, 'confirmed', 'website',
    ((v_today + time '19:00')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + time '21:00')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + time '21:15')::timestamp) at time zone 'Europe/Warsaw',
    4, 'Anna', 'Przykładowa', 'anna@example.com', '+9990000101',
    'pl', 'Stolik przy oknie, jeśli to możliwe.', now(), false, now()
  ) returning id into v_res;
  insert into table_allocations (venue_id, table_id, reservation_id, kind, status, starts_at, ends_at)
  values (v_venue, v_tbl, v_res, 'reservation', 'active',
    ((v_today + time '19:00')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + time '21:15')::timestamp) at time zone 'Europe/Warsaw');
  insert into notification_outbox (venue_id, reservation_id, type, recipient, locale, template_data,
                                   status, provider, sent_at, delivered_at)
  values (v_venue, v_res, 'reservation_confirmation', '+9990000101', 'pl',
          jsonb_build_object('confirmation_code', v_code), 'delivered', 'console', now(), now());

  -- A party currently seated ------------------------------------------------
  select id into v_tbl from restaurant_tables where venue_id = v_venue and code = 'T05';
  v_code := gg_generate_confirmation_code();
  insert into reservations (
    venue_id, confirmation_code, status, source, starts_at, ends_at, occupancy_ends_at,
    party_size, guest_first_name, guest_last_name, guest_email, guest_phone_e164,
    locale, privacy_accepted_at, confirmed_at, seated_at
  ) values (
    v_venue, v_code, 'seated', 'phone',
    now() - interval '40 minutes', now() + interval '80 minutes', now() + interval '95 minutes',
    2, 'Dilnoza', 'Namunaviy', 'dilnoza@example.com', '+9990000102',
    'uz', now() - interval '2 hours', now() - interval '2 hours', now() - interval '38 minutes'
  ) returning id into v_res;
  insert into table_allocations (venue_id, table_id, reservation_id, kind, status, starts_at, ends_at)
  values (v_venue, v_tbl, v_res, 'reservation', 'active',
          now() - interval '40 minutes', now() + interval '95 minutes');

  -- A completed lunch --------------------------------------------------------
  select id into v_tbl from restaurant_tables where venue_id = v_venue and code = 'T03';
  v_code := gg_generate_confirmation_code();
  insert into reservations (
    venue_id, confirmation_code, status, source, starts_at, ends_at, occupancy_ends_at,
    party_size, guest_first_name, guest_last_name, guest_email, guest_phone_e164,
    locale, privacy_accepted_at, confirmed_at, seated_at, completed_at
  ) values (
    v_venue, v_code, 'completed', 'walk_in',
    ((v_today + time '12:30')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + time '14:00')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + time '14:15')::timestamp) at time zone 'Europe/Warsaw',
    3, 'Marek', 'Testowy', 'marek@example.com', '+9990000103',
    'pl', now() - interval '1 day', now() - interval '1 day',
    now() - interval '5 hours', now() - interval '3 hours'
  ) returning id into v_res;
  insert into table_allocations (venue_id, table_id, reservation_id, kind, status, starts_at, ends_at, released_at)
  values (v_venue, v_tbl, v_res, 'reservation', 'released',
    ((v_today + time '12:30')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + time '14:15')::timestamp) at time zone 'Europe/Warsaw',
    now() - interval '3 hours');

  -- A no-show ----------------------------------------------------------------
  v_code := gg_generate_confirmation_code();
  insert into reservations (
    venue_id, confirmation_code, status, source, starts_at, ends_at, occupancy_ends_at,
    party_size, guest_first_name, guest_last_name, guest_phone_e164,
    locale, privacy_accepted_at, confirmed_at, no_show_at
  ) values (
    v_venue, v_code, 'no_show', 'website',
    ((v_today - 1 + time '20:00')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today - 1 + time '22:00')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today - 1 + time '22:15')::timestamp) at time zone 'Europe/Warsaw',
    2, 'Piotr', 'Nieobecny', '+9990000104',
    'pl', now() - interval '2 days', now() - interval '2 days', now() - interval '15 hours'
  );

  -- A cancelled booking ------------------------------------------------------
  v_code := gg_generate_confirmation_code();
  insert into reservations (
    venue_id, confirmation_code, status, source, starts_at, ends_at, occupancy_ends_at,
    party_size, guest_first_name, guest_last_name, guest_phone_e164,
    locale, privacy_accepted_at, confirmed_at, cancelled_at, cancellation_reason
  ) values (
    v_venue, v_code, 'cancelled', 'website',
    ((v_today + 2 + time '18:30')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + 2 + time '20:30')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + 2 + time '20:45')::timestamp) at time zone 'Europe/Warsaw',
    6, 'Olga', 'Odwołana', '+9990000105',
    'ru', now() - interval '3 days', now() - interval '3 days', now() - interval '1 hour',
    'Plans changed'
  );

  -- A booking a few days out, still pending confirmation ----------------------
  select id into v_tbl from restaurant_tables where venue_id = v_venue and code = 'C03';
  v_code := gg_generate_confirmation_code();
  insert into reservations (
    venue_id, confirmation_code, status, source, starts_at, ends_at, occupancy_ends_at,
    party_size, guest_first_name, guest_last_name, guest_email, guest_phone_e164,
    locale, privacy_accepted_at
  ) values (
    v_venue, v_code, 'pending', 'website',
    ((v_today + 3 + time '19:30')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + 3 + time '21:30')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + 3 + time '21:45')::timestamp) at time zone 'Europe/Warsaw',
    5, 'Yulia', 'Primernaya', 'yulia@example.com', '+9990000106',
    'ru', now()
  ) returning id into v_res;
  insert into table_allocations (venue_id, table_id, reservation_id, kind, status, starts_at, ends_at)
  values (v_venue, v_tbl, v_res, 'reservation', 'active',
    ((v_today + 3 + time '19:30')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + 3 + time '21:45')::timestamp) at time zone 'Europe/Warsaw');

  -- An active table block: a wobbly leg on T14 --------------------------------
  select id into v_tbl from restaurant_tables where venue_id = v_venue and code = 'T14';
  insert into table_allocations (
    venue_id, table_id, kind, status, starts_at, ends_at, block_reason
  ) values (
    v_venue, v_tbl, 'block', 'active',
    ((v_today + time '09:00')::timestamp) at time zone 'Europe/Warsaw',
    ((v_today + 2 + time '09:00')::timestamp) at time zone 'Europe/Warsaw',
    'Wobbly leg — carpenter booked for Thursday'
  );

  -- One failed notification, so the dashboard's alert panel has something real
  -- to show in development.
  insert into notification_outbox (
    venue_id, type, recipient, locale, template_data, status, provider,
    retry_count, last_error
  ) values (
    v_venue, 'reservation_confirmation', '+9990000199', 'pl',
    jsonb_build_object('confirmation_code', 'DEVFAIL1'), 'failed', 'console',
    3, 'Provider rejected the recipient number'
  );
end $$;

-- ---------------------------------------------------------------------------
-- A public service exception, so the "we are closed that day" path is testable.
-- ---------------------------------------------------------------------------
do $$
declare v_venue uuid; v_date date;
begin
  select id into v_venue from venues where slug = 'guzar-garden';
  v_date := ((now() at time zone 'Europe/Warsaw')::date + 21);

  if not exists (
    select 1 from service_exceptions where venue_id = v_venue and kind = 'closure'
  ) then
    insert into service_exceptions (venue_id, kind, starts_at, ends_at, reason, is_public)
    values (
      v_venue, 'closure',
      (v_date::timestamp) at time zone 'Europe/Warsaw',
      ((v_date + 1)::timestamp) at time zone 'Europe/Warsaw',
      'Przerwa techniczna / Maintenance day', true
    );
  end if;

  if not exists (
    select 1 from service_exceptions where venue_id = v_venue and kind = 'private_event'
  ) then
    insert into service_exceptions (
      venue_id, dining_area_id, kind, starts_at, ends_at, reason, is_public
    ) values (
      v_venue,
      (select id from dining_areas where venue_id = v_venue and slug = 'fireplace'),
      'private_event',
      ((v_date - 7)::timestamp + time '16:00') at time zone 'Europe/Warsaw',
      ((v_date - 7)::timestamp + time '23:59') at time zone 'Europe/Warsaw',
      'Wesele / Wedding party', false
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- One dish is sold out in development, so the sold-out presentation on the
-- public menu is visible without having to make it happen by hand.
-- ---------------------------------------------------------------------------
do $$
declare v_venue uuid;
begin
  select id into v_venue from venues where slug = 'guzar-garden';
  update menu_items
     set is_available = false
   where venue_id = v_venue and slug = 'samsa-duza';
end $$;
