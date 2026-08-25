alter table public.customers
  add column if not exists father_name text,
  add column if not exists voter_id_number text,
  add column if not exists aadhar_card_number text;