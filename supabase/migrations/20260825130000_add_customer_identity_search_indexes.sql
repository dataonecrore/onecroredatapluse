alter table public.customers
  add column if not exists normalized_voter_id text generated always as (
    lower(regexp_replace(coalesce(voter_id_number, ''), '[^a-zA-Z0-9]+', '', 'g'))
  ) stored,
  add column if not exists normalized_aadhar text generated always as (
    regexp_replace(coalesce(aadhar_card_number, ''), '[^0-9]+', '', 'g')
  ) stored;

create index if not exists customers_normalized_voter_id_idx
  on public.customers (normalized_voter_id text_pattern_ops);

create index if not exists customers_normalized_aadhar_idx
  on public.customers (normalized_aadhar text_pattern_ops);