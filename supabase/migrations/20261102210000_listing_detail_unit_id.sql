-- Prosto z Roli — migracja 7: listing_detail zwraca unit_id pozycji (potrzebne do edycji ogłoszenia).
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
        'id', lp.id, 'product_id', pc.id, 'name', pc.name, 'unit_id', u.id, 'unit', u.short_name,
        'price_type', lp.price_type, 'price', lp.price, 'currency', lp.currency,
        'quantity', lp.quantity, 'description', lp.description, 'image_path', lp.image_path,
        'is_available', lp.is_available) order by lp.sort, pc.name)
      from public.listing_products lp
      join public.product_catalog pc on pc.id = lp.product_id
      join public.product_units u on u.id = lp.unit_id
      where lp.listing_id = l.id), '[]'::jsonb),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('path', li.storage_path, 'is_main', li.is_main,
                                          'width', li.width, 'height', li.height)
                       order by li.is_main desc, li.sort)
      from public.listing_images li where li.listing_id = l.id), '[]'::jsonb),
    'contact', private.contact_flags(l.id))
  from public.listings l
  join public.categories c on c.id = l.main_category_id
  join public.profiles p on p.id = l.owner_id
  where l.id = p_id;
$$;
grant execute on function public.listing_detail(uuid) to anon, authenticated;
