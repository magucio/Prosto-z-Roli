// Test end-to-end kont na żywym Supabase (bez e-maili): logowanie, profil, dane firmy, zmiana hasła, usunięcie konta.
// Wymaga konta testowego e2e-test@prostozroli.invalid / Testowe123 (zakładanego SQL-em przed testem).
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'https://ojctjylqfcrdkcwzmfuo.supabase.co';
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_oKV-AWbBp9QiaOWNKGpQHw_K0zTHPpO';
const EMAIL = 'e2e-test@prostozroli.invalid';
let password = 'Testowe123';
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const sb = client();
{
  const { error } = await sb.auth.signInWithPassword({ email: EMAIL, password: 'zlehaslo1' });
  check('złe hasło odrzucone', error?.code === 'invalid_credentials', error?.code);
}
const { data: login, error: loginErr } = await sb.auth.signInWithPassword({ email: EMAIL, password });
check('logowanie', !loginErr && !!login.session, loginErr?.message);
const uid = login.user.id;

{
  const { data, error } = await sb.rpc('my_account');
  check('my_account: profil z triggera', !error && data?.display_name === 'Test E2E' && data?.seller_type === 'farm', JSON.stringify(error ?? data?.display_name));
}
{
  const { error } = await sb.from('profiles').update({ display_name: 'Sad Testowy', seller_type: 'company' }).eq('id', uid);
  check('edycja profilu', !error, error?.message);
  const { error: e2 } = await sb.from('profiles').update({ is_blocked: false }).eq('id', uid);
  check('nie można zmienić is_blocked', !!e2, e2?.code);
}
{
  const { error } = await sb.from('seller_profiles').upsert({ user_id: uid, company_name: 'Sad Testowy sp.', nip: '5260250274', postal_code: '00-001', city: 'Warszawa' });
  check('dane firmy (upsert)', !error, error?.message);
  const { error: e2 } = await sb.from('seller_profiles').upsert({ user_id: '00000000-0000-0000-0000-000000000001', company_name: 'Cudza' });
  check('nie można zapisać cudzych danych firmy', !!e2, e2?.code);
  const { data } = await sb.rpc('my_account');
  check('my_account zwraca dane firmy', data?.seller_profile?.nip === '5260250274' && data?.seller_type === 'company');
}
{
  const anon = client();
  const { data, error } = await anon.from('seller_profiles').select('nip');
  check('anonim nie widzi NIP', !!error || (data ?? []).length === 0, error?.code ?? `${data?.length} wierszy`);
}
{
  const { error } = await sb.auth.updateUser({ password: 'NoweHaslo456' });
  check('zmiana hasła', !error, error?.message);
  if (!error) password = 'NoweHaslo456';
  const s2 = client();
  const { error: e2 } = await s2.auth.signInWithPassword({ email: EMAIL, password });
  check('logowanie nowym hasłem', !e2, e2?.message);
}
{
  const { data, error } = await sb.functions.invoke('account-delete', { body: { password: 'zle-haslo-9' } });
  let code = data?.error;
  if (error?.context) code = (await error.context.json()).error;
  check('usunięcie konta ze złym hasłem odrzucone', code === 'invalid_password', code);
}
{
  const anon = client();
  const { error } = await anon.functions.invoke('account-delete', { body: { password } });
  check('usunięcie konta bez logowania odrzucone', !!error);
}
{
  const { data, error } = await sb.functions.invoke('account-delete', { body: { password } });
  check('usunięcie konta', !error && data?.ok === true, error?.message);
  const s3 = client();
  const { error: e3 } = await s3.auth.signInWithPassword({ email: EMAIL, password });
  check('po usunięciu nie da się zalogować', !!e3, e3?.code);
}

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
