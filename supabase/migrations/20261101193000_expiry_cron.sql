-- Prosto z Roli — migracja 4: automatyczne wygasanie ogłoszeń (pg_cron) i liczniki limitów bez wzrostu
-- Uwaga: private.rate_counters z migracji 1 jest nieużywana od tej migracji (do usunięcia w porządkach).

create extension if not exists pg_cron with schema pg_catalog;

-- jeden wiersz na (użytkownik, akcja): okno nadpisywane w miejscu, tabela nie rośnie
create table private.rate_limits (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (user_id, action)
);

create or replace function private.check_rate(p_action text, p_limit int, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_secs double precision := extract(epoch from p_window);
  v_start timestamptz;
  v_hits int;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  v_start := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);
  insert into private.rate_limits as rl (user_id, action, window_start, hits)
  values (v_uid, p_action, v_start, 1)
  on conflict (user_id, action) do update
    set hits = case when rl.window_start = excluded.window_start then rl.hits + 1 else 1 end,
        window_start = excluded.window_start
  returning hits into v_hits;
  if v_hits > p_limit then
    raise exception 'rate_limit:%', p_action using errcode = 'P0429';
  end if;
end $$;
revoke all on function private.check_rate(text, int, interval) from public;
grant execute on function private.check_rate(text, int, interval) to authenticated;

create or replace function private.expire_listings()
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  update public.listings set status = 'expired'
  where status = 'active' and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function private.expire_listings() from public;

select cron.schedule('expire-listings', '7 * * * *', 'select private.expire_listings()');
