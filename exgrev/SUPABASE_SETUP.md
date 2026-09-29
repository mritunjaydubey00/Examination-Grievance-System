# Supabase login setup

The login form uses `User ID` and password. The Edge Function finds the user's email using `User ID`, then signs in through Supabase's **Email + Password** Auth provider. On first login, it creates that Auth account with the phone number as a temporary password. The user is then asked to set a new password. No Phone Auth provider or SMS setup is needed.

The `email` and `Phone Number` fields must be present for each account. Emails must be unique, and phone numbers should be stored as text. The `Ex Factor` column must identify each account as `Student`, `Examination Cell`, or `Teaching staff`; login uses this value to route the user to the correct portal.

## One-time setup

1. In Supabase, make sure **Authentication → Sign In / Providers → Email** is enabled. This is normally enabled by default.
2. In **Project Settings → Edge Functions → Secrets**, add `SUPABASE_SERVICE_ROLE_KEY` with your project's secret/service-role key. Keep this key in Supabase only.
3. In PowerShell, go to the project folder, sign in to the Supabase CLI, then deploy the current login function:

   ```powershell
   cd "D:\GitHub\Examination Grievance System\exgrev"
   npx supabase login
   npx supabase functions deploy login-by-user-id --project-ref hkdonpsbywfegfvzvqik
   ```

   The first `npx` command may ask to install the Supabase CLI; type `y` to continue. `npx supabase login` asks for a Supabase access token. Create one in the Supabase dashboard under **Account → Access Tokens** and paste it into the terminal prompt. Do not share that token.

The app's Supabase URL and publishable key are already in the ignored `.env.local` file. The development table policies can remain as they are for now.

First login: use the User ID and the exact phone number stored in the row as the password. Later logins use the new password. If login reports that the function is not deployed, complete step 3; if it reports that Email Auth is disabled, enable Email in step 1.
