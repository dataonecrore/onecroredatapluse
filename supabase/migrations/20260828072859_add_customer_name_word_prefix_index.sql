-- Build an expression index without blocking customer imports or other writes.
-- CREATE INDEX CONCURRENTLY must run outside a transaction/pipeline.

create index concurrently if not exists customers_normalized_name_words_idx
  on public.customers using gin (
    to_tsvector('simple'::regconfig, coalesce(normalized_name, ''))
  );
