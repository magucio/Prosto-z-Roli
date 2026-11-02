-- Prosto z Roli — migracja 6: nazwa miejscowości.
-- Z tabeli places (TERYT), a gdy brak dopasowania — nazwa podana przez aplikację (geokoder telefonu).
create or replace function private.listings_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lng double precision;
  v_lat double precision;
  v_cat record;
  v_action public.word_action;
  v_place record;
begin
  if tg_op = 'INSERT' or new.location_exact is distinct from old.location_exact then
    v_lng := extensions.st_x(new.location_exact::extensions.geometry);
    v_lat := extensions.st_y(new.location_exact::extensions.geometry);
    if v_lng not between 14.0 and 24.2 or v_lat not between 49.0 and 54.9 then
      raise exception 'location_outside_poland' using errcode = '22023';
    end if;
    new.location_public := private.public_point(new.location_exact);
    select p.id, p.name into v_place
    from public.places p
    where extensions.st_dwithin(p.location, new.location_exact, 15000)
    order by p.location operator(extensions.<->) new.location_exact
    limit 1;
    if v_place.id is not null then
      new.place_id := v_place.id;
      new.place_name := v_place.name;
    else
      new.place_id := null;
    end if;
  end if;
  new.place_name := nullif(btrim(new.place_name), '');

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

grant insert (place_name) on public.listings to authenticated;
grant update (place_name) on public.listings to authenticated;
