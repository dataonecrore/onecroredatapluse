-- Resumable, server-side CSV imports for data sets that are too large for the
-- browser or PostgREST. The private schema is intentionally not exposed by the
-- API. Apply this migration before running backend/bulk_import.py.

create schema if not exists private;

alter table public.customers
  add column if not exists import_job_id uuid,
  add column if not exists import_source_row bigint,
  add column if not exists source_customer_id text;

create unique index if not exists customers_import_source_row_uidx
  on public.customers (import_job_id, import_source_row)
  where import_job_id is not null and import_source_row is not null;

create table if not exists private.customer_import_jobs (
  id uuid primary key,
  source_filename text not null,
  source_sha256 text not null,
  duplicate_mode text not null check (duplicate_mode in ('preserve', 'skip-phone')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  last_committed_row bigint not null default 0 check (last_committed_row >= 0),
  rows_inserted bigint not null default 0 check (rows_inserted >= 0),
  rows_skipped bigint not null default 0 check (rows_skipped >= 0),
  rows_rejected bigint not null default 0 check (rows_rejected >= 0),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_import_jobs_source_mode_uidx
  on private.customer_import_jobs (source_sha256, duplicate_mode);

create table if not exists private.customer_import_rejections (
  import_job_id uuid not null references private.customer_import_jobs(id) on delete cascade,
  source_row bigint not null check (source_row > 0),
  error_code text not null,
  error_message text not null,
  created_at timestamptz not null default now(),
  primary key (import_job_id, source_row)
);

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

comment on table private.customer_import_jobs is
  'Server-side bulk import checkpoints. Not exposed through the Data API.';
comment on table private.customer_import_rejections is
  'Row numbers and validation reasons only; rejected customer PII is not retained.';
