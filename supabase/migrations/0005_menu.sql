-- =============================================================================
-- 0005 — menu categories and items
--
-- Replaces the hardcoded SECTIONS array that used to live inside menu.html.
-- Polish is the source language; the other three fall back to it at read time
-- (lib/i18n/fallback.ts) and the staff UI marks the gap rather than hiding it.
-- =============================================================================

create table if not exists menu_categories (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references venues (id) on delete cascade,
  slug           text not null,            -- 'grill', 'zupy' … drives /menu#grill
  name_pl        text not null,
  name_en        text,
  name_ru        text,
  name_uz        text,
  description_pl text,
  description_en text,
  description_ru text,
  description_uz text,
  -- Extra words the search index folds in, so "шашлык" or "skewer" finds Grill.
  search_aliases text not null default '',
  display_order  int  not null default 0,
  is_published   boolean not null default true,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint menu_categories_slug_unique unique (venue_id, slug),
  constraint menu_categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint menu_categories_name_present check (length(btrim(name_pl)) > 0)
);

drop trigger if exists menu_categories_touch on menu_categories;
create trigger menu_categories_touch before update on menu_categories
  for each row execute function gg_touch_updated_at();

create index if not exists menu_categories_public_idx
  on menu_categories (venue_id, display_order)
  where is_published and archived_at is null;

-- ---------------------------------------------------------------------------
-- menu_items
--
-- `price` is numeric(10,2). It is never a formatted string and never a float:
-- 12.99 zł must survive a round trip exactly, and binary floating point cannot
-- promise that. Formatting for display happens in lib/menu/price.ts.
-- ---------------------------------------------------------------------------
create table if not exists menu_items (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references venues (id) on delete cascade,
  category_id    uuid not null references menu_categories (id) on delete restrict,
  slug           text not null,

  name_pl        text not null,
  name_en        text,
  name_ru        text,
  name_uz        text,
  description_pl text,
  description_en text,
  description_ru text,
  description_uz text,

  -- Nullable on purpose: "Deser dnia" is priced at '—' on the printed menu
  -- (ask your waiter). Storing 0 would be a lie and storing a string would give
  -- up exactness for every other dish.
  price          numeric(10, 2),
  currency       char(3) not null default 'PLN',
  portion_text   text,                     -- '450 g', 'dodatek / extra'

  -- Photograph. Null means the generated dish art is used instead.
  image_path     text,
  image_width    int,
  image_height   int,
  image_mime     text,
  image_alt_pl   text,
  image_alt_en   text,
  image_alt_ru   text,
  image_alt_uz   text,
  -- 'ready' | 'processing' | 'failed'. While processing, the previous image
  -- keeps being served; the staff UI shows the state.
  image_status   text not null default 'ready',

  is_signature   boolean not null default false,   -- homepage "dishes people come back for"
  -- Order of the signature dishes on the homepage, independent of the menu order.
  signature_order int not null default 0,
  is_available   boolean not null default true,    -- false = sold out, still listed
  is_published   boolean not null default true,    -- false = draft/hidden
  display_order  int not null default 0,

  allergens      text[] not null default '{}',
  dietary_tags   text[] not null default '{}',     -- 'halal', 'vegetarian', 'vegan', 'spicy' …
  search_aliases text not null default '',

  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint menu_items_slug_unique unique (venue_id, slug),
  constraint menu_items_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint menu_items_price_nonneg check (price is null or price >= 0),
  constraint menu_items_name_present check (length(btrim(name_pl)) > 0),
  constraint menu_items_image_shape check (
    image_path is null
    or (image_width is not null and image_height is not null and image_mime is not null)
  ),
  constraint menu_items_image_status check (image_status in ('ready', 'processing', 'failed'))
);

drop trigger if exists menu_items_touch on menu_items;
create trigger menu_items_touch before update on menu_items
  for each row execute function gg_touch_updated_at();

create index if not exists menu_items_category_idx on menu_items (category_id, display_order);
create index if not exists menu_items_public_idx
  on menu_items (venue_id, category_id, display_order)
  where is_published and archived_at is null;
create index if not exists menu_items_signature_idx
  on menu_items (venue_id, signature_order)
  where is_signature and is_published and archived_at is null;

-- ---------------------------------------------------------------------------
-- The public read model.
--
-- One query renders the whole menu — 14 categories, ~127 dishes — instead of a
-- query per card. Drafts and archived rows never appear; a sold-out dish does,
-- with is_available = false, because taking it off the page would look like the
-- kitchen never made it.
-- ---------------------------------------------------------------------------
create or replace view public_menu_items as
  select
    i.id, i.venue_id, i.category_id, i.slug,
    i.name_pl, i.name_en, i.name_ru, i.name_uz,
    i.description_pl, i.description_en, i.description_ru, i.description_uz,
    i.price, i.currency, i.portion_text,
    i.image_path, i.image_width, i.image_height, i.image_mime,
    i.image_alt_pl, i.image_alt_en, i.image_alt_ru, i.image_alt_uz,
    i.is_signature, i.signature_order, i.is_available, i.display_order,
    i.allergens, i.dietary_tags, i.search_aliases,
    c.slug          as category_slug,
    c.name_pl       as category_name_pl,
    c.name_en       as category_name_en,
    c.name_ru       as category_name_ru,
    c.name_uz       as category_name_uz,
    c.display_order as category_display_order,
    c.search_aliases as category_search_aliases
  from menu_items i
  join menu_categories c on c.id = i.category_id
  where i.is_published
    and i.archived_at is null
    and c.is_published
    and c.archived_at is null;
