-- Prosto z Roli — migracja 1: rozszerzenia, typy, funkcje pomocnicze, słowniki
-- Zasada: schemat `private` nie jest wystawiony przez API (PostgREST), trzyma helpery i liczniki.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- ---------------------------------------------------------------- typy
create type public.seller_type as enum ('private', 'farm', 'company');
create type public.listing_kind as enum ('product', 'service');
create type public.listing_status as enum ('draft', 'pending_review', 'active', 'paused', 'expired', 'removed', 'blocked');
create type public.restriction_level as enum ('none', 'analysis_pending', 'blocked');
create type public.price_type as enum ('fixed', 'negotiable');
create type public.admin_role as enum ('moderator', 'admin', 'superadmin');
create type public.word_action as enum ('reject', 'review');

-- ---------------------------------------------------------------- helpery
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- unaccent nie jest IMMUTABLE; wrapper z jawnym słownikiem można indeksować
create or replace function private.normalize_text(p text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, '')));
$$;

-- liczniki limitów (stałe okna czasowe); poza API
create table private.rate_counters (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, action, window_start)
);

create or replace function private.check_rate(p_action text, p_limit int, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_secs double precision := extract(epoch from p_window);
  v_start timestamptz;
  v_hits int;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);
  insert into private.rate_counters as rc (user_id, action, window_start, hits)
  values (v_uid, p_action, v_start, 1)
  on conflict (user_id, action, window_start) do update set hits = rc.hits + 1
  returning hits into v_hits;
  if v_hits > p_limit then
    raise exception 'rate_limit:%', p_action using errcode = 'P0429';
  end if;
end $$;

-- ---------------------------------------------------------------- role administracyjne
create table public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null default 'moderator',
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.admin_roles enable row level security;

-- Uprawnienia admina wymagają sesji po 2FA (aal2) — egzekwowane w bazie, nie w kliencie.
create or replace function private.is_admin(p_min public.admin_role default 'moderator')
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_roles ar
    where ar.user_id = auth.uid() and ar.role >= p_min
  ) and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- Czy użytkownik MA rolę (bez wymogu 2FA) — tylko do pokazania wejścia do panelu i prośby o 2FA.
create or replace function public.my_admin_role()
returns public.admin_role language sql stable security definer set search_path = '' as $$
  select role from public.admin_roles where user_id = auth.uid();
$$;

revoke all on function private.is_admin(public.admin_role) from public;
grant execute on function private.is_admin(public.admin_role) to anon, authenticated;
revoke all on function public.my_admin_role() from public, anon;
grant execute on function public.my_admin_role() to authenticated;
revoke all on function private.check_rate(text, int, interval) from public;
grant execute on function private.check_rate(text, int, interval) to authenticated;

create policy admin_roles_select on public.admin_roles for select to authenticated
  using (private.is_admin('superadmin'));
create policy admin_roles_write on public.admin_roles for all to authenticated
  using (private.is_admin('superadmin')) with check (private.is_admin('superadmin'));

-- ---------------------------------------------------------------- kategorie
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  kind public.listing_kind not null default 'product',
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null check (char_length(icon) between 1 and 40),
  sort int not null default 100,
  restriction_level public.restriction_level not null default 'none',
  restriction_message text check (char_length(restriction_message) <= 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated_at before update on public.categories
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------- jednostki
create table public.product_units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{1,20}$'),
  name text not null check (char_length(name) between 1 and 30),
  short_name text not null check (char_length(short_name) between 1 and 10),
  kind public.listing_kind not null default 'product',
  sort int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger product_units_updated_at before update on public.product_units
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------- katalog produktów i usług
create table public.product_catalog (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  synonyms text[] not null default '{}',
  default_unit_id uuid references public.product_units (id) on delete set null,
  sort int not null default 100,
  is_active boolean not null default true,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index product_catalog_name_uq on public.product_catalog (category_id, lower(name));
create index product_catalog_category_idx on public.product_catalog (category_id);
create index product_catalog_unit_idx on public.product_catalog (default_unit_id);
create index product_catalog_search_idx on public.product_catalog using gin (search_text extensions.gin_trgm_ops);

create or replace function private.product_catalog_search_text()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.search_text := private.normalize_text(new.name || ' ' || array_to_string(new.synonyms, ' '));
  return new;
end $$;
create trigger product_catalog_search before insert or update of name, synonyms on public.product_catalog
  for each row execute function private.product_catalog_search_text();
create trigger product_catalog_updated_at before update on public.product_catalog
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------- miejscowości (TERYT SIMC + PRG)
create table public.places (
  id bigint generated always as identity primary key,
  simc text unique,
  name text not null,
  commune text,
  county text,
  voivodeship text,
  kind text,
  population int,
  location extensions.geography(Point, 4326) not null,
  search_text text not null
);
create index places_search_idx on public.places using gin (search_text extensions.gin_trgm_ops);
create index places_location_idx on public.places using gist (location);

-- ---------------------------------------------------------------- filtr słów
create table public.blocked_words (
  id uuid primary key default gen_random_uuid(),
  pattern text not null unique check (char_length(pattern) between 2 and 60),
  action public.word_action not null default 'reject',
  applies_to_listings boolean not null default true,
  applies_to_messages boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger blocked_words_updated_at before update on public.blocked_words
  for each row execute function private.set_updated_at();

create or replace function private.normalize_blocked_word()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.pattern := private.normalize_text(trim(new.pattern));
  return new;
end $$;
create trigger blocked_words_normalize before insert or update of pattern on public.blocked_words
  for each row execute function private.normalize_blocked_word();

-- Zwraca najsurowszą akcję dla tekstu: 'reject' > 'review' > null
create or replace function private.word_filter(p_text text, p_target text)
returns public.word_action language sql stable security definer set search_path = '' as $$
  select bw.action
  from public.blocked_words bw
  where private.normalize_text(p_text) like '%' || bw.pattern || '%'
    and case p_target when 'listing' then bw.applies_to_listings else bw.applies_to_messages end
  order by (bw.action = 'reject') desc
  limit 1;
$$;
revoke all on function private.word_filter(text, text) from public;

-- ---------------------------------------------------------------- RLS słowników
alter table public.categories enable row level security;
alter table public.product_units enable row level security;
alter table public.product_catalog enable row level security;
alter table public.places enable row level security;
alter table public.blocked_words enable row level security;

create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or private.is_admin());
create policy categories_admin on public.categories for all to authenticated
  using (private.is_admin('admin')) with check (private.is_admin('admin'));

create policy units_read on public.product_units for select to anon, authenticated
  using (is_active or private.is_admin());
create policy units_admin on public.product_units for all to authenticated
  using (private.is_admin('admin')) with check (private.is_admin('admin'));

create policy catalog_read on public.product_catalog for select to anon, authenticated
  using (is_active or private.is_admin());
create policy catalog_admin on public.product_catalog for all to authenticated
  using (private.is_admin('admin')) with check (private.is_admin('admin'));

create policy places_read on public.places for select to anon, authenticated using (true);

create policy blocked_words_admin on public.blocked_words for all to authenticated
  using (private.is_admin('admin')) with check (private.is_admin('admin'));

-- słowniki: klienci tylko czytają, zapis przez RLS dla adminów
revoke insert, update, delete, truncate on public.places from anon, authenticated;
revoke all on public.blocked_words from anon;
revoke all on public.admin_roles from anon;
