-- =============================================================================
-- 0000 — Supabase compatibility shims
--
-- On Supabase these objects already exist and every statement here is a no-op.
-- On a plain PostgreSQL (what `npm run test:integration` runs against, and what
-- a self-hosted deployment starts from) they are created so the rest of the
-- migrations apply unchanged. Keeping the shim in its own file means the real
-- schema never has to care which of the two it is running on.
-- =============================================================================

create schema if not exists auth;

-- auth.users — only the columns this schema actually references.
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    create table auth.users (
      id         uuid primary key default gen_random_uuid(),
      email      text unique,
      created_at timestamptz not null default now()
    );
  end if;
end $$;

-- auth.uid() / auth.role() — Supabase reads these out of the request JWT. The
-- shim reads the same GUCs, so an integration test can impersonate a user with
--   set local request.jwt.claims = '{"sub":"…","role":"authenticated"}';
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'anon'
  );
$$;

-- The three Supabase roles. `nologin` is deliberate: they are assumed with
-- SET ROLE, never connected to directly.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
exception when insufficient_privilege then
  raise notice 'Skipping role creation — insufficient privileges (expected on hosted Supabase).';
end $$;

do $$
begin
  execute format('grant usage on schema public to anon, authenticated, service_role');
  execute format('grant usage on schema auth to anon, authenticated, service_role');
exception when others then null;
end $$;
