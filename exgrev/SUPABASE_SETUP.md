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

## Grievance flow setup

The student and Examination Cell pages now use `public.grievances` and `public.grievance_events`; uploaded files use a private `grievance-documents` Storage bucket. Apply [supabase/migrations/202609290001_grievances.sql](supabase/migrations/202609290001_grievances.sql) in **Supabase Dashboard → SQL Editor → New query → Run**. Before running it, confirm `public.users` has the exact quoted columns `User ID`, `Full Name`, `Ex Factor`, `Branch`, and `Department`, and that `User ID` is a primary or unique key. Those are the names already used by the login function. If your table uses different names, edit the references in the migration to match.

The migration installs row-level security so students can create and read only their own cases and history; Examination Cell staff can read/update all cases and search users whose Ex Factor is `Teaching staff` or `Examination Cell`; teaching staff can read and resolve cases assigned to their own user ID. It also creates the private storage bucket and enables realtime notifications. The signed-in JWT role and `user_id` claims are set by `login-by-user-id`; log out and sign in again after deploying any change to that function so the token has current claims.

The case ID is the database-generated `grievance_number`, while `id` is the internal UUID. Creation time is one `timestamptz` value, displayed in the browser's local date/time. Supporting document metadata and Storage object paths are in `supporting_documents`. Staff set the due date and priority while forwarding. The assignment stores both `assigned_faculty_user_id` (foreign key to `users`) and the display name; it begins as `ExGrev Unforward`.

### History thread on the student dashboard

`grievance_events` is the append-only activity feed associated with each grievance. The app records submission, forwarding/reassignment, and resolution with remarks; the student dashboard orders and displays those events as a timeline. Realtime subscriptions refresh student and staff views when records change. To add another milestone later, insert a new event row with a clear `event_type` and a small JSON `details` object (for example, `{ "status": "In Progress" }`). For production, move the paired grievance update and event insert into one Postgres RPC/trigger transaction, and add a faculty work queue that only returns cases assigned to that faculty member.

First login: use the User ID and the exact phone number stored in the row as the password. Later logins use the new password. If login reports that the function is not deployed, complete step 3; if it reports that Email Auth is disabled, enable Email in step 1.
