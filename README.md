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

The first administrator must be listed in `ADMIN_EMAILS`. After signing in, an admin can open **Settings** to invite users and assign `user` or `admin` roles. Invitations are sent by Supabase Auth; users must complete the invitation flow before signing in.

Users may also choose **Create one** on the login screen. Self-registered accounts are always regular users and can sign in immediately without email confirmation.

Customer reads require an authenticated Supabase session. Customer writes, imports, invitations, and role changes require an administrator session. Keep `SUPABASE_KEY` server-side and never expose it in frontend environment variables.

For password recovery, add `FRONTEND_URL` to Supabase Authentication URL Configuration as an allowed redirect URL and set the same value in the backend deployment.
