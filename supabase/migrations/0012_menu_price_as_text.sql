-- ---------------------------------------------------------------------------
-- 0012 — public_menu_items.price must reach the application as text.
--
-- `price` is numeric(10,2), and lib/menu/price.ts is built on the promise that
-- a price is a decimal *string* everywhere in TypeScript, never a float. That
-- promise held for node-postgres, which returns numeric as a string, so both
-- the unit suite and the integration suite agreed with it.
--
-- It did not hold for the path the running site actually uses. PostgREST
-- serialises numeric as a JSON number, so supabase-js handed the repository
-- 29 and 12.99 as JavaScript floats. minPrice() called .replace() on one of
-- them, threw, and app/(menu)/menu/page.tsx caught the error and rendered
-- "Karta dan jest chwilowo niedostepna" — the entire menu, for every locale,
-- for every visitor.
--
-- Casting in the view fixes it at the boundary rather than papering over it in
-- the client: the wire format becomes "29.00", exact and already in the shape
-- the TypeScript contract documents. lib/menu/price.ts is hardened alongside
-- this so a stray number can never take the page down again.
--
-- A view column's type cannot be changed by `create or replace view`, so the
-- view is dropped and rebuilt. security_invoker (set in 0008) and the table
-- privileges are re-applied explicitly, because a dropped view takes them with
-- it.
-- ---------------------------------------------------------------------------

drop view if exists public_menu_items;

create view public_menu_items as
  select
    i.id, i.venue_id, i.category_id, i.slug,
    i.name_pl, i.name_en, i.name_ru, i.name_uz,
    i.description_pl, i.description_en, i.description_ru, i.description_uz,
    -- to_char keeps the two decimal places numeric(10,2) guarantees, so "29"
    -- arrives as "29.00" rather than as "29".
    to_char(i.price, 'FM9999999990.00') as price,
    i.currency, i.portion_text,
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

-- The public menu view must run with the reader's own privileges, otherwise it
-- would hand anon everything the view owner can see. (Restated from 0008; the
-- drop above discarded it.)
alter view public_menu_items set (security_invoker = on);

grant select on public_menu_items to anon, authenticated, service_role;
