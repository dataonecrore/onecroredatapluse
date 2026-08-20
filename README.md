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

The first administrator must be listed in `ADMIN_EMAILS`. After signing in, an admin can open **Settings** to invite users and assign `user` or `admin` roles. Invitations are sent by Supabase Auth; users must complete the invitation flow before signing in.

Users may also choose **Create one** on the login screen. Self-registered accounts are always regular users and can sign in immediately without email confirmation.

Customer reads require an authenticated Supabase session. Customer writes, imports, invitations, and role changes require an administrator session. Keep `SUPABASE_KEY` server-side and never expose it in frontend environment variables.

For password recovery, add `FRONTEND_URL` to Supabase Authentication URL Configuration as an allowed redirect URL and set the same value in the backend deployment.
