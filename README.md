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
ADMIN_EMAILS=admin@your-company.com
FRONTEND_URL=https://onecroredatapluse.vercel.app
```

The app requires Supabase login by default. Temporary read-only demo mode uses local sample data and must be enabled explicitly:

```env
VITE_BYPASS_LOGIN=true
```

Keep it unset or set it to `false` in every real customer-data environment. Demo mode does not access protected customer APIs.

## Scalable customer search

The customer screen searches Supabase through the authenticated FastAPI backend. It searches only normalized customer names and phone numbers, returns at most 25 records per request, and uses cursor pagination. Addresses are stored and displayed but are not searchable.

Apply the migration in `supabase/migrations` before deploying the matching backend and frontend. The browser importer is for small validation batches only; do not use it for the 10-million-row production load.

The production-scale CSV importer is documented in [`docs/BULK_CUSTOMER_IMPORT_RUNBOOK.md`](docs/BULK_CUSTOMER_IMPORT_RUNBOOK.md). It uses a direct Postgres connection, bounded `COPY` batches, SHA-256 file verification, resumable checkpoints, and explicit duplicate handling. Do not apply its migration or run a production import until the source headers and duplicate-phone rule have been confirmed.

The first administrator must be listed in `ADMIN_EMAILS`. After signing in, an admin can open **Customers** to view registered application users, invite users, and assign `user` or `admin` roles. Invitations are sent by Supabase Auth; users must complete the invitation flow before signing in.

Users may also choose **Create one** on the login screen. Self-registered accounts are always regular users and can sign in immediately without email confirmation.

Customer reads require an authenticated Supabase session. Customer writes, imports, invitations, and role changes require an administrator session. Keep `SUPABASE_KEY` server-side and never expose it in frontend environment variables.

For password recovery, add `FRONTEND_URL` to Supabase Authentication URL Configuration as an allowed redirect URL and set the same value in the backend deployment.

## Login activity reports

Apply `supabase/migrations/20260820160010_login_events_reports.sql` before deploying the matching backend. The migration creates an append-only, server-only login event table and an indexed reporting function. RLS is enabled, direct `anon` and `authenticated` access is revoked, and only the backend service role can record and summarize login activity.

Admins can open **Reports** to monitor successful logins for today, this week, this month, or all time. Metrics use the `Asia/Kolkata` timezone and include total logins, unique users, average logins per user, a time-bucket trend, and the latest 25 sign-ins. Tracking starts after the migration and backend are deployed; Supabase Auth does not provide enough history to reconstruct every earlier login.
