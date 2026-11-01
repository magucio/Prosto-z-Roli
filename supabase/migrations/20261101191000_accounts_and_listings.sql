-- Prosto z Roli — migracja 2: konta, ogłoszenia, pozycje, zdjęcia, kontakt, blokady, RPC ogłoszeń
-- Zasady: klient pisze tylko kolumny, na które dostał GRANT; status i terminy zmieniają wyłącznie RPC.
-- Dokładna lokalizacja i adres nie mają GRANT SELECT dla nikogo poza funkcjami serwerowymi.

-- ================================================================ profile
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  seller_type public.seller_type not null default 'private',
  avatar_path text check (char_length(avatar_path) <= 200),
  is_blocked boolean not null default false,
  blocked_until timestamptz,
  blocked_reason text check (char_length(blocked_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  v_type public.seller_type := 'private';
begin
  if v_name is null or char_length(v_name) < 2 then
    v_name := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  if char_length(coalesce(v_name, '')) < 2 then
    v_name := 'Użytkownik';
  end if;
  begin
    v_type := coalesce((new.raw_user_meta_data ->> 'seller_type')::public.seller_type, 'private');
  exception when others then
    v_type := 'private';
  end;
  insert into public.profiles (id, display_name, seller_type) values (new.id, left(v_name, 60), v_type);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.is_user_blocked(p_uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.is_blocked and (p.blocked_until is null or p.blocked_until > now())
     from public.profiles p where p.id = p_uid), false);
$$;
revoke all on function private.is_user_blocked(uuid) from public;
grant execute on function private.is_user_blocked(uuid) to authenticated;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select (id, display_name, seller_type, avatar_path, created_at) on public.profiles to anon, authenticated;
grant update (display_name, seller_type, avatar_path) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ================================================================ dane sprzedawcy (prywatne)
create table public.seller_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  farm_name text check (char_length(farm_name) <= 100),
  company_name text check (char_length(company_name) <= 150),
  nip text check (nip ~ '^[0-9]{10}$'),
  regon text check (regon ~ '^([0-9]{9}|[0-9]{14})$'),
  address_line text check (char_length(address_line) <= 200),
  postal_code text check (postal_code ~ '^[0-9]{2}-[0-9]{3}$'),
  city text check (char_length(city) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger seller_profiles_updated_at before update on public.seller_profiles
  for each row execute function private.set_updated_at();
alter table public.seller_profiles enable row level security;
revoke all on public.seller_profiles from anon;
create policy seller_profiles_own on public.seller_profiles for all to authenticated
  using (user_id = (select auth.uid()) or private.is_admin())
  with check (user_id = (select auth.uid()));

-- DSA art. 30 — dane identyfikacyjne przedsiębiorców; status ustawia wyłącznie admin (RPC)
create table public.trader_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 2 and 200),
  address text not null check (char_length(address) between 5 and 300),
  phone text not null check (phone ~ '^\+?[0-9 ]{9,16}$'),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  trade_register text check (char_length(trade_register) <= 100),
  registration_number text check (char_length(registration_number) <= 50),
  self_certification boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  relationship_ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trader_verifications_updated_at before update on public.trader_verifications
  for each row execute function private.set_updated_at();
alter table public.trader_verifications enable row level security;
revoke all on public.trader_verifications from anon, authenticated;
grant select on public.trader_verifications to authenticated;
grant insert (user_id, legal_name, address, phone, email, trade_register, registration_number, self_certification)
  on public.trader_verifications to authenticated;
grant update (legal_name, address, phone, email, trade_register, registration_number, self_certification)
  on public.trader_verifications to authenticated;
create policy trader_verifications_read on public.trader_verifications for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());
create policy trader_verifications_insert on public.trader_verifications for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy trader_verifications_update on public.trader_verifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Formy sprzedaży żywności (SB / RHD / MLO / zakład) — w v1 nieużywane, kategorie zablokowane
create table public.seller_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  form text not null check (form in ('SB', 'RHD', 'MLO', 'ZAKLAD')),
  vet_number text check (char_length(vet_number) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, form)
);
create trigger seller_registrations_updated_at before update on public.seller_registrations
  for each row execute function private.set_updated_at();
alter table public.seller_registrations enable row level security;
revoke all on public.seller_registrations from anon;
create policy seller_registrations_own on public.seller_registrations for all to authenticated
  using (user_id = (select auth.uid()) or private.is_admin())
  with check (user_id = (select auth.uid()));

-- ================================================================ blokady użytkowników
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon;
revoke update on public.user_blocks from authenticated;
create policy user_blocks_own_read on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy user_blocks_own_insert on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy user_blocks_own_delete on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function private.is_blocked_between(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;
revoke all on function private.is_blocked_between(uuid, uuid) from public;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;

-- ================================================================ ogłoszenia
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_kind public.listing_kind not null default 'product',
  title text not null check (char_length(title) between 5 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  main_category_id uuid not null references public.categories (id),
  seller_name text not null check (char_length(seller_name) between 2 and 60),
  location_exact extensions.geography(Point, 4326) not null,
  location_public extensions.geography(Point, 4326) not null,
  address_text text check (char_length(address_text) <= 200),
  place_id bigint references public.places (id) on delete set null,
  place_name text check (char_length(place_name) <= 120),
  pickup_available boolean not null default true,
  delivery_available boolean not null default false,
  status public.listing_status not null default 'draft',
  published_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_active_has_expiry check (status <> 'active' or expires_at is not null),
  constraint listings_delivery_disabled_v1 check (delivery_available = false)
);
create index listings_owner_idx on public.listings (owner_id);
create index listings_category_idx on public.listings (main_category_id);
create index listings_place_idx on public.listings (place_id);
create index listings_public_location_idx on public.listings using gist (location_public)
  where status = 'active';
create index listings_status_expiry_idx on public.listings (status, expires_at);

-- Publiczny punkt = środek komórki siatki 1 km w PUWG 1992 (EPSG:2180).
-- Stały punkt (nie losowy), więc kolejne edycje nie pozwalają uśrednić prawdziwej pozycji.
create or replace function private.public_point(p extensions.geography)
returns extensions.geography language sql immutable parallel safe set search_path = '' as $$
  select extensions.st_transform(
    extensions.st_setsrid(
      extensions.st_makepoint(
        floor(extensions.st_x(g) / 1000) * 1000 + 500,
        floor(extensions.st_y(g) / 1000) * 1000 + 500),
      2180),
    4326)::extensions.geography
  from (select extensions.st_transform(p::extensions.geometry, 2180) as g) s;
$$;

create or replace function private.listings_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lng double precision;
  v_lat double precision;
  v_cat record;
  v_action public.word_action;
begin
  if tg_op = 'INSERT' or new.location_exact is distinct from old.location_exact then
    v_lng := extensions.st_x(new.location_exact::extensions.geometry);
    v_lat := extensions.st_y(new.location_exact::extensions.geometry);
    if v_lng not between 14.0 and 24.2 or v_lat not between 49.0 and 54.9 then
      raise exception 'location_outside_poland' using errcode = '22023';
    end if;
    new.location_public := private.public_point(new.location_exact);
    select p.id, p.name into new.place_id, new.place_name
    from public.places p
    where extensions.st_dwithin(p.location, new.location_exact, 15000)
    order by p.location operator(extensions.<->) new.location_exact
    limit 1;
  end if;

  if tg_op = 'INSERT' or new.main_category_id is distinct from old.main_category_id
     or new.listing_kind is distinct from old.listing_kind then
    select c.kind, c.restriction_level, c.restriction_message, c.is_active into v_cat
    from public.categories c where c.id = new.main_category_id;
    if not found or not v_cat.is_active then
      raise exception 'category_not_found' using errcode = '22023';
    end if;
    if v_cat.kind <> new.listing_kind then
      raise exception 'category_kind_mismatch' using errcode = '22023';
    end if;
    if v_cat.restriction_level <> 'none' then
      raise exception 'category_restricted:%', coalesce(v_cat.restriction_message, '') using errcode = 'P0403';
    end if;
  end if;

  -- edycja opublikowanego ogłoszenia przechodzi przez filtr słów
  if tg_op = 'UPDATE' and new.status in ('active', 'pending_review')
     and (new.title is distinct from old.title or new.description is distinct from old.description) then
    v_action := private.word_filter(new.title || ' ' || new.description, 'listing');
    if v_action = 'reject' then
      raise exception 'blocked_words' using errcode = 'P0422';
    elsif v_action = 'review' then
      new.status := 'pending_review';
    end if;
  end if;
  return new;
end $$;
create trigger listings_before_write before insert or update on public.listings
  for each row execute function private.listings_before_write();
create trigger listings_updated_at before update on public.listings
  for each row execute function private.set_updated_at();

alter table public.listings enable row level security;
revoke all on public.listings from anon, authenticated;
grant select (id, owner_id, listing_kind, title, description, main_category_id, seller_name, location_public,
  place_id, place_name, pickup_available, delivery_available, status, published_at, confirmed_at, expires_at,
  created_at, updated_at) on public.listings to anon, authenticated;
grant insert (listing_kind, title, description, main_category_id, seller_name, location_exact, address_text,
  pickup_available) on public.listings to authenticated;
grant update (title, description, main_category_id, seller_name, location_exact, address_text, pickup_available)
  on public.listings to authenticated;

create policy listings_read on public.listings for select to anon, authenticated
  using ((status = 'active' and expires_at > now())
         or owner_id = (select auth.uid())
         or private.is_admin());
create policy listings_insert on public.listings for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'draft'
              and not private.is_user_blocked((select auth.uid())));
create policy listings_update on public.listings for update to authenticated
  using (owner_id = (select auth.uid()) and status not in ('removed', 'blocked'))
  with check (owner_id = (select auth.uid()));

-- ================================================================ pozycje (produkty i usługi)
create table public.listing_products (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  product_id uuid not null references public.product_catalog (id),
  unit_id uuid not null references public.product_units (id),
  price_type public.price_type not null default 'fixed',
  price numeric(10, 2),
  currency char(3) not null default 'PLN' check (currency = 'PLN'),
  quantity numeric(12, 3) check (quantity is null or quantity > 0),
  description text check (char_length(description) <= 300),
  image_path text check (char_length(image_path) <= 200),
  is_available boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, product_id),
  constraint listing_products_price check (
    (price_type = 'fixed' and price > 0 and price < 1000000)
    or (price_type = 'negotiable' and price is null)),
  constraint listing_products_image_path check (
    image_path is null or image_path like 'listings/' || listing_id::text || '/%')
);
create index listing_products_product_idx on public.listing_products (product_id);
create index listing_products_unit_idx on public.listing_products (unit_id);
create index listing_products_price_idx on public.listing_products (listing_id, price) where price_type = 'fixed';

create or replace function private.listing_products_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.listing_kind;
  v_count int;
  v_prod record;
  v_unit_kind public.listing_kind;
begin
  -- blokada wiersza rodzica serializuje równoległe INSERT-y => limit 10 jest szczelny
  select l.listing_kind into v_kind from public.listings l where l.id = new.listing_id for update;
  if tg_op = 'INSERT' then
    select count(*) into v_count from public.listing_products where listing_id = new.listing_id;
    if v_count >= 10 then
      raise exception 'max_items:10' using errcode = 'P0413';
    end if;
  end if;

  select c.kind, c.restriction_level, c.restriction_message, pc.is_active, c.is_active as cat_active into v_prod
  from public.product_catalog pc join public.categories c on c.id = pc.category_id
  where pc.id = new.product_id;
  if not found or not v_prod.is_active or not v_prod.cat_active then
    raise exception 'product_not_found' using errcode = '22023';
  end if;
  if v_prod.kind <> v_kind then
    raise exception 'product_kind_mismatch' using errcode = '22023';
  end if;
  if v_prod.restriction_level <> 'none' then
    raise exception 'category_restricted:%', coalesce(v_prod.restriction_message, '') using errcode = 'P0403';
  end if;

  select u.kind into v_unit_kind from public.product_units u where u.id = new.unit_id and u.is_active;
  if not found or v_unit_kind <> v_kind then
    raise exception 'unit_kind_mismatch' using errcode = '22023';
  end if;

  if new.description is not null and private.word_filter(new.description, 'listing') = 'reject' then
    raise exception 'blocked_words' using errcode = 'P0422';
  end if;
  return new;
end $$;
create trigger listing_products_guard before insert or update on public.listing_products
  for each row execute function private.listing_products_guard();
create trigger listing_products_updated_at before update on public.listing_products
  for each row execute function private.set_updated_at();

alter table public.listing_products enable row level security;
revoke all on public.listing_products from anon;
revoke truncate, references, trigger on public.listing_products from authenticated;
grant select on public.listing_products to anon;
-- widoczność dziedziczona z ogłoszenia (podzapytanie podlega RLS na listings)
create policy listing_products_read on public.listing_products for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy listing_products_write on public.listing_products for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id
                 and l.owner_id = (select auth.uid()) and l.status not in ('removed', 'blocked')))
  with check (exists (select 1 from public.listings l where l.id = listing_id
                 and l.owner_id = (select auth.uid()) and l.status not in ('removed', 'blocked')));

-- ================================================================ zdjęcia ogłoszeń
create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) <= 200),
  is_main boolean not null default false,
  sort int not null default 0,
  width int check (width between 1 and 4096),
  height int check (height between 1 and 4096),
  exif_checked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint listing_images_path check (storage_path like 'listings/' || listing_id::text || '/%')
);
create index listing_images_listing_idx on public.listing_images (listing_id);
create unique index listing_images_one_main on public.listing_images (listing_id) where is_main;

create or replace function private.listing_images_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  perform 1 from public.listings l where l.id = new.listing_id for update;
  select count(*) into v_count from public.listing_images where listing_id = new.listing_id;
  if v_count >= 3 then
    raise exception 'max_images:3' using errcode = 'P0413';
  end if;
  return new;
end $$;
create trigger listing_images_guard before insert on public.listing_images
  for each row execute function private.listing_images_guard();

alter table public.listing_images enable row level security;
revoke all on public.listing_images from anon;
revoke truncate, references, trigger on public.listing_images from authenticated;
revoke update on public.listing_images from authenticated;
grant update (is_main, sort, width, height) on public.listing_images to authenticated;
grant select on public.listing_images to anon;
create policy listing_images_read on public.listing_images for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy listing_images_write on public.listing_images for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id
                 and l.owner_id = (select auth.uid()) and l.status not in ('removed', 'blocked')))
  with check (exists (select 1 from public.listings l where l.id = listing_id
                 and l.owner_id = (select auth.uid()) and l.status not in ('removed', 'blocked')));

-- ================================================================ kontakt (tylko właściciel)
create table public.listing_contact_settings (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  phone text check (phone ~ '^\+?[0-9 ]{9,16}$'),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  share_phone boolean not null default false,
  share_email boolean not null default false,
  allow_chat boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint contact_phone_present check (not share_phone or phone is not null),
  constraint contact_email_present check (not share_email or email is not null)
);
create trigger listing_contact_settings_updated_at before update on public.listing_contact_settings
  for each row execute function private.set_updated_at();
alter table public.listing_contact_settings enable row level security;
revoke all on public.listing_contact_settings from anon;
revoke truncate, references, trigger on public.listing_contact_settings from authenticated;
create policy contact_own on public.listing_contact_settings for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));

-- domyślne ustawienia kontaktu zakładane razem z ogłoszeniem
create or replace function private.listings_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.listing_contact_settings (listing_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger listings_after_insert after insert on public.listings
  for each row execute function private.listings_after_insert();

create table public.contact_reveals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  field text not null check (field in ('phone', 'email', 'address')),
  created_at timestamptz not null default now()
);
create index contact_reveals_listing_idx on public.contact_reveals (listing_id);
create index contact_reveals_viewer_idx on public.contact_reveals (viewer_id, created_at);
alter table public.contact_reveals enable row level security;
revoke all on public.contact_reveals from anon, authenticated;
grant select on public.contact_reveals to authenticated;
create policy contact_reveals_admin on public.contact_reveals for select to authenticated
  using (private.is_admin());

-- ================================================================ RPC: cykl życia ogłoszenia
create or replace function private.assert_publishable(p_id uuid)
returns public.word_action language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  v_items int;
  v_bad int;
  v_type public.seller_type;
  v_text text;
begin
  select * into l from public.listings where id = p_id;
  if private.is_user_blocked(l.owner_id) then
    raise exception 'account_blocked' using errcode = 'P0403';
  end if;
  select count(*) into v_items from public.listing_products where listing_id = p_id;
  if v_items = 0 then
    raise exception 'no_items' using errcode = '22023';
  end if;
  select count(*) into v_bad
  from public.listing_products lp
  join public.product_catalog pc on pc.id = lp.product_id
  join public.categories c on c.id = pc.category_id
  where lp.listing_id = p_id and (c.restriction_level <> 'none' or not pc.is_active or not c.is_active);
  if v_bad > 0 or exists (select 1 from public.categories c where c.id = l.main_category_id
                          and (c.restriction_level <> 'none' or not c.is_active)) then
    raise exception 'category_restricted' using errcode = 'P0403';
  end if;
  select seller_type into v_type from public.profiles where id = l.owner_id;
  if v_type = 'company' and not exists (select 1 from public.seller_profiles sp
                                        where sp.user_id = l.owner_id and sp.nip is not null) then
    raise exception 'company_nip_required' using errcode = '22023';
  end if;
  select l.title || ' ' || l.description || ' ' || coalesce(string_agg(lp.description, ' '), '')
  into v_text from public.listing_products lp where lp.listing_id = p_id;
  return private.word_filter(v_text, 'listing');
end $$;
revoke all on function private.assert_publishable(uuid) from public;

create or replace function public.publish_listing(p_id uuid)
returns public.listing_status language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  v_action public.word_action;
  v_status public.listing_status;
begin
  select * into l from public.listings where id = p_id and owner_id = auth.uid() for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  if l.status not in ('draft', 'paused', 'expired') then
    raise exception 'invalid_status:%', l.status using errcode = '22023';
  end if;
  perform private.check_rate('publish_listing', 10, interval '1 day');
  v_action := private.assert_publishable(p_id);
  if v_action = 'reject' then
    raise exception 'blocked_words' using errcode = 'P0422';
  end if;
  update public.listings set
    status = case when v_action = 'review' then 'pending_review'::public.listing_status else 'active' end,
    published_at = coalesce(published_at, now()),
    confirmed_at = now(),
    expires_at = case when l.status = 'paused' and l.expires_at > now() then l.expires_at
                      else now() + interval '60 days' end
  where id = p_id
  returning status into v_status;
  return v_status;
end $$;

create or replace function public.confirm_listing(p_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
  v_expires timestamptz;
begin
  select * into l from public.listings where id = p_id and owner_id = auth.uid() for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  if l.status not in ('active', 'expired') then
    raise exception 'invalid_status:%', l.status using errcode = '22023';
  end if;
  if l.status = 'expired' and private.assert_publishable(p_id) is not null then
    raise exception 'needs_review' using errcode = 'P0422';
  end if;
  update public.listings
  set status = 'active', confirmed_at = now(), expires_at = now() + interval '60 days'
  where id = p_id
  returning expires_at into v_expires;
  return v_expires;
end $$;

create or replace function public.pause_listing(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.listings set status = 'paused'
  where id = p_id and owner_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'not_found_or_not_active' using errcode = 'P0404';
  end if;
end $$;

create or replace function public.remove_listing(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.listings set status = 'removed'
  where id = p_id and owner_id = auth.uid() and status not in ('removed', 'blocked');
  if not found then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
end $$;

-- ================================================================ RPC: mapa
create or replace function public.map_points(
  p_west double precision, p_south double precision, p_east double precision, p_north double precision,
  p_zoom int,
  p_kind public.listing_kind default null,
  p_category_ids uuid[] default null,
  p_product_ids uuid[] default null,
  p_seller_types public.seller_type[] default null,
  p_price_min numeric default null,
  p_price_max numeric default null)
returns table (is_cluster boolean, id uuid, lng double precision, lat double precision,
               point_count int, color text, icon text, title text)
language plpgsql stable set search_path = '' as $$
#variable_conflict use_column
begin
  if p_east - p_west > 20 or p_north - p_south > 12 then
    raise exception 'bbox_too_large' using errcode = '22023';
  end if;
  return query
  with f as (
    select l.id,
           extensions.st_x(l.location_public::extensions.geometry) as x,
           extensions.st_y(l.location_public::extensions.geometry) as y,
           c.color, c.icon, l.title
    from public.listings l
    join public.categories c on c.id = l.main_category_id
    join public.profiles p on p.id = l.owner_id
    where l.status = 'active' and l.expires_at > now()
      and l.location_public operator(extensions.&&)
          extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)::extensions.geography
      and (p_kind is null or l.listing_kind = p_kind)
      and (p_seller_types is null or p.seller_type = any (p_seller_types))
      and (p_category_ids is null or l.main_category_id = any (p_category_ids)
           or exists (select 1 from public.listing_products lp
                      join public.product_catalog pc on pc.id = lp.product_id
                      where lp.listing_id = l.id and pc.category_id = any (p_category_ids)))
      and (p_product_ids is null or exists (select 1 from public.listing_products lp
                                            where lp.listing_id = l.id and lp.product_id = any (p_product_ids)))
      and ((p_price_min is null and p_price_max is null) or exists (
            select 1 from public.listing_products lp
            where lp.listing_id = l.id and lp.price_type = 'fixed'
              and lp.price between coalesce(p_price_min, 0) and coalesce(p_price_max, 1000000)))
  )
  select * from (
    -- zoom < 10: klastry z serwera (siatka ~1/4 kafelka)
    select (count(*) > 1) as is_cluster,
           case when count(*) = 1 then (array_agg(f.id))[1] end as id,
           avg(f.x) as lng, avg(f.y) as lat,
           count(*)::int as point_count,
           case when count(*) = 1 then (array_agg(f.color))[1] end as color,
           case when count(*) = 1 then (array_agg(f.icon))[1] end as icon,
           case when count(*) = 1 then (array_agg(f.title))[1] end as title
    from f
    where p_zoom < 10
    group by floor(f.x / (360.0 / power(2, greatest(p_zoom, 0)) / 4)),
             floor(f.y / (360.0 / power(2, greatest(p_zoom, 0)) / 4))
    union all
    select false, f.id, f.x, f.y, 1, f.color, f.icon, f.title
    from f
    where p_zoom >= 10
  ) r
  limit 500;
end $$;
grant execute on function public.map_points(double precision, double precision, double precision, double precision,
  int, public.listing_kind, uuid[], uuid[], public.seller_type[], numeric, numeric) to anon, authenticated;

-- flagi kontaktu bez wartości (dla karty ogłoszenia)
create or replace function private.contact_flags(p_listing_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('phone', cs.share_phone, 'email', cs.share_email, 'chat', cs.allow_chat)
  from public.listing_contact_settings cs where cs.listing_id = p_listing_id;
$$;
revoke all on function private.contact_flags(uuid) from public;
grant execute on function private.contact_flags(uuid) to anon, authenticated;

create or replace function public.listing_detail(p_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'kind', l.listing_kind, 'title', l.title, 'description', l.description,
    'status', l.status, 'is_owner', l.owner_id = auth.uid(),
    'category', jsonb_build_object('id', c.id, 'name', c.name, 'color', c.color, 'icon', c.icon),
    'place_name', l.place_name,
    'lng', extensions.st_x(l.location_public::extensions.geometry),
    'lat', extensions.st_y(l.location_public::extensions.geometry),
    'location_precision_m', 1000,
    'seller_name', l.seller_name, 'seller_type', p.seller_type,
    'pickup_available', l.pickup_available, 'delivery_available', l.delivery_available,
    'updated_at', l.updated_at, 'expires_at', l.expires_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', lp.id, 'product_id', pc.id, 'name', pc.name, 'unit', u.short_name,
        'price_type', lp.price_type, 'price', lp.price, 'currency', lp.currency,
        'quantity', lp.quantity, 'description', lp.description, 'image_path', lp.image_path,
        'is_available', lp.is_available) order by lp.sort, pc.name)
      from public.listing_products lp
      join public.product_catalog pc on pc.id = lp.product_id
      join public.product_units u on u.id = lp.unit_id
      where lp.listing_id = l.id), '[]'::jsonb),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('path', li.storage_path, 'is_main', li.is_main)
                       order by li.is_main desc, li.sort)
      from public.listing_images li where li.listing_id = l.id), '[]'::jsonb),
    'contact', private.contact_flags(l.id))
  from public.listings l
  join public.categories c on c.id = l.main_category_id
  join public.profiles p on p.id = l.owner_id
  where l.id = p_id;
$$;
grant execute on function public.listing_detail(uuid) to anon, authenticated;

-- ================================================================ RPC: ujawnienie kontaktu (tylko zalogowani)
create or replace function public.reveal_contact(p_listing_id uuid, p_field text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  l record;
  cs public.listing_contact_settings;
  v_value text;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  select owner_id into l from public.listings
  where id = p_listing_id and status = 'active' and expires_at > now();
  if not found then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  if private.is_blocked_between(v_uid, l.owner_id) then
    raise exception 'blocked' using errcode = 'P0403';
  end if;
  select * into cs from public.listing_contact_settings where listing_id = p_listing_id;
  if p_field = 'phone' and cs.share_phone then
    v_value := cs.phone;
  elsif p_field = 'email' and cs.share_email then
    v_value := cs.email;
  else
    raise exception 'not_shared' using errcode = 'P0403';
  end if;
  if v_uid <> l.owner_id then
    perform private.check_rate('reveal_contact', 30, interval '1 day');
    insert into public.contact_reveals (listing_id, viewer_id, field) values (p_listing_id, v_uid, p_field);
  end if;
  return v_value;
end $$;

-- ================================================================ RPC: panel sprzedawcy
create or replace function public.my_listings()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'kind', l.listing_kind, 'title', l.title, 'status', l.status,
    'is_expired', l.status = 'expired' or (l.status = 'active' and l.expires_at <= now()),
    'place_name', l.place_name, 'expires_at', l.expires_at, 'confirmed_at', l.confirmed_at,
    'created_at', l.created_at, 'updated_at', l.updated_at,
    'item_count', (select count(*) from public.listing_products lp where lp.listing_id = l.id),
    'main_image', (select li.storage_path from public.listing_images li
                   where li.listing_id = l.id order by li.is_main desc, li.sort limit 1))
    order by l.updated_at desc), '[]'::jsonb)
  from public.listings l
  where l.owner_id = auth.uid() and l.status <> 'removed';
$$;

create or replace function public.my_listing(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select public.listing_detail(l.id) || jsonb_build_object(
    'exact_lng', extensions.st_x(l.location_exact::extensions.geometry),
    'exact_lat', extensions.st_y(l.location_exact::extensions.geometry),
    'address_text', l.address_text,
    'contact_settings', (select to_jsonb(cs) - 'listing_id' from public.listing_contact_settings cs
                         where cs.listing_id = l.id))
  from public.listings l
  where l.id = p_id and l.owner_id = auth.uid();
$$;

create or replace function public.my_account()
returns jsonb language sql stable security definer set search_path = '' as $$
  select to_jsonb(p) || jsonb_build_object(
    'seller_profile', (select to_jsonb(sp) from public.seller_profiles sp where sp.user_id = p.id),
    'admin_role', (select ar.role from public.admin_roles ar where ar.user_id = p.id))
  from public.profiles p where p.id = auth.uid();
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.publish_listing(uuid)', 'public.confirm_listing(uuid)', 'public.pause_listing(uuid)',
    'public.remove_listing(uuid)', 'public.reveal_contact(uuid, text)', 'public.my_listings()',
    'public.my_listing(uuid)', 'public.my_account()']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- funkcje triggerów nie są wywoływalne przez API
revoke all on function private.handle_new_user() from public;
revoke all on function private.listings_before_write() from public;
revoke all on function private.listing_products_guard() from public;
revoke all on function private.listing_images_guard() from public;
revoke all on function private.listings_after_insert() from public;

-- ================================================================ Storage: zdjęcia
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy listing_images_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = 'listings'
    and exists (select 1 from public.listings l
                where l.id::text = (storage.foldername(name))[2]
                  and l.owner_id = (select auth.uid())
                  and l.status not in ('removed', 'blocked')));
create policy listing_images_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and exists (select 1 from public.listings l
                where l.id::text = (storage.foldername(name))[2]
                  and l.owner_id = (select auth.uid())));
