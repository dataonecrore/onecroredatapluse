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
```

The first administrator must be listed in `ADMIN_EMAILS`. After signing in, an admin can open **Settings** to invite users and assign `user` or `admin` roles. Invitations are sent by Supabase Auth; users must complete the invitation flow before signing in.

Customer reads require an authenticated Supabase session. Customer writes, imports, invitations, and role changes require an administrator session. Keep `SUPABASE_KEY` server-side and never expose it in frontend environment variables.
