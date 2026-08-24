# 100M customer data deployment plan

One crore means 10 million records. The longer-term target of 100M records should be treated as a staged database capacity target, not as a browser-upload target.

## Current architecture

- The website is a React/Vite frontend backed by FastAPI.
- Customer reads go through FastAPI; the browser does not receive the service-role key.
- Search uses normalized phone and name columns with cursor pagination.
- Production imports use `backend/bulk_import.py`, a direct Postgres connection, bounded `COPY` batches, transactions, SHA-256 verification, and resumable checkpoints.
- The website upload endpoint streams files to disk. Files above the small-validation threshold are routed to the direct PostgreSQL `COPY` importer when `SUPABASE_DB_URL` is configured; they must be CSV and use New mode with phone duplicate handling.

## Required loading model

Keep the 100M source data in immutable CSV chunks or source files and import only the records needed by the product at a given stage. Do not upload the full corpus through the browser or PostgREST.

The website is a control surface, not a high-volume API writer. For a 30M-row load, split the source into chunks and upload one chunk at a time. Configure `MAX_IMPORT_SIZE_BYTES` above the expected chunk size and keep enough disk space for the uploaded file plus the active database import. A reverse proxy, request timeout, and ephemeral disk must also support the chosen chunk size; object storage plus a worker is preferred for unattended imports.

Recommended process:

1. Export source data as UTF-8 CSV and split it into immutable chunks, preferably 250,000 to 1,000,000 source rows each.
2. Record a manifest containing chunk filename, row count, byte size, SHA-256 checksum, source date, and import status.
3. Apply and verify the Supabase migrations before loading customer data.
4. Import one chunk with `python -m backend.bulk_import` and an explicit duplicate mode.
5. Verify inserted, rejected, skipped, and source-row counts before importing the next chunk.
6. Run `ANALYZE public.customers` after a large loading window and monitor query plans.
7. Retain source files and job IDs until reconciliation is complete; then move cold chunks to object storage.

The current importer already supports repeated jobs and resume after a failed committed batch. A resumed job must use the same unchanged file, checksum, and duplicate mode.

## Database gates

Do not call the system 100M-ready until the real Supabase project passes these gates:

- 10K-row representative import
- 1M-row rehearsal
- 10M-row rehearsal
- Controlled 100M capacity test or an approved extrapolation from measured results
- Import throughput, transaction duration, CPU, memory, WAL, storage, and index-build measurements
- Search p95 latency during an active import
- Restart during a batch followed by successful resume
- Concurrent search traffic during loading
- Import locking and duplicate behavior across separate source files
- Backup and restore verification at the intended database size

Use `EXPLAIN (ANALYZE, BUFFERS)` for both indexed phone-prefix searches and substring name searches. The trigram name index may be large at this scale and must be measured rather than assumed affordable.

## Data model decision before scale-out

The current checked-in migrations assume an existing legacy `public.customers` table and do not define a business or workspace ownership column. Before onboarding multiple paying businesses with shared data infrastructure, define the tenant boundary and add it to customer rows, imports, queries, uniqueness rules, and indexes. This is a data-isolation requirement, not only an optimization.

Phone duplicate semantics also need a decision:

- `preserve` allows repeated normalized phone values.
- `skip-phone` is best-effort across imported batches and is not a global uniqueness guarantee.

Do not add a global unique phone index until the product explicitly chooses a uniqueness rule and handles shared or recycled numbers.

## Website readiness

The website is suitable as the customer search and management interface, but it should never be the 100M ingestion interface. Before launch at this scale, add product-level controls for:

- per-business search and export quotas
- export job limits and asynchronous export processing
- import status and reconciliation visibility
- billing plans and usage metering
- tenant-scoped authorization

The proposed ₹499, ₹999, and ₹1,999 plans are commercial assumptions only. They are not currently enforced by the website or database.

## Capacity planning

The live database size will be larger than compressed CSV files because rows, generated columns, indexes, WAL, vacuum space, and backups all consume storage. Measure the actual row width and index sizes on the target Supabase tier. Reserve operational headroom for imports, index maintenance, backups, and concurrent application traffic instead of sizing to the raw data file alone.

Provisioning the Supabase tier, applying migrations, and running the capacity test require access to the live Supabase project. This repository can prepare the schema and application, but it cannot validate cloud capacity without that project connection.
