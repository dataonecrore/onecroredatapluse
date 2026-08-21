alter table public.customers
  add column if not exists whatsapp_phone text;

create index if not exists customers_whatsapp_phone_idx
  on public.customers (whatsapp_phone)
  where whatsapp_phone is not null;