-- Prefer indexed name-prefix searches for large customer datasets.
-- Substring searches across 100M rows require a separate search service.

create index if not exists customers_normalized_name_prefix_idx
  on public.customers (normalized_name text_pattern_ops);

drop index if exists public.customers_normalized_name_trgm_idx;