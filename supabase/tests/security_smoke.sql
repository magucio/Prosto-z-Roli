-- Prosto z Roli — test dymny RLS, limitów i wygasania.
-- Uruchamiany jako postgres; podszywa się pod role anon/authenticated przez SET LOCAL ROLE + request.jwt.claims.
-- Zawsze kończy się wyjątkiem z raportem => cała transakcja jest wycofywana, w bazie nic nie zostaje.
do $test$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  fruit uuid; meat uuid; meat_prod uuid; kg uuid;
  prods uuid[];
  lid uuid; lid2 uuid; conv uuid;
  v text; n int; d double precision; st public.listing_status; exp timestamptz; j jsonb;
  log text := '';
  procedure_ok boolean;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
  values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid', '{"display_name":"Sad A"}', now(), now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid', '{"display_name":"Kupujący B"}', now(), now(), now()),
    (c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.invalid', '{"display_name":"Obcy C"}', now(), now(), now());
  select id into fruit from public.categories where slug = 'owoce';
  select id into meat from public.categories where slug = 'mieso';
  select id into meat_prod from public.product_catalog where category_id = meat limit 1;
  select id into kg from public.product_units where code = 'kg';
  select array_agg(pc.id order by pc.name) into prods from public.product_catalog pc
  join public.categories ct on ct.id = pc.category_id where ct.slug in ('owoce', 'warzywa');

  -- ===== jako sprzedawca A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.listings (title, main_category_id, seller_name, location_exact)
  values ('Jabłka z sadu', fruit, 'Sad A', 'SRID=4326;POINT(21.0122 52.2297)') returning id into lid;
  log := log || 'ok T01 utworzenie szkicu; ';

  begin
    insert into public.listing_products (listing_id, product_id, unit_id, price) values (lid, meat_prod, kg, 20);
    log := log || 'FAIL T02 produkt z kategorii zablokowanej przyjęty; ';
  exception when others then
    log := log || case when sqlerrm like 'category_restricted%' then 'ok T02 mięso zablokowane; ' else 'FAIL T02 ' || sqlerrm || '; ' end;
  end;

  begin
    insert into public.listings (title, main_category_id, seller_name, location_exact)
    values ('Kiełbasa domowa', meat, 'Sad A', 'SRID=4326;POINT(21.0 52.2)');
    log := log || 'FAIL T03 ogłoszenie w kategorii mięso przyjęte; ';
  exception when others then
    log := log || case when sqlerrm like 'category_restricted%' then 'ok T03 kategoria mięso zablokowana; ' else 'FAIL T03 ' || sqlerrm || '; ' end;
  end;

  begin
    insert into public.listings (title, main_category_id, seller_name, location_exact)
    values ('Jabłka z Berlina', fruit, 'Sad A', 'SRID=4326;POINT(13.40 52.52)');
    log := log || 'FAIL T04 punkt poza Polską przyjęty; ';
  exception when others then
    log := log || case when sqlerrm = 'location_outside_poland' then 'ok T04 punkt poza Polską odrzucony; ' else 'FAIL T04 ' || sqlerrm || '; ' end;
  end;

  for i in 1..10 loop
    insert into public.listing_products (listing_id, product_id, unit_id, price) values (lid, prods[i], kg, 5);
  end loop;
  begin
    insert into public.listing_products (listing_id, product_id, unit_id, price) values (lid, prods[11], kg, 5);
    log := log || 'FAIL T05 11. pozycja przyjęta; ';
  exception when others then
    log := log || case when sqlerrm like 'max_items%' then 'ok T05 limit 10 pozycji; ' else 'FAIL T05 ' || sqlerrm || '; ' end;
  end;

  begin
    insert into public.listing_products (listing_id, product_id, unit_id, price_type, price) values (lid, prods[12], kg, 'fixed', null);
    log := log || 'FAIL T06 cena stała bez kwoty przyjęta; ';
  exception when others then
    log := log || 'ok T06 cena stała wymaga kwoty; ';
  end;

  for i in 1..3 loop
    insert into public.listing_images (listing_id, storage_path, is_main) values (lid, 'listings/' || lid || '/img' || i || '.jpg', i = 1);
  end loop;
  begin
    insert into public.listing_images (listing_id, storage_path) values (lid, 'listings/' || lid || '/img4.jpg');
    log := log || 'FAIL T07 4. zdjęcie przyjęte; ';
  exception when others then
    log := log || case when sqlerrm like 'max_images%' then 'ok T07 limit 3 zdjęć; ' else 'FAIL T07 ' || sqlerrm || '; ' end;
  end;

  begin
    update public.listings set delivery_available = true where id = lid;
    log := log || 'FAIL T08 klient zmienił delivery_available; ';
  exception when insufficient_privilege then
    log := log || 'ok T08 dostawa niedostępna; ';
  end;

  begin
    update public.listings set status = 'active', expires_at = now() + interval '999 days' where id = lid;
    log := log || 'FAIL T09 klient ustawił status ręcznie; ';
  exception when insufficient_privilege then
    log := log || 'ok T09 status tylko przez RPC; ';
  end;

  st := public.publish_listing(lid);
  select expires_at into exp from public.listings where id = lid;
  log := log || case when st = 'active' and exp between now() + interval '59 days' and now() + interval '61 days'
                     then 'ok T10 publikacja na 60 dni; ' else 'FAIL T10 ' || st || ' ' || exp || '; ' end;

  update public.listing_contact_settings set phone = '600 100 200', share_phone = true where listing_id = lid;

  -- ===== jako anonim
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;

  select count(*) into n from public.listings where id = lid;
  log := log || case when n = 1 then 'ok T11 anonim widzi aktywne; ' else 'FAIL T11; ' end;

  begin
    perform location_exact from public.listings where id = lid;
    log := log || 'FAIL T12 anonim czyta dokładną lokalizację; ';
  exception when insufficient_privilege then
    log := log || 'ok T12 dokładna lokalizacja ukryta; ';
  end;

  begin
    perform address_text from public.listings where id = lid;
    log := log || 'FAIL T13 anonim czyta adres; ';
  exception when insufficient_privilege then
    log := log || 'ok T13 adres ukryty; ';
  end;

  begin
    perform phone from public.listing_contact_settings;
    log := log || 'FAIL T14 anonim czyta kontakt; ';
  exception when insufficient_privilege then
    log := log || 'ok T14 kontakt ukryty przed anonimem; ';
  end;

  begin
    v := public.reveal_contact(lid, 'phone');
    log := log || 'FAIL T15 anonim odsłonił telefon; ';
  exception when insufficient_privilege then
    log := log || 'ok T15 odsłonięcie wymaga logowania; ';
  end;

  j := public.listing_detail(lid);
  log := log || case when j ? 'lng' and not (j ? 'exact_lng') and not (j::text like '%600 100 200%')
                     and (j -> 'contact' ->> 'phone')::boolean
                     then 'ok T16 karta bez danych prywatnych; ' else 'FAIL T16; ' end;

  select count(*) into n from public.map_points(14.0, 49.0, 24.2, 54.9, 12);
  log := log || case when n >= 1 then 'ok T17 mapa zwraca punkty; ' else 'FAIL T17; ' end;
  select count(*) into n from public.map_points(14.0, 49.0, 24.2, 54.9, 6) where point_count >= 1;
  log := log || case when n >= 1 then 'ok T18 mapa klastruje przy małym zoomie; ' else 'FAIL T18; ' end;

  begin
    perform 1 from public.map_points(0, 0, 40, 60, 5);
    log := log || 'FAIL T19 za duży obszar mapy przyjęty; ';
  exception when others then
    log := log || 'ok T19 limit obszaru mapy; ';
  end;

  -- odległość publicznego punktu od dokładnego
  reset role;
  select extensions.st_distance(location_exact, location_public) into d from public.listings where id = lid;
  log := log || case when d > 0 and d < 710 then 'ok T20 punkt publiczny przesunięty o ' || round(d) || ' m; '
                     else 'FAIL T20 przesunięcie ' || d || '; ' end;

  -- ===== jako kupujący B
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  v := public.reveal_contact(lid, 'phone');
  log := log || case when v = '600 100 200' then 'ok T21 zalogowany odsłania telefon; ' else 'FAIL T21; ' end;
  begin
    v := public.reveal_contact(lid, 'email');
    log := log || 'FAIL T22 e-mail bez zgody odsłonięty; ';
  exception when others then
    log := log || case when sqlerrm = 'not_shared' then 'ok T22 e-mail bez zgody ukryty; ' else 'FAIL T22 ' || sqlerrm || '; ' end;
  end;

  update public.listings set title = 'Przejęte ogłoszenie' where id = lid;
  get diagnostics n = row_count;
  log := log || case when n = 0 then 'ok T23 cudza edycja = 0 wierszy; ' else 'FAIL T23; ' end;

  begin
    st := public.publish_listing(lid);
    log := log || 'FAIL T24 cudze publish_listing; ';
  exception when others then
    log := log || 'ok T24 cudze RPC odrzucone; ';
  end;

  conv := public.start_conversation(lid, 'Dzień dobry, czy jabłka są jeszcze dostępne?');
  log := log || case when conv is not null then 'ok T25 rozmowa założona; ' else 'FAIL T25; ' end;

  begin
    perform is_blocked from public.profiles where id = a;
    log := log || 'FAIL T26 widać status blokady cudzego konta; ';
  exception when insufficient_privilege then
    log := log || 'ok T26 status blokady ukryty; ';
  end;

  -- ===== jako obcy C
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.messages where conversation_id = conv;
  log := log || case when n = 0 then 'ok T27 obcy nie czyta cudzej rozmowy; ' else 'FAIL T27; ' end;
  begin
    insert into public.messages (conversation_id, body) values (conv, 'wtrącam się');
    log := log || 'FAIL T28 obcy pisze do cudzej rozmowy; ';
  exception when insufficient_privilege then
    log := log || 'ok T28 obcy nie pisze do cudzej rozmowy; ';
  end;

  begin
    perform public.admin_stats();
    log := log || 'FAIL T29 zwykły użytkownik w panelu admina; ';
  exception when others then
    log := log || 'ok T29 panel admina zablokowany; ';
  end;

  -- ===== sprzedawca A: nieprzeczytane, blokada kupującego
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  n := public.unread_messages_count();
  log := log || case when n = 1 then 'ok T30 licznik nieprzeczytanych; ' else 'FAIL T30 ' || n || '; ' end;
  insert into public.user_blocks (blocker_id, blocked_id) values (a, b);

  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.messages (conversation_id, body) values (conv, 'kolejna wiadomość');
    log := log || 'FAIL T31 zablokowany wysłał wiadomość; ';
  exception when others then
    log := log || case when sqlerrm = 'blocked' then 'ok T31 zablokowany nie pisze; ' else 'FAIL T31 ' || sqlerrm || '; ' end;
  end;

  -- ===== filtr słów
  reset role;
  insert into public.blocked_words (pattern, action) values ('Oszust', 'reject');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.listings set title = 'Uwaga OSZUŚT ziemniaki' where id = lid;
    log := log || 'FAIL T32 filtr słów nie zadziałał; ';
  exception when others then
    log := log || case when sqlerrm = 'blocked_words' then 'ok T32 filtr słów (bez polskich znaków i wielkości liter); ' else 'FAIL T32 ' || sqlerrm || '; ' end;
  end;

  -- ===== wygasanie
  reset role;
  update public.listings set expires_at = now() - interval '1 minute' where id = lid;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  select count(*) into n from public.listings where id = lid;
  log := log || case when n = 0 then 'ok T33 po terminie znika publicznie bez crona; ' else 'FAIL T33; ' end;
  reset role;
  n := private.expire_listings();
  select status into st from public.listings where id = lid;
  log := log || case when st = 'expired' then 'ok T34 cron oznacza wygasłe; ' else 'FAIL T34 ' || st || '; ' end;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  exp := public.confirm_listing(lid);
  select status into st from public.listings where id = lid;
  log := log || case when st = 'active' and exp > now() + interval '59 days' then 'ok T35 „Nadal aktualne” = +60 dni; '
                     else 'FAIL T35; ' end;

  -- ===== admin wymaga 2FA
  reset role;
  insert into public.admin_roles (user_id, role) values (c, 'superadmin');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  set local role authenticated;
  begin
    perform public.admin_stats();
    log := log || 'FAIL T36 admin bez 2FA wpuszczony; ';
  exception when others then
    log := log || 'ok T36 admin bez 2FA zablokowany; ';
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  set local role authenticated;
  j := public.admin_stats();
  log := log || case when (j ->> 'listings_active')::int >= 1 then 'ok T37 admin z 2FA widzi statystyki; ' else 'FAIL T37; ' end;
  perform public.admin_block_user(a, null, 'test');
  select count(*) into n from public.listings where owner_id = a and status = 'blocked';
  log := log || case when n = 1 then 'ok T38 blokada konta ukrywa ogłoszenia; ' else 'FAIL T38; ' end;

  reset role;
  raise exception 'TEST_REPORT %', log;
end
$test$;
