-- User-owned customer follow-ups. Browser roles do not access this table
-- directly; authenticated requests are validated and scoped by FastAPI.

create table public.follow_ups (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 160),
  notes text,
  due_at timestamptz not null,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  channel text not null default 'call'
    check (channel in ('call', 'meeting', 'whatsapp', 'email', 'other')),
  status text not null default 'open'
    check (status in ('open', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'open' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create index follow_ups_user_status_due_idx
  on public.follow_ups (user_id, status, due_at, id);

create index follow_ups_customer_idx
  on public.follow_ups (customer_id);

alter table public.follow_ups enable row level security;

create policy "Users can view their own follow-ups"
  on public.follow_ups for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own follow-ups"
  on public.follow_ups for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own follow-ups"
  on public.follow_ups for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own follow-ups"
  on public.follow_ups for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.follow_ups from public, anon, authenticated;
revoke all on sequence public.follow_ups_id_seq from public, anon, authenticated;
grant select, insert, update, delete on table public.follow_ups to service_role;
grant usage, select on sequence public.follow_ups_id_seq to service_role;

comment on table public.follow_ups is
  'Customer follow-up tasks owned by individual authenticated application users.';
