-- Search every entered name part as an order-independent word prefix.
-- The FastAPI service constructs p_query from validated alphanumeric terms.

create or replace function public.search_customers_by_name_prefixes(
  p_query text,
  p_limit integer,
  p_after_id bigint
)
returns setof public.customers
language sql
stable
security invoker
set search_path = ''
as $$
  select customer.*
  from public.customers as customer
  where nullif(btrim(p_query), '') is not null
    and (p_after_id is null or customer.id > p_after_id)
    and to_tsvector(
      'simple'::regconfig,
      coalesce(customer.normalized_name, '')
    ) @@ to_tsquery('simple'::regconfig, p_query)
  order by customer.id asc
  limit least(greatest(coalesce(p_limit, 26), 1), 51)
$$;

revoke execute on function public.search_customers_by_name_prefixes(text, integer, bigint)
  from public, anon, authenticated;
grant execute on function public.search_customers_by_name_prefixes(text, integer, bigint)
  to service_role;
