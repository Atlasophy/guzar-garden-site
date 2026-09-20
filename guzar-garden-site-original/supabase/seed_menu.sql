-- =============================================================================
-- Menu seed — GENERATED, do not edit by hand.
--
-- Produced by `npm run menu:generate-seed` from legacy/menu.html, which is the
-- original hardcoded SECTIONS array. Every name, price, portion note and
-- description is carried across verbatim; see docs/menu-migration-report.md
-- for what needs the restaurant to confirm it.
-- 14 categories, 127 dishes.
-- =============================================================================

do $$
declare
  v_venue uuid;
  v_cat   uuid;
begin
  select id into v_venue from venues where slug = 'guzar-garden';
  if v_venue is null then
    raise exception 'Seed the venue before the menu (supabase/seed.sql).';
  end if;

  -- ---- Sałaty (16 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'salaty', 'Sałaty', 'Salads', 'Салаты', 'Salatlar',
    'salad салат salatka przystawka starter zakuska закуска', 0, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'oliwie-z-miesem',
    'Oliwie z mięsem', 'Oliwie z mięsem', 'Oliwie z mięsem', 'Oliwie z mięsem',
    'ziemniaki, marchewka, jajo przepiórcze, ogórek kiszony, mięso wołowe, groszek zielony, majonez', 'potato, carrot, quail egg, pickled cucumber, beef, green peas, mayonnaise', 'картофель, морковь, перепелиное яйцо, солёный огурец, говядина, зелёный горошек, майонез', 'kartoshka, sabzi, bedana tuxumi, tuzlangan bodring, mol go''shti, yashil no''xat, mayonez',
    29.00, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kiszony-mix',
    'Kiszony mix', 'Kiszony mix', 'Kiszony mix', 'Kiszony mix',
    'kimczi, marchewka, ogórek kiszony, pomidor marynowany, papryka kiszona', 'kimchi, carrot, pickled cucumber, marinated tomato, pickled pepper', 'кимчи, морковь, солёный огурец, маринованный помидор, солёный перец', 'kimchi, sabzi, tuzlangan bodring, marinadlangan pomidor, tuzlangan qalampir',
    29.00, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'salatka-z-burakami',
    'Sałatka z burakami', 'Sałatka z burakami', 'Sałatka z burakami', 'Sałatka z burakami',
    'buraki, mięso wołowe, ziemniaki', 'beetroot, beef, potato', 'свёкла, говядина, картофель', 'lavlagi, mol go''shti, kartoshka',
    29.00, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'salatka-grecka',
    'Sałatka grecka', 'Sałatka grecka', 'Sałatka grecka', 'Sałatka grecka',
    'ser feta, ogórek, pomidor cherry, papryka czerwona/zielona/żółta, cebula czerwona, rzodkiewka, sałata rosso, sałata rzymska, olej oliwkowy, sos grecki, crema balsamic, sos pesto', 'feta, cucumber, cherry tomato, red/green/yellow pepper, red onion, radish, rosso and romaine lettuce, olive oil, Greek dressing, balsamic cream, pesto', 'фета, огурец, черри, красный/зелёный/жёлтый перец, красный лук, редис, салат россо и романо, оливковое масло, греческий соус, бальзамик, песто', 'feta pishlog''i, bodring, cherri pomidor, qizil/yashil/sariq qalampir, qizil piyoz, turp, rosso va rim salati, zaytun moyi, grek sousi, balzamik krema, pesto sousi',
    29.00, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kimchi',
    'Kimchi', 'Kimchi', 'Kimchi', 'Kimchi',
    'kapusta koreańska, pikantna', 'Korean cabbage, spicy', 'корейская капуста, острая', 'koreyscha karam, achchiq',
    12.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'cezar',
    'Cezar', 'Cezar', 'Cezar', 'Cezar',
    'sałata rosso, sałata rzymska, kurczak z grila, pomidor cherry, pieczywo chrupiące, jajo przepiórcze, ser parmeggiano, sos cezar, sos pesto', 'rosso and romaine lettuce, grilled chicken, cherry tomato, croutons, quail egg, parmesan, Caesar dressing, pesto', 'салат россо и романо, курица гриль, черри, гренки, перепелиное яйцо, пармезан, соус цезарь, песто', 'rosso va rim salati, mangalda pishirilgan tovuq, cherri pomidor, qarsildoq krutonlar, bedana tuxumi, parmezan pishlog''i, sezar sousi, pesto sousi',
    29.00, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'salata-wiosna',
    'Sałata wiosna', 'Sałata wiosna', 'Sałata wiosna', 'Sałata wiosna',
    'rzodkiewka, ogórek, pomidor cherry, pietruszka, cebula zielona, koperek, cebula czerwona, jogurt, jajo przepiórcze', 'radish, cucumber, cherry tomato, parsley, spring onion, dill, red onion, yoghurt, quail egg', 'редис, огурец, черри, петрушка, зелёный лук, укроп, красный лук, йогурт, перепелиное яйцо', 'turp, bodring, cherri pomidor, petrushka, yashil piyoz, ukrop, qizil piyoz, qatiq, bedana tuxumi',
    17.00, 'PLN', null,
    false, 0, true, true,
    6, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'marchewka',
    'Marchewka', 'Marchewka', 'Marchewka', 'Marchewka',
    'marchewka koreańska', 'Korean-style carrot', 'морковь по-корейски', 'koreyscha sabzi',
    12.99, 'PLN', null,
    false, 0, true, true,
    7, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kapryz',
    'Kapryz', 'Kapryz', 'Kapryz', 'Kapryz',
    'mięso wołowe, ogórek, ser mozzarella, majonez, kukurydza, kiełbasa', 'beef, cucumber, mozzarella, mayonnaise, sweetcorn, sausage', 'говядина, огурец, моцарелла, майонез, кукуруза, колбаса', 'mol go''shti, bodring, mozzarella pishlog''i, mayonez, makkajo''xori, kolbasa',
    29.00, 'PLN', null,
    false, 0, true, true,
    8, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'szakarob',
    'Szakarob', 'Szakarob', 'Szakarob', 'Szakarob',
    'pomidor, ogórek, cebula, koperek, pietruszka', 'tomato, cucumber, onion, dill, parsley', 'помидор, огурец, лук, укроп, петрушка', 'pomidor, bodring, piyoz, ukrop, petrushka',
    8.99, 'PLN', null,
    false, 0, true, true,
    9, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'baklazan-rulet',
    'Bakłażan rulet', 'Bakłażan rulet', 'Bakłażan rulet', 'Bakłażan rulet',
    'bakłażan smażony panierowany z jajkiem, pomidor, czosnek, koperek, sos czosnkowy', 'egg-battered fried aubergine rolls, tomato, garlic, dill, garlic sauce', 'жареные баклажаны в яичном кляре, помидор, чеснок, укроп, чесночный соус', 'tuxumga botirib qovurilgan baqlajon, pomidor, sarimsoq, ukrop, sarimsoqli sous',
    21.99, 'PLN', null,
    false, 0, true, true,
    10, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'salatka-samarkand',
    'Sałatka „Samarkand”', 'Sałatka „Samarkand”', 'Sałatka „Samarkand”', 'Sałatka „Samarkand”',
    'fasola czerwona, mięso wołowe, cebula czerwona, papryka czerwona, kolendra świeża, sos sojowy, masło oliwkowy, orzech', 'red beans, beef, red onion, red pepper, fresh coriander, soy sauce, olive oil, walnut', 'красная фасоль, говядина, красный лук, красный перец, свежая кинза, соевый соус, оливковое масло, орех', 'qizil loviya, mol go''shti, qizil piyoz, qizil qalampir, yangi kashnich, soya sousi, zaytun moyi, yong''oq',
    29.00, 'PLN', null,
    false, 0, true, true,
    11, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'salatka-tashkent',
    'Sałatka „Tashkent”', 'Sałatka „Tashkent”', 'Sałatka „Tashkent”', 'Sałatka „Tashkent”',
    'indyk, mięso wołowe, dajkom, ogórek kiszony, ziemniaki, sałata mix, jaja przepiórcze', 'turkey, beef, daikon, pickled cucumber, potato, mixed leaves, quail eggs', 'индейка, говядина, дайкон, солёный огурец, картофель, микс салата, перепелиные яйца', 'kurka go''shti, mol go''shti, daykon turp, tuzlangan bodring, kartoshka, aralash salat barglari, bedana tuxumlari',
    29.00, 'PLN', null,
    false, 0, true, true,
    12, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'chlodna-salatka-japonska',
    'Chłodna sałatka japońska', 'Chłodna sałatka japońska', 'Chłodna sałatka japońska', 'Chłodna sałatka japońska',
    'pomidor, ogórek, mięso wołowe, kolendra świeża, sos sojowy, masło oliwkowy, sezam, sałata mix, czosnek', 'tomato, cucumber, beef, fresh coriander, soy sauce, olive oil, sesame, mixed leaves, garlic', 'помидор, огурец, говядина, свежая кинза, соевый соус, оливковое масло, кунжут, микс салата, чеснок', 'pomidor, bodring, mol go''shti, yangi kashnich, soya sousi, zaytun moyi, kunjut, aralash salat barglari, sarimsoq',
    29.00, 'PLN', null,
    false, 0, true, true,
    13, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'salatka-azjatycka',
    'Sałatka azjatycka', 'Sałatka azjatycka', 'Sałatka azjatycka', 'Sałatka azjatycka',
    'bakłażany chrupiące, pomidor, sos słodko-kwaśny, kolendra świeża, orzech, sezam', 'crispy aubergine, tomato, sweet-and-sour sauce, fresh coriander, walnut, sesame', 'хрустящие баклажаны, помидор, кисло-сладкий соус, свежая кинза, орех, кунжут', 'qarsildoq baqlajon, pomidor, shirin-achchiq sous, yangi kashnich, yong''oq, kunjut',
    20.99, 'PLN', null,
    false, 0, true, true,
    14, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'ciepla-salatka-japonska',
    'Ciepła sałatka japońska', 'Ciepła sałatka japońska', 'Ciepła sałatka japońska', 'Ciepła sałatka japońska',
    'mięso wołowe, ogórek, papryka mix, pomidor, cebula zielony, kapusta pekińska, seler, sos sojowy, sezam', 'beef, cucumber, mixed peppers, tomato, spring onion, Chinese cabbage, celery, soy sauce, sesame', 'говядина, огурец, микс перцев, помидор, зелёный лук, пекинская капуста, сельдерей, соевый соус, кунжут', 'mol go''shti, bodring, aralash qalampir, pomidor, yashil piyoz, pekin karami, selderey, soya sousi, kunjut',
    29.99, 'PLN', null,
    false, 0, true, true,
    15, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Zupy (7 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'zupy', 'Zupy', 'Soups', 'Супы', 'Sho''rvalar',
    'soup суп zupa broth бульон', 1, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'szurpa-z-wolowina',
    'Szurpa z wołowiną', 'Szurpa z wołowiną', 'Szurpa z wołowiną', 'Szurpa z wołowiną',
    'tradycyjna uzbecka zupa z dużymi kawałkami mięsa, ziemniaki, marchewka', 'traditional Uzbek soup with large pieces of meat, potato and carrot', 'традиционный узбекский суп с крупными кусками мяса, картофелем и морковью', 'yirik go''sht bo''laklari, kartoshka va sabzi bilan an''anaviy o''zbek sho''rvasi',
    21.99, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', 'шурпа shurpa'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'szurpa-z-baranina',
    'Szurpa z baraniną', 'Szurpa z baraniną', 'Szurpa z baraniną', 'Szurpa z baraniną',
    'tradycyjna uzbecka zupa z mięsa baraniego, z ziemniakami, marchewką', 'traditional Uzbek mutton soup with potato and carrot', 'традиционный узбекский суп из баранины с картофелем и морковью', 'kartoshka va sabzi bilan an''anaviy o''zbek qo''y go''shti sho''rvasi',
    23.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', 'шурпа баранина lamb'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'mastawa',
    'Mastawa', 'Mastawa', 'Mastawa', 'Mastawa',
    'zupa z wołowiną, ryżem i warzywami', 'beef soup with rice and vegetables', 'суп с говядиной, рисом и овощами', 'mol go''shti, guruch va sabzavotli sho''rva',
    20.99, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', 'мастава mastava'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'moszchurda',
    'Moszchurda', 'Moszchurda', 'Moszchurda', 'Moszchurda',
    'zupa z wołowiną, ryżu, fasolą mung i jogurtu', 'beef soup with rice, mung beans and yoghurt', 'суп с говядиной, рисом, машем и йогуртом', 'mol go''shti, guruch, mosh va qatiqli sho''rva',
    21.99, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', 'мошхурда moshhurda'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'zupa-z-piemieniami-i-kluskami',
    'Zupa z piemieniami i kluskami', 'Zupa z piemieniami i kluskami', 'Zupa z piemieniami i kluskami', 'Zupa z piemieniami i kluskami',
    null, 'dumplings and noodles in broth', 'пельмени и лапша в бульоне', 'bulyonda chuchvara va lag''mon xamiri',
    26.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'zupa-z-klopsikami',
    'Zupa z klopsikami', 'Zupa z klopsikami', 'Zupa z klopsikami', 'Zupa z klopsikami',
    'wołowina mielona, jaja, ziemniaki, marchew, rosół', 'minced beef, egg, potato, carrot, broth', 'фарш из говядины, яйцо, картофель, морковь, бульон', 'mol go''shti qiymasi, tuxum, kartoshka, sabzi, bulyon',
    26.99, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'zupa-meska',
    'Zupa „Męska”', 'Zupa „Męska”', 'Zupa „Męska”', 'Zupa „Męska”',
    'mięso wołowe, kazi, konina, ciasto, cebula, rosół', 'beef, kazi, horse meat, dough, onion, broth', 'говядина, казы, конина, тесто, лук, бульон', 'mol go''shti, qazi, ot go''shti, xamir, piyoz, bulyon',
    34.99, 'PLN', null,
    false, 0, true, true,
    6, '{halal}', 'мужской суп'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Dania (18 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'dania', 'Dania', 'Mains', 'Основные блюда', 'Asosiy taomlar',
    'main mains danie основное горячее hot dish', 2, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'plow',
    'Plow', 'Plow', 'Plow', 'Plow',
    'aromatyczne danie z ryżu, mięsa i marchewki, gotowane na wolnym ogniu z orientalnymi przyprawami', 'rice, meat and carrot slow-cooked over a low flame with oriental spices', 'рис, мясо и морковь на медленном огне с восточными специями', 'sharq ziravorlari bilan sekin o''tda pishirilgan guruch, go''sht va sabzi',
    26.99, 'PLN', '450 g',
    true, 0, true, true,
    0, '{halal}', 'плов palov pilaf osh ош'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'plow-samarkandski',
    'Plow samarkandski', 'Plow samarkandski', 'Plow samarkandski', 'Plow samarkandski',
    'marchewka oraz mięso, pod spodem ryż', 'carrot and meat, rice underneath', 'морковь и мясо, рис снизу', 'sabzi va go''sht, ostida guruch',
    27.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', 'плов самаркандский'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'czajhana-plow',
    'Czajhana plow', 'Czajhana plow', 'Czajhana plow', 'Czajhana plow',
    'przygotowywany w stylu domowym – z ryżem, mięsem, marchewką i delikatnymi przyprawami, serwowany jak w prawdziwej uzbeckiej czajchanie', 'home-style — rice, meat, carrot and gentle spices, served the way a real Uzbek chaikhana does', 'по-домашнему — рис, мясо, морковь и мягкие специи, как в настоящей узбекской чайхане', 'uy usulida — guruch, go''sht, sabzi va yumshoq ziravorlar, haqiqiy o''zbek choyxonasidagidek tortiladi',
    30.99, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', 'плов чайхана chaikhana'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kazi',
    'Kazi', 'Kazi', 'Kazi', 'Kazi',
    'dodatek do plowu', 'add to any plov', 'добавка к плову', 'palovga qo''shimcha',
    10.00, 'PLN', 'dodatek / extra',
    false, 0, true, true,
    3, '{halal}', 'казы kazy'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'lagman-uzbecki',
    'Lagman uzbecki', 'Lagman uzbecki', 'Lagman uzbecki', 'Lagman uzbecki',
    'aromatyczne danie z ręcznie robionym makaronem, duszoną wołowiną i warzywami w korzennym bulionie', 'hand-made noodles with braised beef and vegetables in a spiced broth', 'лапша ручной работы с тушёной говядиной и овощами в пряном бульоне', 'qo''lda cho''zilgan lag''mon xamiri, dimlangan mol go''shti va sabzavotlar bilan ziravorli bulyonda',
    25.99, 'PLN', null,
    true, 4, true, true,
    4, '{halal}', 'лагман lagman noodles makaron'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'lagman-smazony',
    'Lagman smażony', 'Lagman smażony', 'Lagman smażony', 'Lagman smażony',
    'makaron smażony z mięsem i warzywami na woku w aromatycznych przyprawach', 'noodles wok-fried with meat, vegetables and aromatic spices', 'лапша, обжаренная на воке с мясом, овощами и специями', 'vokda go''sht, sabzavot va xushbo''y ziravorlar bilan qovurilgan lag''mon',
    29.99, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', 'лагман жареный fried noodles'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'lagman-ujgurski',
    'Lagman ujgurski', 'Lagman ujgurski', 'Lagman ujgurski', 'Lagman ujgurski',
    'smażone na woku warzywa i mięso w aromatycznym bulionie, podawane z ręcznie robionym makaronem', 'wok-fried vegetables and meat in aromatic broth, served with hand-made noodles', 'овощи и мясо с вока в ароматном бульоне, подаются с домашней лапшой', 'vokda qovurilgan sabzavot va go''sht xushbo''y bulyonda, qo''lda cho''zilgan lag''mon bilan',
    29.99, 'PLN', null,
    false, 0, true, true,
    6, '{halal}', 'лагман уйгурский uyghur'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'norin',
    'Norin', 'Norin', 'Norin', 'Norin',
    'konina oraz wołowina, kmin rzymski, ciasto, bulion', 'horse meat and beef, cumin, dough, broth', 'конина и говядина, зира, тесто, бульон', 'ot go''shti va mol go''shti, zira, xamir, bulyon',
    44.99, 'PLN', null,
    false, 0, true, true,
    7, '{halal}', 'норин naryn'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'nuhatszurak',
    'Nuhatszurak', 'Nuhatszurak', 'Nuhatszurak', 'Nuhatszurak',
    'zupa z wołowiną i ciecierzycą', 'beef and chickpea dish', 'блюдо из говядины с нутом', 'mol go''shti va no''xatli taom',
    23.99, 'PLN', null,
    false, 0, true, true,
    8, '{halal}', 'нухат nohat chickpea ciecierzyca'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'saj-miesny',
    'Saj mięsny', 'Saj mięsny', 'Saj mięsny', 'Saj mięsny',
    'uzbeckie danie z mięsa smażonego na dużej, płaskiej patelni, z dodatkiem warzyw i przypraw', 'meat seared on a large flat saj pan with vegetables and spices', 'мясо, обжаренное на большой плоской сковороде садж, с овощами и специями', 'katta yassi sadj tovada sabzavot va ziravorlar bilan qovurilgan go''sht',
    30.99, 'PLN', null,
    false, 0, true, true,
    9, '{halal}', 'садж saj'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'befstroganow-od-guzar-garden',
    'Befstroganow od „Guzar Garden”', 'Befstroganow od „Guzar Garden”', 'Befstroganow od „Guzar Garden”', 'Befstroganow od „Guzar Garden”',
    'mięso wołowe, tłuczone ziemniaki, sos śmietankowy, pieczarki, cebula, ogórek kiszony', 'beef, mashed potato, cream sauce, mushrooms, onion, pickled cucumber', 'говядина, картофельное пюре, сливочный соус, шампиньоны, лук, солёный огурец', 'mol go''shti, kartoshka pyuresi, qaymoqli sous, qo''ziqorin, piyoz, tuzlangan bodring',
    36.99, 'PLN', null,
    false, 0, true, true,
    10, '{halal}', 'бефстроганов stroganoff'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'czuponcza-waguri',
    'Czuponcza waguri', 'Czuponcza waguri', 'Czuponcza waguri', 'Czuponcza waguri',
    'smażona baranina w małych kawałkach, smażona na otwartym ogniu lub w kazanie, po tym paruje się, podawana z ziemniakami', 'mutton in small pieces seared over open fire or in the kazan, then steamed, served with potatoes', 'баранина мелкими кусочками, обжаренная на открытом огне или в казане, затем на пару, с картофелем', 'mayda bo''laklangan qo''y go''shti, ochiq olovda yoki qozonda qovurilib, so''ng bug''da dimlanadi, kartoshka bilan',
    55.99, 'PLN', null,
    false, 0, true, true,
    11, '{halal}', 'чупончa waguri'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'tabaka',
    'Tabaka', 'Tabaka', 'Tabaka', 'Tabaka',
    'smażony na chrupiąco kurczak z ziemniakami', 'crisp-fried chicken with potatoes', 'хрустящая жареная курица с картофелем', 'kartoshka bilan qarsildoq qovurilgan tovuq',
    28.99, 'PLN', null,
    false, 0, true, true,
    12, '{halal}', 'табака tabaka chicken kurczak'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kazan-kebab',
    'Kazan kebab', 'Kazan kebab', 'Kazan kebab', 'Kazan kebab',
    'potrawa z mięsa i ziemniaków smażonych w dużym żeliwnym kotle', 'meat and potatoes fried in a large cast-iron cauldron', 'мясо и картофель, жаренные в большом чугунном казане', 'katta cho''yan qozonda qovurilgan go''sht va kartoshka',
    43.99, 'PLN', '450 g',
    false, 0, true, true,
    13, '{halal}', 'казан кебаб kazan'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kaszkar-dziz',
    'Kaszkar dziz', 'Kaszkar dziz', 'Kaszkar dziz', 'Kaszkar dziz',
    'mięso baranie smażony w głębokim oleju, podawane z ziemniakami', 'deep-fried mutton served with potatoes', 'баранина во фритюре, подаётся с картофелем', 'chuqur yog''da qovurilgan qo''y go''shti, kartoshka bilan',
    44.99, 'PLN', null,
    false, 0, true, true,
    14, '{halal}', 'кашкар kashkar'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'karkowka-z-baraniny',
    'Karkówka z baraniny', 'Karkówka z baraniny', 'Karkówka z baraniny', 'Karkówka z baraniny',
    'marynowana, pieczona 4 godzin w piecu, gotowana w sosie pomidorowym, podawana z ziemniakami', 'marinated, oven-roasted for 4 hours, finished in tomato sauce, served with potatoes', 'маринованная, 4 часа в печи, доводится в томатном соусе, с картофелем', 'marinadlangan, pechda 4 soat pishirilgan, pomidor sousida tayyorlangan, kartoshka bilan',
    46.99, 'PLN', null,
    false, 0, true, true,
    15, '{halal}', 'баранина lamb neck'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kotlety-z-wolowiny',
    'Kotlety z wołowiny', 'Kotlety z wołowiny', 'Kotlety z wołowiny', 'Kotlety z wołowiny',
    'kotlety z wołowiną, w środku ser mozarella, papryka, bakłażan, pomidor, czosnek, pietruszka, obok ziemniaki oraz sałata', 'beef patties stuffed with mozzarella, pepper, aubergine, tomato, garlic and parsley, with potatoes and salad', 'говяжьи котлеты с моцареллой, перцем, баклажаном, помидором, чесноком и петрушкой, с картофелем и салатом', 'ichida mozzarella, qalampir, baqlajon, pomidor, sarimsoq va petrushka bo''lgan mol go''shti kotletlari, kartoshka va salat bilan',
    35.00, 'PLN', null,
    false, 0, true, true,
    16, '{halal}', 'котлеты beef patties'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'dolma',
    'Dolma', 'Dolma', 'Dolma', 'Dolma',
    'mięso wołowe w liściach winogron, obok ziemniaki oraz sałatka', 'beef in vine leaves, with potatoes and salad', 'говядина в виноградных листьях, с картофелем и салатом', 'uzum bargida mol go''shti, kartoshka va salat bilan',
    34.99, 'PLN', null,
    false, 0, true, true,
    17, '{halal}', 'долма dolma'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Z pieca tandoor (6 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'piec', 'Z pieca tandoor', 'From the tandoor', 'Из тандыра', 'Tandirdan',
    'tandoor тандыр pastry выпечка pieczywo baked', 3, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'samsa',
    'Samsa', 'Samsa', 'Samsa', 'Samsa',
    'ciasto z wołowiną gotowane w piecu tandoor', 'beef pastry baked in the tandoor', 'тесто с говядиной, запечённое в тандыре', 'tandirda pishirilgan mol go''shtli xamir',
    10.99, 'PLN', null,
    true, 2, true, true,
    0, '{halal}', 'самса somsa sambusa'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'samsa-duza',
    'Samsa duża', 'Samsa duża', 'Samsa duża', 'Samsa duża',
    '+ ćwierć chleba', '+ a quarter loaf of bread', '+ четверть лепёшки', '+ chorak non',
    36.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', 'самса большая big'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'tomchi-samsa',
    'Tomchi samsa', 'Tomchi samsa', 'Tomchi samsa', 'Tomchi samsa',
    'ciasto francuskie w formie kropla', 'puff pastry in a teardrop shape', 'слоёное тесто в форме капли', 'tomchi shaklidagi qatlamli xamir',
    12.99, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', 'самса томчи tomchi'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'czeburek',
    'Czeburek', 'Czeburek', 'Czeburek', 'Czeburek',
    'chrupiące, smażone na głębokim oleju ciasto z nadzieniem z mielonego mięsa i cebuli', 'crisp deep-fried pastry filled with minced meat and onion', 'хрустящее жареное тесто с фаршем и луком', 'qiyma va piyoz bilan to''ldirilgan, chuqur yog''da qovurilgan qarsildoq xamir',
    21.99, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', 'чебурек cheburek'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'czeburek-3-sery',
    'Czeburek 3 sery', 'Czeburek 3 sery', 'Czeburek 3 sery', 'Czeburek 3 sery',
    'mozzarella, parmezan, cheddar', 'mozzarella, parmesan, cheddar', 'моцарелла, пармезан, чеддер', 'mozzarella, parmezan, cheddar',
    21.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', 'чебурек сыр cheese'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'czeburek-ze-szpinakiem',
    'Czeburek ze szpinakiem', 'Czeburek ze szpinakiem', 'Czeburek ze szpinakiem', 'Czeburek ze szpinakiem',
    null, 'with spinach', 'со шпинатом', 'ismaloq bilan',
    21.99, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', 'чебурек шпинат spinach'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Grill (11 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'grill', 'Grill', 'Charcoal grill', 'Гриль', 'Ko''mirda mangal',
    'grill гриль bbq skewer kebab шашлык мангал charcoal', 4, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'szaszlyk-z-wolowina',
    'Szaszłyk z wołowiną', 'Szaszłyk z wołowiną', 'Szaszłyk z wołowiną', 'Szaszłyk z wołowiną',
    'mięso wołowe, cebula, sos pomidorowy', 'beef, onion, tomato sauce', 'говядина, лук, томатный соус', 'mol go''shti, piyoz, pomidor sousi',
    27.99, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', 'шашлык говядина beef skewer'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'szaszlyk-z-baraniny',
    'Szaszłyk z baraniny', 'Szaszłyk z baraniny', 'Szaszłyk z baraniny', 'Szaszłyk z baraniny',
    'mięso baranie, tłuszcz baranie, cebula, sos pomidorowy', 'mutton, mutton fat, onion, tomato sauce', 'баранина, курдюк, лук, томатный соус', 'qo''y go''shti, dumba yog''i, piyoz, pomidor sousi',
    28.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', 'шашлык баранина mutton skewer'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'szaszlyk-z-jagnieciny',
    'Szaszłyk z jagnięciny', 'Szaszłyk z jagnięciny', 'Szaszłyk z jagnięciny', 'Szaszłyk z jagnięciny',
    'mięso jagnięce, tłuszcz jagnięce, cebula, sos pomidorowy', 'lamb, lamb fat, onion, tomato sauce', 'ягнятина, жир ягнёнка, лук, томатный соус', 'qo''zi go''shti, qo''zi yog''i, piyoz, pomidor sousi',
    33.99, 'PLN', null,
    true, 1, true, true,
    2, '{halal}', 'шашлык ягненок lamb skewer'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'lula-kebab',
    'Lula kebab', 'Lula kebab', 'Lula kebab', 'Lula kebab',
    'mięso wołowe mielone, cebula, sos pomidorowy', 'minced beef, onion, tomato sauce', 'говяжий фарш, лук, томатный соус', 'mol go''shti qiymasi, piyoz, pomidor sousi',
    22.99, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', 'люля кебаб lyulya'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'filet-z-kurczaka',
    'Filet z kurczaka', 'Filet z kurczaka', 'Filet z kurczaka', 'Filet z kurczaka',
    'filet z kurczaka, cebula, sos pomidorowy', 'chicken fillet, onion, tomato sauce', 'куриное филе, лук, томатный соус', 'tovuq filesi, piyoz, pomidor sousi',
    22.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', 'курица chicken'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'skrzydelka',
    'Skrzydełka', 'Skrzydełka', 'Skrzydełka', 'Skrzydełka',
    'skrzydełka z kurczaka, sos pomidorowy', 'chicken wings, tomato sauce', 'куриные крылышки, томатный соус', 'tovuq qanotlari, pomidor sousi',
    22.99, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', 'крылышки wings'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'rulet-z-wolowiny',
    'Rulet z wołowiny', 'Rulet z wołowiny', 'Rulet z wołowiny', 'Rulet z wołowiny',
    'mięso wołowe, tłuszcz baranie, cebula, sos pomidorowy', 'beef, mutton fat, onion, tomato sauce', 'говядина, курдюк, лук, томатный соус', 'mol go''shti, dumba yog''i, piyoz, pomidor sousi',
    46.99, 'PLN', null,
    false, 0, true, true,
    6, '{halal}', 'рулет roll'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kotleciki-z-baraniny',
    'Kotleciki z baraniny', 'Kotleciki z baraniny', 'Kotleciki z baraniny', 'Kotleciki z baraniny',
    'mięso baranie, sałatka, cebula, sos pomidorowy', 'mutton chops, salad, onion, tomato sauce', 'бараньи котлетки, салат, лук, томатный соус', 'qo''y go''shti kotletlari, salat, piyoz, pomidor sousi',
    49.99, 'PLN', null,
    false, 0, true, true,
    7, '{halal}', 'котлетки баранина'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kotleciki-jagniece',
    'Kotleciki jagnięce', 'Kotleciki jagnięce', 'Kotleciki jagnięce', 'Kotleciki jagnięce',
    'mięso jagnięce, sałatka, cebula, sos pomidorowy', 'lamb chops, salad, onion, tomato sauce', 'котлетки из ягнёнка, салат, лук, томатный соус', 'qo''zi go''shti kotletlari, salat, piyoz, pomidor sousi',
    59.99, 'PLN', null,
    false, 0, true, true,
    8, '{halal}', 'котлетки ягненок'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'warzywa-na-grilu',
    'Warzywa na grilu', 'Warzywa na grilu', 'Warzywa na grilu', 'Warzywa na grilu',
    'bakłażan, cukinia, kukurydza, papryka mix', 'aubergine, courgette, sweetcorn, mixed peppers', 'баклажан, кабачок, кукуруза, микс перцев', 'baqlajon, qovoqcha, makkajo''xori, aralash qalampir',
    19.00, 'PLN', null,
    false, 0, true, true,
    9, '{halal}', 'овощи vegetables'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'mix-guzar-garden',
    'Mix „Guzar Garden”', 'Mix „Guzar Garden”', 'Mix „Guzar Garden”', 'Mix „Guzar Garden”',
    'wielki półmisek z grilla — szaszłyki, kotleciki, lula kebab, kurczak i warzywa', 'a grand grill platter — skewers, chops, lula kebab, chicken and vegetables', 'большое блюдо с гриля — шашлыки, котлетки, люля-кебаб, курица и овощи', 'katta mangal likobi — shashlik, kotletlar, lula kabob, tovuq va sabzavotlar',
    275.00, 'PLN', 'na 3 osoby / for 3',
    true, 5, true, true,
    10, '{halal}', 'микс mix platter ассорти'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Dania gotowane na parze (4 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'parze', 'Dania gotowane na parze', 'Steamed', 'На пару', 'Bug''da pishirilgan',
    'steamed на пару dumpling dumplings пельмени вареное', 5, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'manty',
    'Manty', 'Manty', 'Manty', 'Manty',
    'gotowane na parze, wołowina w środku', 'steamed, filled with beef', 'на пару, с говядиной', 'bug''da pishirilgan, ichida mol go''shti',
    29.99, 'PLN', '6 zł / szt',
    true, 3, true, true,
    0, '{halal}', 'манты manti'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'manty-z-szpinakiem',
    'Manty z szpinakiem', 'Manty z szpinakiem', 'Manty z szpinakiem', 'Manty z szpinakiem',
    'pierogi z szpinakiem gotowane na parze', 'steamed spinach dumplings', 'манты со шпинатом на пару', 'ismaloqli bug''da pishirilgan manti',
    29.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', 'манты шпинат spinach'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'gulmanti',
    'Gulmanti', 'Gulmanti', 'Gulmanti', 'Gulmanti',
    'ciasto zawijane, w środku mięso wołowe, cebula, przyprawy, gotowane na parze, podawane z jogurtem', 'rolled dough filled with beef, onion and spices, steamed, served with yoghurt', 'завёрнутое тесто с говядиной, луком и специями, на пару, с йогуртом', 'ichida mol go''shti, piyoz va ziravorlar bo''lgan o''ralgan xamir, bug''da pishirilgan, qatiq bilan',
    29.99, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', 'гулманты gulmanti'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'chonim',
    'Chonim', 'Chonim', 'Chonim', 'Chonim',
    'ciasto zawijane, w środku mięso wołowe, cebula, ziemniaki, przyprawy, gotowane na parze, podawane z jogurtem', 'rolled dough filled with beef, onion, potato and spices, steamed, served with yoghurt', 'завёрнутое тесто с говядиной, луком, картофелем и специями, на пару, с йогуртом', 'ichida mol go''shti, piyoz, kartoshka va ziravorlar bo''lgan o''ralgan xamir, bug''da pishirilgan, qatiq bilan',
    29.99, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', 'хоним khonim'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Zestawy (6 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'zestawy', 'Zestawy', 'Sets', 'Сеты', 'Setlar',
    'set sets сет комбо combo lunch obiad бизнес-ланч', 6, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'plow-zestaw',
    'Plow zestaw', 'Plow zestaw', 'Plow zestaw', 'Plow zestaw',
    'plow, szakarob, pół chleba, filiżanka herbaty', 'plov, shakarob salad, half a loaf, a cup of tea', 'плов, шакароб, половина лепёшки, чашка чая', 'palov, shakarob salati, yarim non, bir piyola choy',
    34.99, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'manty-zestaw',
    'Manty zestaw', 'Manty zestaw', 'Manty zestaw', 'Manty zestaw',
    'manty, bulion, pół chleba, filiżanka herbaty', 'manti, broth, half a loaf, a cup of tea', 'манты, бульон, половина лепёшки, чашка чая', 'manti, bulyon, yarim non, bir piyola choy',
    35.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'samsa-zestaw',
    'Samsa zestaw', 'Samsa zestaw', 'Samsa zestaw', 'Samsa zestaw',
    '3 sztuki samsy, bulion, filiżanka herbaty', '3 samsa, broth, a cup of tea', '3 самсы, бульон, чашка чая', '3 dona somsa, bulyon, bir piyola choy',
    35.99, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'lagman-zestaw',
    'Lagman zestaw', 'Lagman zestaw', 'Lagman zestaw', 'Lagman zestaw',
    'lagman smażony, szakarob, pół chleba, filiżanka herbaty', 'fried lagman, shakarob salad, half a loaf, a cup of tea', 'жареный лагман, шакароб, половина лепёшки, чашка чая', 'qovurilgan lag''mon, shakarob salati, yarim non, bir piyola choy',
    38.99, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'tabaka-zestaw',
    'Tabaka zestaw', 'Tabaka zestaw', 'Tabaka zestaw', 'Tabaka zestaw',
    'tabaka, pół porcji sałaty oliwie, pół chleba, filiżanka herbaty', 'tabaka chicken, half an Olivier salad, half a loaf, a cup of tea', 'табака, полпорции салата оливье, половина лепёшки, чашка чая', 'tabaka tovuq, yarim porsiya olivye salati, yarim non, bir piyola choy',
    44.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'kazan-kebab-zestaw',
    'Kazan kebab zestaw', 'Kazan kebab zestaw', 'Kazan kebab zestaw', 'Kazan kebab zestaw',
    'kazan kebab, szakarob, pół chleba, filiżanka herbaty', 'kazan kebab, shakarob salad, half a loaf, a cup of tea', 'казан-кебаб, шакароб, половина лепёшки, чашка чая', 'qozon kabob, shakarob salati, yarim non, bir piyola choy',
    51.99, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Chleb (5 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'chleb', 'Chleb', 'Bread', 'Хлеб', 'Non',
    'bread хлеб лепешка лепёшка non nan patir', 7, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'chleb',
    'Chleb', 'Chleb', 'Chleb', 'Chleb',
    'chleb uzbecki z pieca tandoor', 'Uzbek tandoor bread', 'узбекская лепёшка из тандыра', 'tandirda pishirilgan o''zbek noni',
    8.00, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', 'хлеб лепешка non nan'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'pol-chleba',
    'Pół chleba', 'Pół chleba', 'Pół chleba', 'Pół chleba',
    null, 'half a loaf', 'половина лепёшки', 'yarim non',
    4.00, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', 'полхлеба half'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'patir',
    'Patir', 'Patir', 'Patir', 'Patir',
    'tradycyjny chleb w maśle klarowanym', 'traditional bread made with clarified butter', 'традиционная лепёшка на топлёном масле', 'sariyog''da tayyorlangan an''anaviy non',
    16.99, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', 'патыр patir'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'katlama-patir',
    'Katlama patir', 'Katlama patir', 'Katlama patir', 'Katlama patir',
    'ciasto francuskie, w maśle klarowanym', 'flaky pastry bread with clarified butter', 'слоёная лепёшка на топлёном масле', 'sariyog''li qatlama non',
    12.00, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', 'катлама katlama'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'chleb-assorti',
    'Chleb „Assorti”', 'Chleb „Assorti”', 'Chleb „Assorti”', 'Chleb „Assorti”',
    'chleb uzbecki, bagietka, patir, chleb dietetyczny', 'Uzbek bread, baguette, patir, diet bread', 'узбекская лепёшка, багет, патыр, диетический хлеб', 'o''zbek noni, bagett, patir, parhez non',
    17.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', 'ассорти assorti'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Dodatki i sosy (9 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'dodatki', 'Dodatki i sosy', 'Sides & sauces', 'Гарниры и соусы', 'Garnirlar va souslar',
    'side sides гарнир sauce соус dip приправа', 8, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'ryz-z-warzywami',
    'Ryż z warzywami', 'Ryż z warzywami', 'Ryż z warzywami', 'Ryż z warzywami',
    null, 'rice with vegetables', 'рис с овощами', 'sabzavotli guruch',
    11.99, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', 'рис rice'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'frytki',
    'Frytki', 'Frytki', 'Frytki', 'Frytki',
    null, 'french fries', 'картофель фри', 'fri kartoshka',
    11.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', 'фри fries'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'tartar',
    'Tartar', 'Tartar', 'Tartar', 'Tartar',
    'majonez, koperek, ogórek kiszony, czosnek, woda, śmietana', 'mayonnaise, dill, pickled cucumber, garlic, water, sour cream', 'майонез, укроп, солёный огурец, чеснок, вода, сметана', 'mayonez, ukrop, tuzlangan bodring, sarimsoq, suv, qaymoq',
    5.00, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'czimmiczuri',
    'Czimmiczuri', 'Czimmiczuri', 'Czimmiczuri', 'Czimmiczuri',
    'olej oliwkowy, olej słonecznikowy, pietruszka, cebula czerwona, czosnek, ocet jabłkowy, cytrynka, papryka słodka oraz ostra, cukier', 'olive and sunflower oil, parsley, red onion, garlic, cider vinegar, lemon, sweet and hot paprika, sugar', 'оливковое и подсолнечное масло, петрушка, красный лук, чеснок, яблочный уксус, лимон, сладкая и острая паприка, сахар', 'zaytun va kungaboqar moyi, petrushka, qizil piyoz, sarimsoq, olma sirkasi, limon, shirin va achchiq qalampir, shakar',
    5.00, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'czosnkowy',
    'Czosnkowy', 'Czosnkowy', 'Czosnkowy', 'Czosnkowy',
    'majonez, jogurt, czosnek, cytrynka, koperek', 'mayonnaise, yoghurt, garlic, lemon, dill', 'майонез, йогурт, чеснок, лимон, укроп', 'mayonez, qatiq, sarimsoq, limon, ukrop',
    5.00, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'meksykanski',
    'Meksykanski', 'Meksykanski', 'Meksykanski', 'Meksykanski',
    'pomidor, cebula czerwona, sól, kmin rzymski, jalapeño, cukier, olej słonecznikowy, limonka, olej oliwkowy', 'tomato, red onion, salt, cumin, jalapeño, sugar, sunflower oil, lime, olive oil', 'помидор, красный лук, соль, зира, халапеньо, сахар, подсолнечное масло, лайм, оливковое масло', 'pomidor, qizil piyoz, tuz, zira, jalapenyo, shakar, kungaboqar moyi, laym, zaytun moyi',
    5.00, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'lazi',
    'Lazi’', 'Lazi’', 'Lazi’', 'Lazi’',
    'ostry sos w stylu ujgurskim', 'hot Uyghur-style chilli sauce', 'острый соус в уйгурском стиле', 'uyg''urcha achchiq sous',
    5.00, 'PLN', null,
    false, 0, true, true,
    6, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'pomidorowy',
    'Pomidorowy', 'Pomidorowy', 'Pomidorowy', 'Pomidorowy',
    null, 'tomato sauce', 'томатный соус', 'pomidor sousi',
    5.00, 'PLN', null,
    false, 0, true, true,
    7, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'jogurt',
    'Jogurt', 'Jogurt', 'Jogurt', 'Jogurt',
    null, 'plain yoghurt', 'натуральный йогурт', 'toza qatiq',
    6.00, 'PLN', null,
    false, 0, true, true,
    8, '{halal}', 'йогурт yoghurt'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Desery (6 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'desery', 'Desery', 'Desserts', 'Десерты', 'Shirinliklar',
    'dessert десерт sweet сладкое cake торт пирожное', 9, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'napoleon',
    'Napoleon', 'Napoleon', 'Napoleon', 'Napoleon',
    null, null, null, null,
    23.99, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', 'наполеон'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'sernik',
    'Sernik', 'Sernik', 'Sernik', 'Sernik',
    'cheesecake', 'cheesecake', 'чизкейк', 'chizkeyk',
    23.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', 'чизкейк'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'medowik',
    'Medowik', 'Medowik', 'Medowik', 'Medowik',
    'tort miodowy', 'honey cake', 'медовик', 'asalli tort',
    23.99, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', 'медовик'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'karmelowy',
    'Karmelowy', 'Karmelowy', 'Karmelowy', 'Karmelowy',
    null, 'caramel cake', 'карамельный торт', 'karamelli tort',
    23.99, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', 'карамель caramel'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'spartak',
    'Spartak', 'Spartak', 'Spartak', 'Spartak',
    'tort czekoladowy', 'chocolate cake', 'шоколадный торт', 'shokoladli tort',
    23.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', 'спартак'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'deser-dnia',
    'Deser dnia', 'Deser dnia', 'Deser dnia', 'Deser dnia',
    'pytaj kelnera', 'ask your waiter', 'спросите у официанта', 'ofitsiantdan so''rang',
    null, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', 'десерт дня of the day'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Napoje zimne (13 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'napoje', 'Napoje zimne', 'Cold drinks', 'Холодные напитки', 'Sovuq ichimliklar',
    'drink drinks напиток напитки soft cold холодные lemoniada', 10, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'coca-cola',
    'Coca-Cola', 'Coca-Cola', 'Coca-Cola', 'Coca-Cola',
    'klasyczna lub zero do wyboru', 'classic or zero', 'классическая или zero', 'klassik yoki zero',
    8.99, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'pepsi',
    'Pepsi', 'Pepsi', 'Pepsi', 'Pepsi',
    null, null, null, null,
    8.99, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'fanta',
    'Fanta', 'Fanta', 'Fanta', 'Fanta',
    null, null, null, null,
    8.99, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'mirinda',
    'Mirinda', 'Mirinda', 'Mirinda', 'Mirinda',
    null, null, null, null,
    8.99, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'sprite',
    'Sprite', 'Sprite', 'Sprite', 'Sprite',
    null, null, null, null,
    8.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, '7-up',
    '7-UP', '7-UP', '7-UP', '7-UP',
    null, null, null, null,
    8.99, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'fuze-tea',
    'Fuze tea', 'Fuze tea', 'Fuze tea', 'Fuze tea',
    'zielona lub czarna do wyboru', 'green or black', 'зелёный или чёрный', 'yashil yoki qora',
    8.99, 'PLN', null,
    false, 0, true, true,
    6, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'lipton',
    'Lipton', 'Lipton', 'Lipton', 'Lipton',
    'zielona lub czarna do wyboru', 'green or black', 'зелёный или чёрный', 'yashil yoki qora',
    8.99, 'PLN', null,
    false, 0, true, true,
    7, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'sok',
    'Sok', 'Sok', 'Sok', 'Sok',
    'jabłkowy, pomarańczowy, grejpfrutowy', 'apple, orange, grapefruit', 'яблочный, апельсиновый, грейпфрутовый', 'olma, apelsin, greypfrut',
    8.99, 'PLN', null,
    false, 0, true, true,
    8, '{halal}', 'сок juice'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'ayran',
    'Ayran', 'Ayran', 'Ayran', 'Ayran',
    null, 'salted yoghurt drink', 'айран', 'ayron',
    10.00, 'PLN', null,
    false, 0, true, true,
    9, '{halal}', 'айран ayran'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'woda',
    'Woda', 'Woda', 'Woda', 'Woda',
    'gazowana lub niegazowana do wyboru', 'sparkling or still', 'газированная или негазированная', 'gazli yoki gazsiz',
    6.99, 'PLN', null,
    false, 0, true, true,
    10, '{halal}', 'вода water'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'natakhtari',
    'Natakhtari', 'Natakhtari', 'Natakhtari', 'Natakhtari',
    'estragon, gruszka, kremowy, winogrono, cytryna-limonka, feijoa', 'tarragon, pear, cream, grape, lemon-lime, feijoa', 'тархун, груша, сливочный, виноград, лимон-лайм, фейхоа', 'tarxun, nok, kremli, uzum, limon-laym, feyxoa',
    11.99, 'PLN', null,
    false, 0, true, true,
    11, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'borjomi',
    'Borjomi', 'Borjomi', 'Borjomi', 'Borjomi',
    'gruzińska woda mineralna', 'Georgian mineral water', 'грузинская минеральная вода', 'gruzin mineral suvi',
    12.00, 'PLN', null,
    false, 0, true, true,
    12, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Herbaty i kawa (12 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'herbaty', 'Herbaty i kawa', 'Tea & coffee', 'Чай и кофе', 'Choy va qahva',
    'tea чай coffee кофе hot горячие napoje', 11, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'herbata-zielona',
    'Herbata zielona', 'Herbata zielona', 'Herbata zielona', 'Herbata zielona',
    null, 'green tea', 'зелёный чай', 'yashil choy',
    8.99, 'PLN', '1 L',
    false, 0, true, true,
    0, '{halal}', 'зеленый чай green tea'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'herbata-czarna',
    'Herbata czarna', 'Herbata czarna', 'Herbata czarna', 'Herbata czarna',
    null, 'black tea', 'чёрный чай', 'qora choy',
    8.99, 'PLN', '1 L',
    false, 0, true, true,
    1, '{halal}', 'черный чай black tea'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'herbata-z-cytryna',
    'Herbata z cytryną', 'Herbata z cytryną', 'Herbata z cytryną', 'Herbata z cytryną',
    null, 'tea with lemon', 'чай с лимоном', 'limonli choy',
    13.99, 'PLN', '1 L',
    false, 0, true, true,
    2, '{halal}', 'чай лимон lemon'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'herbata-taszkentska',
    'Herbata taszkentska', 'Herbata taszkentska', 'Herbata taszkentska', 'Herbata taszkentska',
    null, 'Tashkent-style tea', 'ташкентский чай', 'toshkentcha choy',
    18.99, 'PLN', '1 L',
    true, 6, true, true,
    3, '{halal}', 'ташкентский чай tashkent'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'espresso',
    'Espresso', 'Espresso', 'Espresso', 'Espresso',
    null, null, null, null,
    9.99, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'doppio',
    'Doppio', 'Doppio', 'Doppio', 'Doppio',
    null, null, null, null,
    9.99, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'macchiato',
    'Macchiato', 'Macchiato', 'Macchiato', 'Macchiato',
    null, null, null, null,
    9.99, 'PLN', null,
    false, 0, true, true,
    6, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'americano',
    'Americano', 'Americano', 'Americano', 'Americano',
    null, 'small or large', 'маленький или большой', 'kichik yoki katta',
    9.99, 'PLN', 'mała / duża',
    false, 0, true, true,
    7, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'cappuccino',
    'Cappuccino', 'Cappuccino', 'Cappuccino', 'Cappuccino',
    null, 'small or large', 'маленький или большой', 'kichik yoki katta',
    9.99, 'PLN', 'mała / duża',
    false, 0, true, true,
    8, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'biala-kawa',
    'Biała kawa', 'Biała kawa', 'Biała kawa', 'Biała kawa',
    null, 'small or large', 'маленький или большой', 'kichik yoki katta',
    9.99, 'PLN', 'mała / duża',
    false, 0, true, true,
    9, '{halal}', 'латте flat white молоко'
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'flat-white',
    'Flat White', 'Flat White', 'Flat White', 'Flat White',
    null, null, null, null,
    9.99, 'PLN', null,
    false, 0, true, true,
    10, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'latte',
    'Latte', 'Latte', 'Latte', 'Latte',
    null, null, null, null,
    9.99, 'PLN', null,
    false, 0, true, true,
    11, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Mocktails (8 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'mocktails', 'Mocktails', 'Mocktails', 'Моктейли', 'Mokteyllar',
    'mocktail моктейль cocktail коктейль bezalkoholowy безалкогольный', 12, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'mojito',
    'Mojito', 'Mojito', 'Mojito', 'Mojito',
    'woda gazowana, mięta, limonka', 'sparkling water, mint, lime', 'газированная вода, мята, лайм', 'gazli suv, yalpiz, laym',
    15.00, 'PLN', null,
    false, 0, true, true,
    0, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'mojito-truskawkowy',
    'Mojito truskawkowy', 'Mojito truskawkowy', 'Mojito truskawkowy', 'Mojito truskawkowy',
    'woda gazowana, mięta, limonka, syrop truskawkowy', 'sparkling water, mint, lime, strawberry syrup', 'газированная вода, мята, лайм, клубничный сироп', 'gazli suv, yalpiz, laym, qulupnay siropi',
    16.00, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'pina-colada',
    'Pina Colada', 'Pina Colada', 'Pina Colada', 'Pina Colada',
    'syrop coconut, syrop bananowy, sok ananasowy, sok pomarańczowy, woda gazowana', 'coconut syrup, banana syrup, pineapple juice, orange juice, sparkling water', 'кокосовый сироп, банановый сироп, ананасовый сок, апельсиновый сок, газированная вода', 'kokos siropi, banan siropi, ananas sharbati, apelsin sharbati, gazli suv',
    19.00, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'green-garden-highball',
    'Green Garden Highball', 'Green Garden Highball', 'Green Garden Highball', 'Green Garden Highball',
    null, null, null, null,
    21.00, 'PLN', null,
    false, 0, true, true,
    3, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'baziliko',
    'Baziliko', 'Baziliko', 'Baziliko', 'Baziliko',
    null, null, null, null,
    21.00, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'apperetivo-spritz',
    'Apperetivo Spritz', 'Apperetivo Spritz', 'Apperetivo Spritz', 'Apperetivo Spritz',
    null, null, null, null,
    23.00, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'aperitivo-sour',
    'Aperitivo Sour', 'Aperitivo Sour', 'Aperitivo Sour', 'Aperitivo Sour',
    null, null, null, null,
    24.00, 'PLN', null,
    false, 0, true, true,
    6, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'hugo-cucumber-spritz',
    'Hugo Cucumber Spritz', 'Hugo Cucumber Spritz', 'Hugo Cucumber Spritz', 'Hugo Cucumber Spritz',
    null, null, null, null,
    28.00, 'PLN', null,
    false, 0, true, true,
    7, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  -- ---- Guzar Specials (6 dishes) ----
  insert into menu_categories (
    venue_id, slug, name_pl, name_en, name_ru, name_uz,
    search_aliases, display_order, is_published
  ) values (
    v_venue, 'specials', 'Guzar Specials', 'Guzar Specials', 'Guzar Specials', 'Guzar Specials',
    'special specials спешл signature фирменный', 13, true
  )
  on conflict (venue_id, slug) do update set
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    search_aliases = excluded.search_aliases,
    display_order = excluded.display_order
  returning id into v_cat;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'silk-espresso',
    'Silk Espresso', 'Silk Espresso', 'Silk Espresso', 'Silk Espresso',
    'wschodnia kawa na poranek po długiej podróży — aksamit, ciepło i subtelna nuta odległych przypraw', 'an eastern coffee for the morning after a long journey — velvet, warmth and a faint note of distant spice', 'восточный кофе на утро после долгой дороги — бархат, тепло и лёгкая нота далёких специй', 'uzoq safardan keyingi tong uchun sharq qahvasi — baxmal, iliqlik va uzoq ziravorlarning nozik ohangi',
    14.00, 'PLN', null,
    true, 7, true, true,
    0, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'sultans-mary',
    'Sultan’s Mary', 'Sultan’s Mary', 'Sultan’s Mary', 'Sultan’s Mary',
    'pikantny i przyprawowy — pomidor z limonką, miodem i pieprzem odsłania głęboki smak z orientalnym ogniem', 'spicy and savoury — tomato with lime, honey and pepper opens into a deep flavour with an oriental fire', 'острый и пряный — помидор с лаймом, мёдом и перцем раскрывается глубоким вкусом с восточным огнём', 'achchiq va ziravorli — laym, asal va murch bilan pomidor sharqona olov bilan chuqur ta''mni ochadi',
    19.00, 'PLN', null,
    false, 0, true, true,
    1, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'pickle-me-softly',
    '„Pickle Me Softly”', '„Pickle Me Softly”', '„Pickle Me Softly”', '„Pickle Me Softly”',
    'świeży, zadziorny i pikantny — pietruszka, limonka i szczypta soli nadają pikantny orientalny charakter', 'fresh, cheeky and piquant — parsley, lime and a pinch of salt give it an oriental edge', 'свежий, дерзкий и пикантный — петрушка, лайм и щепотка соли придают восточный характер', 'yangi, quyuq va achchiq — petrushka, laym va bir chimdim tuz unga sharqona xarakter beradi',
    21.00, 'PLN', null,
    false, 0, true, true,
    2, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'cucumber-mint-ayran-fizz',
    'Cucumber & Mint Ayran Fizz', 'Cucumber & Mint Ayran Fizz', 'Cucumber & Mint Ayran Fizz', 'Cucumber & Mint Ayran Fizz',
    'orzeźwiający łyk koczowniczej oazy — chłód zieleni, lekka sól i aksamit mlecznej fali', 'a refreshing sip of a nomad oasis — cool green, a light salt and a velvet milky wave', 'освежающий глоток кочевого оазиса — прохлада зелени, лёгкая соль и бархат молочной волны', 'ko''chmanchi vohaning salqin bir qultumi — yashillik salqinligi, yengil tuz va sutli baxmal to''lqin',
    23.00, 'PLN', null,
    true, 8, true, true,
    3, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'sharbat-bloom',
    'Sharbat Bloom', 'Sharbat Bloom', 'Sharbat Bloom', 'Sharbat Bloom',
    'fiołkowy i lekki — delikatna kwaskowość limonki, miód i kwiatowy aromat w aksamitnej teksturze', 'violet and light — a delicate lime tartness, honey and floral aroma in a velvet texture', 'фиалковый и лёгкий — деликатная кислинка лайма, мёд и цветочный аромат в бархатной текстуре', 'binafsharang va yengil — laymning nozik nordonligi, asal va gulli xushbo''ylik baxmalsimon tuzilishda',
    27.00, 'PLN', null,
    false, 0, true, true,
    4, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

  insert into menu_items (
    venue_id, category_id, slug,
    name_pl, name_en, name_ru, name_uz,
    description_pl, description_en, description_ru, description_uz,
    price, currency, portion_text,
    is_signature, signature_order, is_available, is_published,
    display_order, dietary_tags, search_aliases
  ) values (
    v_venue, v_cat, 'uzbekistan-sour',
    'Uzbekistan Sour', 'Uzbekistan Sour', 'Uzbekistan Sour', 'Uzbekistan Sour',
    'soczysty jak granat na targu w Samarkandzie — wschodnia kwaskowość rozwija się na tle łagodnej miodowej słodyczy', 'as juicy as a pomegranate at a Samarkand market — an eastern tartness unfolding over gentle honey sweetness', 'сочный, как гранат на самаркандском базаре — восточная кислинка на фоне мягкой медовой сладости', 'Samarqand bozoridagi anordek sersuv — sharqona nordonlik mayin asal shirinligi fonida ochiladi',
    28.00, 'PLN', null,
    false, 0, true, true,
    5, '{halal}', ''
  )
  on conflict (venue_id, slug) do update set
    category_id = excluded.category_id,
    name_pl = excluded.name_pl, name_en = excluded.name_en,
    name_ru = excluded.name_ru, name_uz = excluded.name_uz,
    description_pl = excluded.description_pl,
    description_en = excluded.description_en,
    description_ru = excluded.description_ru,
    description_uz = excluded.description_uz,
    price = excluded.price, portion_text = excluded.portion_text,
    is_signature = excluded.is_signature,
    signature_order = excluded.signature_order,
    display_order = excluded.display_order,
    search_aliases = excluded.search_aliases;

end $$;
