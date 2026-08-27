# OneCrore CRM

Frontend stack:
- React
- Vite
- Tailwind CSS

## Run locally

```bash
npm install
npm run dev
```

## Supabase Auth setup

Set these backend environment variables before starting FastAPI:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-server-only-service-role-key
SUPABASE_DB_URL=postgresql://your-server-side-connection
ADMIN_EMAILS=admin@your-company.com
FRONTEND_URL=https://onecroredatapluse.vercel.app
```

The backend also allows preview deployments for the `onecroredatapluse` Vercel
project. Set `FRONTEND_URL` to the production or custom frontend URL when using
one.

Loopback password-recovery redirects are rejected by default. Local development
may opt in explicitly with `ALLOW_LOCAL_RECOVERY_REDIRECT=true`; never set that
variable in Railway or another hosted environment.

The app requires Supabase login by default. Temporary read-only demo mode uses local sample data and must be enabled explicitly:

```env
VITE_BYPASS_LOGIN=true
```

Keep it unset or set it to `false` in every real customer-data environment. Demo mode does not access protected customer APIs.

## Scalable customer search

The customer screen searches Supabase through the authenticated FastAPI backend. It searches only normalized customer names and phone numbers, returns at most 25 records per request, and uses cursor pagination. Addresses are stored and displayed but are not searchable.

Apply all migrations in `supabase/migrations` to the same Supabase project used by the backend before deploying the matching backend and frontend. For example, with the Supabase CLI run `supabase link --project-ref <project-ref>` once, then `supabase db push`. If PostgREST still reports a missing column after the migration, run `NOTIFY pgrst, 'reload schema';` in the Supabase SQL editor. The browser importer is for small validation batches only; do not use it for the 10-million-row production load.

The production-scale CSV importer is documented in [`docs/BULK_CUSTOMER_IMPORT_RUNBOOK.md`](docs/BULK_CUSTOMER_IMPORT_RUNBOOK.md). It uses a direct Postgres connection, bounded `COPY` batches, SHA-256 file verification, resumable checkpoints, and explicit duplicate handling. Do not apply its migration or run a production import until the source headers and duplicate-phone rule have been confirmed.

The 100M-record operating model is documented in [`docs/100M_DATA_DEPLOYMENT_PLAN.md`](docs/100M_DATA_DEPLOYMENT_PLAN.md). It covers staged chunk imports, capacity-test gates, tenant isolation, export controls, and the Supabase access required for live sizing validation.

The first administrator must be listed in `ADMIN_EMAILS`. After signing in, an admin can open **Customers** to view registered application users, invite users, and assign `user` or `admin` roles. Invitations are sent by Supabase Auth; users must complete the invitation flow before signing in.

Users may also choose **Create one** on the login screen. Self-registered accounts are always regular users and can sign in immediately without email confirmation.

Signup is protected without CAPTCHA. The default limit is 500 attempts per IP
per minute and 3 attempts per email per minute. For multi-worker production
deployments, install the backend requirements and set `REDIS_URL` to a private
Redis instance so all workers share the same limits. The limits can be tuned
with `SIGNUP_RATE_LIMIT_PER_MINUTE` and `SIGNUP_RATE_LIMIT_PER_EMAIL`. Without
Redis, the limiter falls back to per-process memory and should be treated as a
development fallback only.

Customer reads require an authenticated Supabase session. Customer writes, imports, invitations, and role changes require an administrator session. Keep `SUPABASE_KEY` and `SUPABASE_DB_URL` server-side and never expose them in frontend environment variables.

Uploads above 100 MB are routed to the PostgreSQL `COPY` importer and require
New mode with phone duplicate handling. Set `MAX_IMPORT_SIZE_BYTES` to the
maximum chunk size supported by the API host and reverse proxy; split a 30M-row
source into immutable chunks rather than sending one enormous request.

The standard browser importer processes 2,000 spreadsheet rows at a time and
writes new customers in 1,000-row API requests. Duplicate lookups remain at 250
values per request to keep request URLs bounded. These defaults can be tuned
server-side with `IMPORT_ROW_BATCH_SIZE`, `IMPORT_WRITE_BATCH_SIZE`, and
`IMPORT_LOOKUP_BATCH_SIZE`. Production `COPY` imports use 50,000-row batches by
default and support `--batch-size` values up to 250,000.

For password recovery, add `FRONTEND_URL` to Supabase Authentication URL Configuration as an allowed redirect URL and set the same value in the backend deployment.

For production, use `FRONTEND_URL=https://onecroredatapluse.vercel.app`. In Supabase **Authentication → URL Configuration**, set the Site URL to the same address and add that exact address to Redirect URLs. Every hosted deployment rejects a loopback recovery redirect and falls back to the production Vercel URL, but the Railway variable should still be corrected rather than left as `localhost`.

## Login activity reports

Apply `supabase/migrations/20260820160010_login_events_reports.sql` before deploying the matching backend. The migration creates an append-only, server-only login event table and an indexed reporting function. RLS is enabled, direct `anon` and `authenticated` access is revoked, and only the backend service role can record and summarize login activity.

Admins can open **Reports** to monitor successful logins for today, this week, this month, or all time. Metrics use the `Asia/Kolkata` timezone and include total logins, unique users, average logins per user, a time-bucket trend, and the latest 25 sign-ins. Tracking starts after the migration and backend are deployed; Supabase Auth does not provide enough history to reconstruct every earlier login.

Reports also provides **Export logins** for the selected period and **Export users** for the complete registered-user list. The user export includes `last_sign_in_at`, which can be used to identify active users in a spreadsheet; a blank value means the account has never signed in.

## Customer follow-ups

Apply `supabase/migrations/20260821041254_create_follow_ups.sql` before deploying
the matching backend and frontend. The migration creates user-owned follow-up
tasks linked to customer records, with indexed status/due-date queries and RLS
ownership policies. Direct browser access remains revoked; FastAPI validates the
Supabase session and scopes every create, read, update, completion, and delete
operation to the authenticated user.

The **Follow-ups** workspace supports customer search, scheduling, priority and
contact-method tracking, notes, upcoming/overdue/completed filters, rescheduling,
completion/reopening, and deletion. Due dates are sent as timezone-aware values
and displayed in the user's local browser timezone.
