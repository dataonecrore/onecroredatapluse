alter table public.customers
  add column if not exists relationship_type text,
  add column if not exists relationship_name text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'father_name'
  ) then
    update public.customers
    set relationship_type = father_name
    where relationship_type is null
      and father_name is not null;

    alter table public.customers drop column father_name;
  end if;
end
$$;