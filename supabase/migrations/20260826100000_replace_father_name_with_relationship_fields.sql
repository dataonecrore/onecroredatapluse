alter table public.customers
  rename column father_name to relationship_type;

alter table public.customers
  add column if not exists relationship_name text;