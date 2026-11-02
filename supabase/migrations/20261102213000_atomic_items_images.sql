-- Prosto z Roli — migracja 8 (CZEKA NA ZASTOSOWANIE): atomowa podmiana pozycji/zdjęć + odczyt własnych plików w Storage.
-- Storage: usuwanie pliku wymaga też prawa odczytu (SELECT) — właściciel ogłoszenia widzi swoje pliki.
create policy listing_images_owner_select on storage.objects for select to authenticated
  using (
    bucket_id = 'listing-images'
    and exists (select 1 from public.listings l
                where l.id::text = (storage.foldername(name))[2]
                  and l.owner_id = (select auth.uid())));

-- Atomowa podmiana pozycji: usunięcie i wstawienie w jednej transakcji (RLS i triggery działają jak zwykle).
create or replace function public.replace_listing_items(p_listing_id uuid, p_items jsonb)
returns int language plpgsql security invoker set search_path = '' as $$
declare
  v_count int;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'no_items' using errcode = '22023';
  end if;
  if not exists (select 1 from public.listings where id = p_listing_id and owner_id = auth.uid()
                 and status not in ('removed', 'blocked')) then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  delete from public.listing_products where listing_id = p_listing_id;
  insert into public.listing_products (listing_id, product_id, unit_id, price_type, price, quantity, description, sort)
  select p_listing_id,
         (e ->> 'product_id')::uuid,
         (e ->> 'unit_id')::uuid,
         coalesce((e ->> 'price_type')::public.price_type, 'fixed'),
         (e ->> 'price')::numeric,
         (e ->> 'quantity')::numeric,
         nullif(btrim(e ->> 'description'), ''),
         (ord - 1)::int
  from jsonb_array_elements(p_items) with ordinality as t(e, ord);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Atomowa podmiana listy zdjęć (kolejność = pierwsze jest główne).
create or replace function public.replace_listing_images(p_listing_id uuid, p_images jsonb)
returns int language plpgsql security invoker set search_path = '' as $$
declare
  v_count int;
begin
  if jsonb_typeof(p_images) <> 'array' then
    raise exception 'invalid_images' using errcode = '22023';
  end if;
  if not exists (select 1 from public.listings where id = p_listing_id and owner_id = auth.uid()
                 and status not in ('removed', 'blocked')) then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  delete from public.listing_images where listing_id = p_listing_id;
  insert into public.listing_images (listing_id, storage_path, is_main, sort, width, height)
  select p_listing_id, e ->> 'path', ord = 1, (ord - 1)::int,
         nullif((e ->> 'width')::int, 0), nullif((e ->> 'height')::int, 0)
  from jsonb_array_elements(p_images) with ordinality as t(e, ord);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.replace_listing_items(uuid, jsonb) from public, anon;
revoke all on function public.replace_listing_images(uuid, jsonb) from public, anon;
grant execute on function public.replace_listing_items(uuid, jsonb) to authenticated;
grant execute on function public.replace_listing_images(uuid, jsonb) to authenticated;
