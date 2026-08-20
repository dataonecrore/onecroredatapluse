# Bulk customer import runbook

This importer is for the production-scale CSV load. It connects directly to
Postgres, streams the file, uses `COPY` for each batch, and checkpoints every
committed source row. It does not upload the source file through the browser.

## Before importing

1. Keep the original source file unchanged while a job is running or resuming.
2. Export Excel data to UTF-8 CSV. The production importer intentionally rejects
   `.xlsx` and `.xls` files.
3. Confirm the exact header names for customer name, phone, and address.
4. Choose the duplicate rule explicitly:
   - `preserve`: store every valid source row, including repeated phone numbers.
   - `skip-phone`: retain the earliest encountered row for each normalized phone
     and skip phones already present in `customers`.
5. Use a direct or session-mode Supabase Postgres connection string. Never put
   this value in the frontend or commit it to Git.

## Install and run

From the repository root:

```powershell
python -m pip install -r backend/requirements.txt
$env:SUPABASE_DB_URL = "postgresql://..."
python -m backend.bulk_import `
  --file "D:\imports\customers.csv" `
  --duplicate-mode preserve `
  --name-column "customer_name" `
  --phone-column "phone" `
  --address-column "address"
```

The default batch size is 50,000 source rows. Start with a 10,000-row copy of
the real file and measure database load and search latency before the full run.

## Resume

Each progress line prints a job UUID and the last committed source row. Re-run
with the same unmodified file, the same duplicate mode, and `--job-id`:

```powershell
python -m backend.bulk_import `
  --file "D:\imports\customers.csv" `
  --duplicate-mode preserve `
  --job-id "00000000-0000-0000-0000-000000000000"
```

The importer verifies the full-file SHA-256 checksum before resuming. A failed
batch rolls back; prior committed batches remain safe. Rejected raw customer
data is not copied to the job log—only its source row and validation reason are
stored.

## Rollout gates

- Apply the migration in a controlled deployment window.
- Import and review a 10,000-row representative test file first.
- Verify counts, rejected-row reasons, duplicate behavior, and name/phone search.
- Record the chosen mode and job UUID.
- Run the full file from a stable machine close to the database region.
- Compare final source, inserted, rejected, and intentionally skipped totals.

The current command does not update an existing customer when a phone repeats.
That behavior is intentionally excluded until the ownership and overwrite rule
for shared or recycled phone numbers is confirmed.
