-- Append-only successful-login telemetry for the admin Reports workspace.
-- Times are stored in UTC and grouped in Asia/Kolkata by the reporting RPC.

create table public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  user_name text,
  occurred_at timestamptz not null default now()
);

create index login_events_occurred_at_idx
  on public.login_events (occurred_at desc);

create index login_events_user_occurred_at_idx
  on public.login_events (user_id, occurred_at desc);

alter table public.login_events enable row level security;

revoke all on table public.login_events from public, anon, authenticated;
revoke all on sequence public.login_events_id_seq from public, anon, authenticated;
grant select, insert on table public.login_events to service_role;
grant usage, select on sequence public.login_events_id_seq to service_role;

comment on table public.login_events is
  'Successful application logins. Server-only; no anon or authenticated policies.';

create or replace function public.login_activity_summary(p_period text default 'daily')
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  v_now_local timestamp without time zone := timezone('Asia/Kolkata', now());
  v_start_local timestamp without time zone;
  v_end_local timestamp without time zone;
  v_step interval;
  v_total_logins bigint;
  v_unique_users bigint;
  v_series jsonb;
begin
  case p_period
    when 'daily' then
      v_start_local := date_trunc('day', v_now_local);
      v_end_local := v_start_local + interval '1 day';
      v_step := interval '1 hour';
    when 'weekly' then
      v_start_local := date_trunc('week', v_now_local);
      v_end_local := v_start_local + interval '7 days';
      v_step := interval '1 day';
    when 'monthly' then
      v_start_local := date_trunc('month', v_now_local);
      v_end_local := v_start_local + interval '1 month';
      v_step := interval '1 day';
    when 'all' then
      select date_trunc('month', min(timezone('Asia/Kolkata', occurred_at)))
        into v_start_local
      from public.login_events;
      v_start_local := coalesce(v_start_local, date_trunc('month', v_now_local));
      v_end_local := date_trunc('month', v_now_local) + interval '1 month';
      v_step := interval '1 month';
    else
      raise exception 'Unsupported report period: %', p_period using errcode = '22023';
  end case;

  select count(*), count(distinct user_id)
    into v_total_logins, v_unique_users
  from public.login_events
  where occurred_at >= (v_start_local at time zone 'Asia/Kolkata')
    and occurred_at < (v_end_local at time zone 'Asia/Kolkata');

  with buckets as (
    select generate_series(v_start_local, v_end_local - v_step, v_step) as bucket_start
  ), bucket_counts as (
    select
      buckets.bucket_start,
      count(login_events.id) as login_count,
      count(distinct login_events.user_id) as unique_users
    from buckets
    left join public.login_events
      on login_events.occurred_at >= (buckets.bucket_start at time zone 'Asia/Kolkata')
     and login_events.occurred_at < ((buckets.bucket_start + v_step) at time zone 'Asia/Kolkata')
    group by buckets.bucket_start
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bucket_start', to_char(bucket_start, 'YYYY-MM-DD"T"HH24:MI:SS'),
        'label', case
          when p_period = 'daily' then to_char(bucket_start, 'HH24:MI')
          when p_period in ('weekly', 'monthly') then to_char(bucket_start, 'DD Mon')
          else to_char(bucket_start, 'Mon YYYY')
        end,
        'login_count', login_count,
        'unique_users', unique_users
      )
      order by bucket_start
    ),
    '[]'::jsonb
  ) into v_series
  from bucket_counts;

  return jsonb_build_object(
    'period', p_period,
    'timezone', 'Asia/Kolkata',
    'period_start', to_char(v_start_local, 'YYYY-MM-DD"T"HH24:MI:SS'),
    'period_end', to_char(v_end_local, 'YYYY-MM-DD"T"HH24:MI:SS'),
    'total_logins', v_total_logins,
    'unique_users', v_unique_users,
    'series', v_series,
    'generated_at', now()
  );
end;
$function$;

revoke all on function public.login_activity_summary(text) from public, anon, authenticated;
grant execute on function public.login_activity_summary(text) to service_role;

comment on function public.login_activity_summary(text) is
  'Server-only IST login aggregates for daily, weekly, monthly, and all-time reports.';
