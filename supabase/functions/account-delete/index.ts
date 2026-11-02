// Usunięcie konta użytkownika (RODO). Wymaga zalogowanej sesji ORAZ ponownego podania hasła.
// Kolejność: weryfikacja → archiwum DSA + lista zdjęć (RPC) → usunięcie zdjęć ze Storage → usunięcie użytkownika.
// Usunięcie użytkownika kaskadowo usuwa profil, ogłoszenia, ulubione i tokeny; wiadomości zostają u rozmówcy bez autora.
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) return json(500, { error: 'misconfigured' });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'auth_required' });

  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return json(400, { error: 'invalid_body' });
  }
  if (!password) return json(400, { error: 'password_required' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.email) return json(401, { error: 'auth_required' });

  // Ponowne uwierzytelnienie hasłem — skradziony token sesji nie wystarczy do usunięcia konta.
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: pwError } = await anon.auth.signInWithPassword({ email: user.email, password });
  if (pwError) return json(403, { error: 'invalid_password' });

  const { data: paths, error: prepError } = await admin.rpc('service_prepare_account_deletion', { p_uid: user.id });
  if (prepError) {
    console.error('prepare failed', prepError.message);
    return json(500, { error: 'prepare_failed' });
  }

  const files = (paths as string[] | null) ?? [];
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await admin.storage.from('listing-images').remove(files.slice(i, i + 100));
    if (error) console.error('storage remove failed', error.message);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('delete failed', deleteError.message);
    return json(500, { error: 'delete_failed' });
  }
  return json(200, { ok: true });
});
