alter table public.customers
  add column if not exists sms_opt_in boolean not null default false,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists email_opt_in boolean not null default false;

create index if not exists customers_sms_opt_in_idx on public.customers (sms_opt_in) where sms_opt_in;
create index if not exists customers_whatsapp_opt_in_idx on public.customers (whatsapp_opt_in) where whatsapp_opt_in;
create index if not exists customers_email_opt_in_idx on public.customers (email_opt_in) where email_opt_in;