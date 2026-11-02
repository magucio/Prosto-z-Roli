// Test end-to-end publikacji ogłoszenia na żywym Supabase (te same kroki co kreator w aplikacji).
// Wymaga konta testowego e2e-test@prostozroli.invalid / Testowe123. Na końcu usuwa konto (i ogłoszenie) przez account-delete.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const URL = process.env.SUPABASE_URL ?? 'https://ojctjylqfcrdkcwzmfuo.supabase.co';
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_oKV-AWbBp9QiaOWNKGpQHw_K0zTHPpO';
const EMAIL = 'e2e-test@prostozroli.invalid';
const PASSWORD = 'Testowe123';
const JPEG = process.argv[2];
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const sb = client();
const anon = client();
const { data: login, error: loginErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (loginErr) throw loginErr;
const uid = login.user.id;

try {
  const { data: cats } = await sb.from('categories').select('id,slug');
  const cat = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  const { data: units } = await sb.from('product_units').select('id,code');
  const unit = Object.fromEntries(units.map((u) => [u.code, u.id]));
  const { data: catalog } = await sb
    .from('product_catalog')
    .select('id,name,categories!inner(kind,slug)')
    .eq('categories.kind', 'product')
    .ilike('search_text', '%jabl%');
  check('wyszukiwarka katalogu bez polskich znaków („jabl”)', catalog?.some((p) => p.name === 'Jabłka'), catalog?.map((p) => p.name).join(','));
  const apples = catalog.find((p) => p.name === 'Jabłka').id;
  const { data: more } = await sb.from('product_catalog').select('id,categories!inner(slug)').in('categories.slug', ['owoce', 'warzywa']).limit(12);
  const { data: meat } = await sb.from('product_catalog').select('id,categories!inner(slug)').eq('categories.slug', 'mieso').limit(1);

  const { data: listing, error: e1 } = await sb
    .from('listings')
    .insert({
      listing_kind: 'product',
      title: 'Jabłka prosto z sadu — test',
      description: 'Ogłoszenie testowe e2e',
      main_category_id: cat.owoce,
      seller_name: 'Sad Testowy',
      location_exact: 'SRID=4326;POINT(20.8677 51.8656)',
      place_name: 'Grójec',
      address_text: 'ul. Sadowa 1',
      pickup_available: true,
    })
    .select('id')
    .single();
  check('szkic ogłoszenia', !e1, e1?.message);
  const id = listing.id;

  {
    const { error } = await sb.from('listings').insert({
      listing_kind: 'product', title: 'Kiełbasa domowa', main_category_id: cat.mieso, seller_name: 'X',
      location_exact: 'SRID=4326;POINT(20.8 51.8)',
    });
    check('kategoria mięso zablokowana', error?.message?.startsWith('category_restricted'), error?.message);
    const { error: e2 } = await sb.from('listing_products').insert({ listing_id: id, product_id: meat[0].id, unit_id: unit.kg, price: 20 });
    check('pozycja z mięsa zablokowana', e2?.message?.startsWith('category_restricted'), e2?.message);
  }

  const rows = [
    { listing_id: id, product_id: apples, unit_id: unit.kg, price_type: 'fixed', price: 3.5, quantity: 500, sort: 0 },
    ...more.filter((p) => p.id !== apples).slice(0, 9).map((p, i) => ({ listing_id: id, product_id: p.id, unit_id: unit.kg, price_type: 'negotiable', price: null, sort: i + 1 })),
  ];
  const { error: e3 } = await sb.from('listing_products').insert(rows);
  check('10 pozycji (cena stała i do uzgodnienia)', !e3, e3?.message);
  const extra = more.find((p) => !rows.some((r) => r.product_id === p.id));
  if (extra) {
    const { error } = await sb.from('listing_products').insert({ listing_id: id, product_id: extra.id, unit_id: unit.kg, price: 1 });
    check('11. pozycja odrzucona', error?.message?.startsWith('max_items'), error?.message);
  }

  const bytes = readFileSync(JPEG);
  const path = `listings/${id}/e2e-${Date.now()}.jpg`;
  const { error: e4 } = await sb.storage.from('listing-images').upload(path, bytes, { contentType: 'image/jpeg' });
  check('wysłanie zdjęcia do Storage', !e4, e4?.message);
  {
    const { error } = await sb.storage.from('listing-images').upload(`listings/00000000-0000-0000-0000-000000000000/x.jpg`, bytes, { contentType: 'image/jpeg' });
    check('nie można wysłać zdjęcia do cudzego ogłoszenia', !!error, error?.message);
    const { error: e5 } = await sb.storage.from('listing-images').upload(`listings/${id}/x.png`, bytes, { contentType: 'image/png' });
    check('Storage odrzuca nieobsługiwany typ pliku', !!e5, e5?.message);
  }
  const { error: e6 } = await sb.from('listing_images').insert({ listing_id: id, storage_path: path, is_main: true, sort: 0, width: 64, height: 48 });
  check('rejestracja zdjęcia', !e6, e6?.message);

  const { error: e7 } = await sb.from('listing_contact_settings').update({ phone: '600 100 200', share_phone: true, allow_chat: true }).eq('listing_id', id);
  check('ustawienia kontaktu', !e7, e7?.message);

  {
    const { data: before } = await anon.from('listings').select('id').eq('id', id);
    check('szkic niewidoczny publicznie', (before ?? []).length === 0);
  }

  const { data: status, error: e8 } = await sb.rpc('publish_listing', { p_id: id });
  check('publikacja', !e8 && status === 'active', e8?.message ?? status);

  const { data: points, error: e9 } = await anon.rpc('map_points', { p_west: 20.5, p_south: 51.6, p_east: 21.2, p_north: 52.1, p_zoom: 12 });
  const pt = points?.find((p) => p.id === id);
  check('anonim widzi pinezkę na mapie', !e9 && !!pt, e9?.message);
  check('pinezka ma kolor kategorii', pt?.color === '#D64545', pt?.color);
  const dist = pt ? Math.hypot((pt.lng - 20.8677) * 69, (pt.lat - 51.8656) * 111) : 999;
  check('pinezka przesunięta (lokalizacja przybliżona)', dist > 0.01 && dist < 0.75, `${dist.toFixed(3)} km`);

  const { data: detail } = await anon.rpc('listing_detail', { p_id: id });
  check('karta: miejscowość z aplikacji', detail?.place_name === 'Grójec', detail?.place_name);
  check('karta: 10 pozycji i zdjęcie', detail?.items?.length === 10 && detail?.images?.length === 1);
  check('karta bez adresu i telefonu', !JSON.stringify(detail).includes('Sadowa') && !JSON.stringify(detail).includes('600 100 200'));
  const img = await fetch(`${URL}/storage/v1/object/public/listing-images/${path}`);
  check('zdjęcie dostępne publicznie', img.ok, String(img.status));

  const { data: mine } = await sb.rpc('my_listings');
  check('my_listings zawiera ogłoszenie', mine?.some((l) => l.id === id && l.status === 'active'));
} finally {
  const { data, error } = await sb.functions.invoke('account-delete', { body: { password: PASSWORD } });
  check('sprzątanie: usunięcie konta testowego', !error && data?.ok, error?.message);
}

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
