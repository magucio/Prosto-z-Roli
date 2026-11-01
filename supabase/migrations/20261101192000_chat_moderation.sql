-- Prosto z Roli — migracja 3: czat, ulubione, powiadomienia, zgłoszenia, moderacja, audyt

-- ================================================================ audyt
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
create policy audit_logs_admin on public.audit_logs for select to authenticated using (private.is_admin('admin'));

create or replace function private.audit(p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'));
$$;
revoke all on function private.audit(text, text, uuid, jsonb) from public;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  target_type text not null check (target_type in ('listing', 'user', 'message', 'report')),
  target_id uuid not null,
  action text not null,
  reason text check (char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);
create index moderation_actions_admin_idx on public.moderation_actions (admin_id);
alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from anon, authenticated;
grant select on public.moderation_actions to authenticated;
create policy moderation_actions_admin on public.moderation_actions for select to authenticated
  using (private.is_admin());

-- ================================================================ czat
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  listing_title text not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (seller_id <> buyer_id)
);
create index conversations_seller_idx on public.conversations (seller_id);
create index conversations_buyer_idx on public.conversations (buyer_id);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  archived boolean not null default false,
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id);

create or replace function private.is_participant(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_participants
                 where conversation_id = p_conversation_id and user_id = auth.uid());
$$;
revoke all on function private.is_participant(uuid) from public;
grant execute on function private.is_participant(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
revoke all on public.conversations, public.conversation_participants, public.messages from anon, authenticated;
grant select on public.conversations, public.conversation_participants, public.messages to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;
grant update (archived) on public.conversation_participants to authenticated;

create policy conversations_read on public.conversations for select to authenticated
  using (private.is_participant(id) or private.is_admin());
create policy participants_read on public.conversation_participants for select to authenticated
  using (private.is_participant(conversation_id));
create policy participants_update_own on public.conversation_participants for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy messages_read on public.messages for select to authenticated
  using (private.is_participant(conversation_id) or private.is_admin());
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.is_participant(conversation_id));

create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('illegal', 'fraud', 'spam', 'offensive', 'wrong_category',
                                         'restricted_product', 'other', 'auto_filter')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  resolution_note text check (char_length(resolution_note) <= 1000),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(listing_id, message_id, reported_user_id) <= 1)
);
create index abuse_reports_status_idx on public.abuse_reports (status, created_at);
create index abuse_reports_reporter_idx on public.abuse_reports (reporter_id);
create index abuse_reports_listing_idx on public.abuse_reports (listing_id);
create index abuse_reports_message_idx on public.abuse_reports (message_id);
create index abuse_reports_user_idx on public.abuse_reports (reported_user_id);
alter table public.abuse_reports enable row level security;
revoke all on public.abuse_reports from anon, authenticated;
-- autor widzi status zgłoszenia, ale nie notatki moderatora
grant select (id, listing_id, message_id, reported_user_id, reason, details, status, created_at)
  on public.abuse_reports to authenticated;
create policy abuse_reports_own on public.abuse_reports for select to authenticated
  using (reporter_id = (select auth.uid()));

create or replace function private.messages_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_other uuid;
begin
  if private.is_user_blocked(new.sender_id) then
    raise exception 'account_blocked' using errcode = 'P0403';
  end if;
  select user_id into v_other from public.conversation_participants
  where conversation_id = new.conversation_id and user_id <> new.sender_id limit 1;
  if v_other is not null and private.is_blocked_between(new.sender_id, v_other) then
    raise exception 'blocked' using errcode = 'P0403';
  end if;
  perform private.check_rate('message', 30, interval '10 minutes');
  if private.word_filter(new.body, 'message') = 'reject' then
    raise exception 'blocked_words' using errcode = 'P0422';
  end if;
  return new;
end $$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function private.messages_before_insert();

create or replace function private.messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_participants set last_read_at = new.created_at, archived = false
  where conversation_id = new.conversation_id and user_id = new.sender_id;
  update public.conversation_participants set archived = false
  where conversation_id = new.conversation_id and user_id <> new.sender_id;
  if private.word_filter(new.body, 'message') = 'review' then
    insert into public.abuse_reports (message_id, reason, details)
    values (new.id, 'auto_filter', 'Wiadomość zawiera słowo z listy do moderacji');
  end if;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function private.messages_after_insert();

create or replace function public.start_conversation(p_listing_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  l record;
  v_conv uuid;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  select li.owner_id, li.title, cs.allow_chat into l
  from public.listings li join public.listing_contact_settings cs on cs.listing_id = li.id
  where li.id = p_listing_id and li.status = 'active' and li.expires_at > now();
  if not found then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  if l.owner_id = v_uid then
    raise exception 'own_listing' using errcode = '22023';
  end if;
  if not l.allow_chat then
    raise exception 'chat_disabled' using errcode = 'P0403';
  end if;
  if private.is_blocked_between(v_uid, l.owner_id) then
    raise exception 'blocked' using errcode = 'P0403';
  end if;

  select id into v_conv from public.conversations where listing_id = p_listing_id and buyer_id = v_uid;
  if v_conv is null then
    perform private.check_rate('start_conversation', 10, interval '1 day');
    insert into public.conversations (listing_id, seller_id, buyer_id, listing_title)
    values (p_listing_id, l.owner_id, v_uid, l.title)
    returning id into v_conv;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conv, v_uid), (v_conv, l.owner_id);
    -- sprzedawca ma nieprzeczytaną pierwszą wiadomość
    update public.conversation_participants set last_read_at = '-infinity'
    where conversation_id = v_conv and user_id = l.owner_id;
  end if;

  insert into public.messages (conversation_id, sender_id, body) values (v_conv, v_uid, p_body);
  return v_conv;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.conversation_participants set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
$$;

create or replace function public.my_conversations()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x order by x ->> 'last_message_at' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', c.id, 'listing_id', c.listing_id, 'listing_title', c.listing_title,
      'last_message_at', c.last_message_at, 'archived', me.archived,
      'i_am_seller', c.seller_id = auth.uid(),
      'other', (select jsonb_build_object('id', p.id, 'display_name', p.display_name)
                from public.profiles p
                where p.id = case when c.seller_id = auth.uid() then c.buyer_id else c.seller_id end),
      'last_message', (select jsonb_build_object('body', left(m.body, 140), 'sender_id', m.sender_id,
                                                 'created_at', m.created_at)
                       from public.messages m where m.conversation_id = c.id
                       order by m.created_at desc limit 1),
      'unread', (select count(*) from public.messages m
                 where m.conversation_id = c.id and m.sender_id <> auth.uid()
                   and m.created_at > me.last_read_at)) as x
    from public.conversations c
    join public.conversation_participants me on me.conversation_id = c.id and me.user_id = auth.uid()
  ) s;
$$;

create or replace function public.unread_messages_count()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.conversation_participants me
  join public.messages m on m.conversation_id = me.conversation_id
  where me.user_id = auth.uid() and m.sender_id <> auth.uid() and m.created_at > me.last_read_at;
$$;

-- ================================================================ ulubione, powiadomienia, push
create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on public.favorites (listing_id);
alter table public.favorites enable row level security;
revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (listing_id) on public.favorites to authenticated;
create policy favorites_own_read on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));
create policy favorites_own_insert on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy favorites_own_delete on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  kind text not null check (kind in ('expiry_7d', 'expiry_1d', 'message', 'moderation')),
  expires_at timestamptz,
  title text not null check (char_length(title) <= 120),
  body text not null check (char_length(body) <= 500),
  data jsonb not null default '{}',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, kind, expires_at)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unsent_idx on public.notifications (created_at) where sent_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique check (char_length(token) between 10 and 300),
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;
grant select, delete on public.push_tokens to authenticated;
create policy push_tokens_own_read on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_tokens_own_delete on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- token urządzenia przechodzi na aktualnie zalogowane konto
create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  insert into public.push_tokens (user_id, token, platform) values (auth.uid(), p_token, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform,
    last_seen_at = now();
end $$;

-- ================================================================ zgłoszenia (DSA art. 16)
create or replace function public.report_content(p_target_type text, p_target_id uuid, p_reason text,
                                                  p_details text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_reason = 'auto_filter' then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  perform private.check_rate('report', 20, interval '1 day');
  if p_target_type = 'listing' then
    if not exists (select 1 from public.listings where id = p_target_id and status in ('active', 'pending_review')) then
      raise exception 'not_found' using errcode = 'P0404';
    end if;
    select id into v_id from public.abuse_reports
    where reporter_id = v_uid and listing_id = p_target_id and status in ('open', 'in_review');
    if v_id is null then
      insert into public.abuse_reports (reporter_id, listing_id, reason, details)
      values (v_uid, p_target_id, p_reason, p_details) returning id into v_id;
    end if;
  elsif p_target_type = 'message' then
    if not exists (select 1 from public.messages m where m.id = p_target_id
                   and private.is_participant(m.conversation_id)) then
      raise exception 'not_found' using errcode = 'P0404';
    end if;
    insert into public.abuse_reports (reporter_id, message_id, reason, details)
    values (v_uid, p_target_id, p_reason, p_details) returning id into v_id;
  elsif p_target_type = 'user' then
    if p_target_id = v_uid or not exists (select 1 from public.profiles where id = p_target_id) then
      raise exception 'not_found' using errcode = 'P0404';
    end if;
    insert into public.abuse_reports (reporter_id, reported_user_id, reason, details)
    values (v_uid, p_target_id, p_reason, p_details) returning id into v_id;
  else
    raise exception 'invalid_target' using errcode = '22023';
  end if;
  return v_id;
end $$;

-- ================================================================ RPC moderatora (panel web i mobilny)
create or replace function private.require_admin(p_min public.admin_role default 'moderator')
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin(p_min) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
end $$;
revoke all on function private.require_admin(public.admin_role) from public;

create or replace function public.admin_set_listing_status(p_id uuid, p_status public.listing_status, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_status not in ('active', 'blocked', 'removed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  update public.listings set
    status = p_status,
    expires_at = case when p_status = 'active' and (expires_at is null or expires_at <= now())
                      then now() + interval '60 days' else expires_at end
  where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  insert into public.moderation_actions (admin_id, target_type, target_id, action, reason)
  values (auth.uid(), 'listing', p_id, 'set_status:' || p_status, p_reason);
  perform private.audit('listing.set_status', 'listing', p_id, jsonb_build_object('status', p_status, 'reason', p_reason));
end $$;

create or replace function public.admin_block_user(p_user_id uuid, p_until timestamptz, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_user_id = auth.uid() then
    raise exception 'cannot_block_self' using errcode = '22023';
  end if;
  update public.profiles set is_blocked = true, blocked_until = p_until, blocked_reason = p_reason
  where id = p_user_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  update public.listings set status = 'blocked'
  where owner_id = p_user_id and status in ('active', 'pending_review', 'paused');
  insert into public.moderation_actions (admin_id, target_type, target_id, action, reason)
  values (auth.uid(), 'user', p_user_id, 'block', p_reason);
  perform private.audit('user.block', 'user', p_user_id, jsonb_build_object('until', p_until, 'reason', p_reason));
end $$;

create or replace function public.admin_unblock_user(p_user_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.profiles set is_blocked = false, blocked_until = null, blocked_reason = null
  where id = p_user_id;
  insert into public.moderation_actions (admin_id, target_type, target_id, action, reason)
  values (auth.uid(), 'user', p_user_id, 'unblock', p_reason);
  perform private.audit('user.unblock', 'user', p_user_id, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_resolve_report(p_id uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_status not in ('in_review', 'resolved', 'rejected') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  update public.abuse_reports set status = p_status, resolution_note = p_note,
    resolved_by = case when p_status in ('resolved', 'rejected') then auth.uid() end,
    resolved_at = case when p_status in ('resolved', 'rejected') then now() end
  where id = p_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0404';
  end if;
  insert into public.moderation_actions (admin_id, target_type, target_id, action, reason)
  values (auth.uid(), 'report', p_id, 'report:' || p_status, p_note);
  perform private.audit('report.resolve', 'report', p_id, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_reports(p_status text default 'open', p_limit int default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object(
    'listing_title', (select l.title from public.listings l where l.id = r.listing_id),
    'message_body', (select m.body from public.messages m where m.id = r.message_id),
    'reported_user_name', (select p.display_name from public.profiles p where p.id = r.reported_user_id))
    order by r.created_at), '[]'::jsonb)
  into v
  from (select * from public.abuse_reports where status = p_status
        order by created_at limit least(greatest(p_limit, 1), 200)) r;
  return v;
end $$;

create or replace function public.admin_pending_listings(p_limit int default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform private.require_admin();
  select coalesce(jsonb_agg(public.listing_detail(l.id) order by l.updated_at), '[]'::jsonb) into v
  from (select id, updated_at from public.listings where status = 'pending_review'
        order by updated_at limit least(greatest(p_limit, 1), 200)) l;
  return v;
end $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'listings_active', (select count(*) from public.listings where status = 'active' and expires_at > now()),
    'listings_expired', (select count(*) from public.listings where status = 'expired'),
    'listings_pending', (select count(*) from public.listings where status = 'pending_review'),
    'listings_today', (select count(*) from public.listings where published_at >= date_trunc('day', now())),
    'reports_open', (select count(*) from public.abuse_reports where status = 'open'),
    'users_total', (select count(*) from public.profiles),
    'users_active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'users_active_30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.start_conversation(uuid, text)', 'public.mark_conversation_read(uuid)',
    'public.my_conversations()', 'public.unread_messages_count()',
    'public.register_push_token(text, text)', 'public.report_content(text, uuid, text, text)',
    'public.admin_set_listing_status(uuid, public.listing_status, text)',
    'public.admin_block_user(uuid, timestamptz, text)', 'public.admin_unblock_user(uuid, text)',
    'public.admin_resolve_report(uuid, text, text)', 'public.admin_reports(text, int)',
    'public.admin_pending_listings(int)', 'public.admin_stats()']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

revoke all on function private.messages_before_insert() from public;
revoke all on function private.messages_after_insert() from public;

-- ================================================================ Realtime (RLS na messages obowiązuje)
alter publication supabase_realtime add table public.messages;

