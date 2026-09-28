# Connect ExGrev to Supabase

This setup now has three Supabase steps. You do **not** need to create Auth accounts one by one or run a bulk provisioning step. On a user's first login, the app checks their User ID, verifies that the submitted temporary password matches the phone number in `public.users`, and creates their Supabase Auth account. They then choose a new password.

## 1. Protect the Users table

In Supabase, open **SQL Editor**, paste this, and run it:

```sql
drop policy if exists "ExGrev Dev Panel - Read" on public.users;
drop policy if exists "ExGrev Dev Panel - Insert" on public.users;
drop policy if exists "Allow user inserts" on public.users;
drop policy if exists "Allow user lookup" on public.users;
revoke all on table public.users from anon, authenticated;
```

This removes the current public read/insert access to users' phone numbers and profile information. The Edge Function will perform the limited lookup securely.

## 2. Turn on phone sign-in

In Supabase, open **Authentication → Sign In / Providers** and enable **Phone**. The app uses phone plus password; it does not send SMS codes.

Make sure `Phone Number` is unique and stored as text in international format, such as `+91…`. The table and columns must be named `public.users`, `User ID`, `Phone Number`, `Full Name`, `Department`, and `Branch`.

## 3. Deploy one Edge Function

The Supabase CLI is needed to deploy the function. Sign in to it once, then run this from the project folder:

```powershell
supabase functions deploy login-by-user-id --project-ref hkdonpsbywfegfvzvqik
```

Before deployment, open **Project Settings → Edge Functions → Secrets** and add:

- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: your project's secret/service-role key

Keep this key in Supabase only. Do not add it to the app or send it to me. The function is the only part of the app that uses it.

## Try the app

The project already has its Supabase URL and publishable key in the ignored `.env.local` file. Start the app. A user's first sign-in is:

- **User ID:** their value from the `User ID` column
- **Password:** their value from `Phone Number`

They will then be asked to create a password of at least 8 characters. Later sign-ins use that password.
