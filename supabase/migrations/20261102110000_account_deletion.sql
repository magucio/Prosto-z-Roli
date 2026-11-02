-- Prosto z Roli — migracja 5: usuwanie konta (RODO)
-- Wiadomości i rozmowy zostają u rozmówcy jako „konto usunięte” (SET NULL zamiast CASCADE).
-- Dane identyfikacyjne przedsiębiorcy (DSA art. 30) trafiają do archiwum na 6 miesięcy.

alter table public.messages alter column sender_id drop not null;
alter table public.messages drop constraint messages_sender_id_fkey;
alter table public.messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.profiles (id) on delete set null;

alter table public.conversations alter column seller_id drop not null;
alter table public.conversations alter column buyer_id drop not null;
alter table public.conversations drop constraint conversations_seller_id_fkey;
alter table public.conversations drop constraint conversations_buyer_id_fkey;
alter table public.conversations add constraint conversations_seller_id_fkey
  foreign key (seller_id) references public.profiles (id) on delete set null;
alter table public.conversations add constraint conversations_buyer_id_fkey
  foreign key (buyer_id) references public.profiles (id) on delete set null;

create table private.deleted_trader_archive (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  data jsonb not null,
  archived_at timestamptz not null default now(),
  delete_after timestamptz not null
);

create or replace function private.prepare_account_deletion(p_uid uuid)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_paths text[];
begin
  insert into private.deleted_trader_archive (user_id, data, delete_after)
  select tv.user_id, to_jsonb(tv), now() + interval '6 months'
  from public.trader_verifications tv where tv.user_id = p_uid;

  select coalesce(array_agg(o.name), '{}') into v_paths
  from storage.objects o
  where o.bucket_id = 'listing-images'
    and (storage.foldername(o.name))[2] in (select l.id::text from public.listings l where l.owner_id = p_uid);

  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (null, 'account.delete', 'user', p_uid, jsonb_build_object('images', coalesce(array_length(v_paths, 1), 0)));
  return v_paths;
end $$;
revoke all on function private.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function private.prepare_account_deletion(uuid) to service_role;

-- Wywoływane wyłącznie przez Edge Function account-delete (service_role); klienci nie mają EXECUTE.
create or replace function public.service_prepare_account_deletion(p_uid uuid)
returns text[] language sql security definer set search_path = '' as $$
  select private.prepare_account_deletion(p_uid);
$$;
revoke all on function public.service_prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.service_prepare_account_deletion(uuid) to service_role;
