-- Shared rate limits for the login pages, the website enquiry form and the chat.
-- Before this, each server instance counted on its own, so the limits didn't
-- add up across instances. Safe to run more than once.

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

-- Only the server (service role) touches this table.
alter table public.rate_limits enable row level security;

-- Counts one request for `p_key` in a fixed window and says whether it is allowed.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_ms integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rate_limits;
begin
  insert into public.rate_limits as t (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update set
    count = case when t.reset_at <= now() then 1 else t.count + 1 end,
    reset_at = case when t.reset_at <= now() then excluded.reset_at else t.reset_at end
  returning * into r;

  -- Now and then, clear windows that ended more than a day ago.
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now() - interval '1 day';
  end if;

  return query select r.count <= p_limit, greatest(0, ceil(extract(epoch from (r.reset_at - now()))))::integer;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
