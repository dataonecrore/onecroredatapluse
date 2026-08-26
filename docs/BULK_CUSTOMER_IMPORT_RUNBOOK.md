# Bulk customer import runbook

This importer is for the production-scale CSV load. It connects directly to
Postgres, streams the file, uses `COPY` for each batch, and checkpoints every
committed source row. It does not upload the source file through the browser.

## Before importing

1. Keep the original source file unchanged while a job is running or resuming.
2. For the fastest and most reliable import, export Excel data to UTF-8 CSV.
  The direct importer also streams `.xlsx` and `.xls` files without loading the
  entire workbook into memory, but CSV remains preferable for very large jobs.
3. The confirmed source headers are `Customer Name`, `Customer Phone`,
   `Customer Address`, `City`, `State`, and `PIN Code`. Fields containing commas,
   especially `Customer Address`, must be CSV-quoted.
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
  --name-column "Customer Name" `
  --phone-column "Customer Phone" `
  --address-column "Customer Address" `
  --city-column "City" `
  --state-column "State" `
  --pin-code-column "PIN Code"
```

These are the command defaults, so the column flags may be omitted for the
confirmed file format. The importer collapses repeated whitespace in names and
address components, then stores one display address in this order: customer
address, city, state, PIN code.

The default batch size is 50,000 source rows. Start with a 10,000-row copy of
the real file and measure database load and search latency before the full run.
For millions of rows, run this command from a stable machine near the database
region; do not use the browser upload path unless it is only queuing a
controlled chunk.

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
