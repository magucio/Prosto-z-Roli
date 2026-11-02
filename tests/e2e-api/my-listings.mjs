// Test end-to-end panelu „Moje ogłoszenia” na żywym Supabase.
// Wymaga kont e2e-test@ i e2e-other@prostozroli.invalid (hasło Testowe123). Na końcu usuwa oba konta.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const URL = process.env.SUPABASE_URL ?? 'https://ojctjylqfcrdkcwzmfuo.supabase.co';
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_oKV-AWbBp9QiaOWNKGpQHw_K0zTHPpO';
const PASSWORD = 'Testowe123';
const JPEG = readFileSync(process.argv[2]);
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function login(email) {
  const sb = client();
  const { error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return sb;
}

const me = await login('e2e-test@prostozroli.invalid');
const other = await login('e2e-other@prostozroli.invalid');
const anon = client();
const visible = async (id) => ((await anon.from('listings').select('id').eq('id', id)).data ?? []).length === 1;
const status = async (id) => (await me.rpc('my_listings')).data?.find((l) => l.id === id)?.status;

try {
  const { data: cats } = await me.from('categories').select('id,slug');
  const fruit = cats.find((c) => c.slug === 'owoce').id;
  const { data: units } = await me.from('product_units').select('id,code');
  const kg = units.find((u) => u.code === 'kg').id;
  const { data: prods } = await me.from('product_catalog').select('id,name,categories!inner(slug)').eq('categories.slug', 'owoce').limit(3);

  const { data: l } = await me.from('listings').insert({
    listing_kind: 'product', title: 'Gruszki testowe e2e', main_category_id: fruit, seller_name: 'Test',
    location_exact: 'SRID=4326;POINT(19.94 50.06)', place_name: 'Kraków',
  }).select('id').single();
  const id = l.id;
  await me.from('listing_products').insert({ listing_id: id, product_id: prods[0].id, unit_id: kg, price: 4 });
  const paths = [];
  for (let i = 0; i < 2; i++) {
    const p = `listings/${id}/e2e-${i}-${Date.now()}.jpg`;
    await me.storage.from('listing-images').upload(p, JPEG, { contentType: 'image/jpeg' });
    paths.push(p);
  }
  await me.from('listing_images').insert(paths.map((p, i) => ({ listing_id: id, storage_path: p, is_main: i === 0, sort: i })));
  await me.rpc('publish_listing', { p_id: id });
  check('opublikowane ogłoszenie aktywne', (await status(id)) === 'active');

  // Edycja aktywnego: tytuł, pozycje (zastąpienie), zdjęcia (usunięcie jednego, zmiana głównego)
  {
    const { error } = await me.from('listings').update({ title: 'Gruszki i jabłka e2e' }).eq('id', id);
    check('edycja tytułu aktywnego', !error, error?.message);
    await me.from('listing_products').delete().eq('listing_id', id);
    const { error: e2 } = await me.from('listing_products').insert([
      { listing_id: id, product_id: prods[0].id, unit_id: kg, price: 5.5, sort: 0 },
      { listing_id: id, product_id: prods[1].id, unit_id: kg, price_type: 'negotiable', price: null, sort: 1 },
    ]);
    check('zastąpienie pozycji', !e2, e2?.message);
    await me.from('listing_images').delete().eq('listing_id', id);
    const { error: e3 } = await me.from('listing_images').insert({ listing_id: id, storage_path: paths[1], is_main: true, sort: 0 });
    check('zmiana zdjęcia głównego', !e3, e3?.message);
    const { error: e4 } = await me.storage.from('listing-images').remove([paths[0]]);
    check('usunięcie zdjęcia ze Storage', !e4, e4?.message);
    const gone = await fetch(`${URL}/storage/v1/object/public/listing-images/${paths[0]}`);
    check('usunięte zdjęcie niedostępne', !gone.ok, String(gone.status));
    const { data: d } = await anon.rpc('listing_detail', { p_id: id });
    check('karta po edycji', d?.title === 'Gruszki i jabłka e2e' && d?.items?.length === 2 && d?.images?.length === 1 && d?.items?.[0]?.unit_id, `${d?.items?.length} poz., ${d?.images?.length} zdj.`);
    check('ogłoszenie nadal aktywne po edycji', (await status(id)) === 'active');
  }

  // Cudze akcje
  for (const [fn, label] of [['pause_listing', 'wstrzymać'], ['confirm_listing', 'przedłużyć'], ['remove_listing', 'usunąć']]) {
    const { error } = await other.rpc(fn, { p_id: id });
    check(`obcy nie może ${label} cudzego ogłoszenia`, !!error, error?.message);
  }
  {
    const { data } = await other.from('listing_products').delete().eq('listing_id', id).select('id');
    check('obcy nie usunie cudzych pozycji', (data ?? []).length === 0);
    const { error } = await other.storage.from('listing-images').remove([paths[1]]);
    const still = await fetch(`${URL}/storage/v1/object/public/listing-images/${paths[1]}`);
    check('obcy nie usunie cudzego zdjęcia', still.ok, error?.message ?? String(still.status));
  }

  // Wstrzymanie / wznowienie / przedłużenie
  const exp1 = (await me.rpc('my_listings')).data.find((x) => x.id === id).expires_at;
  {
    const { error } = await me.rpc('pause_listing', { p_id: id });
    check('wstrzymanie', !error && (await status(id)) === 'paused', error?.message);
    check('wstrzymane znika z mapy', !(await visible(id)));
    const { error: e2 } = await me.rpc('publish_listing', { p_id: id });
    const exp2 = (await me.rpc('my_listings')).data.find((x) => x.id === id).expires_at;
    check('wznowienie zachowuje termin', !e2 && (await status(id)) === 'active' && exp1 === exp2, e2?.message);
    check('wznowione widoczne publicznie', await visible(id));
    const { data: newExp, error: e3 } = await me.rpc('confirm_listing', { p_id: id });
    const days = (new Date(newExp) - Date.now()) / 86400000;
    check('„Nadal aktualne” = 60 dni od dziś', !e3 && days > 59.9 && days <= 60, `${days.toFixed(2)} dni`);
  }

  // Usunięcie
  {
    const { error } = await me.rpc('remove_listing', { p_id: id });
    check('usunięcie', !error, error?.message);
    check('usunięte niewidoczne publicznie', !(await visible(id)));
    check('usunięte znika z „Moich ogłoszeń”', !(await me.rpc('my_listings')).data.some((x) => x.id === id));
    const { error: e2 } = await me.from('listings').update({ title: 'Wskrzeszone ogłoszenie' }).eq('id', id).select('id');
    const { data: d } = await me.from('listings').select('title').eq('id', id);
    check('usuniętego nie da się edytować', d?.[0]?.title !== 'Wskrzeszone ogłoszenie', e2?.message);
  }
} finally {
  for (const sb of [me, other]) {
    const { data, error } = await sb.functions.invoke('account-delete', { body: { password: PASSWORD } });
    check('sprzątanie konta testowego', !error && data?.ok, error?.message);
  }
}

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
