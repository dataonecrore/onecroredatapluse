-- Defense in depth for private import metadata. The direct privileged importer
-- bypasses RLS; no Data API policies are intentionally created.

alter table private.customer_import_jobs enable row level security;
alter table private.customer_import_rejections enable row level security;
