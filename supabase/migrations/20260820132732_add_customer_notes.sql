-- The existing API and admin form already accept customer notes.
alter table public.customers
  add column if not exists notes text;

revoke all on table public.customers from anon, authenticated;
grant select, insert, update, delete on table public.customers to service_role;
