# Supabase login setup

The login form accepts either `User ID` or the account's email address with the password. The Edge Function looks up the account by either value, then signs in through Supabase's **Email + Password** Auth provider. On first login, it creates that Auth account with the phone number as a temporary password. The user is then asked to set a new password. No Phone Auth provider or SMS setup is needed.

The Dev user-entry form requires an Ex Factor first. Student accounts keep their required User ID; other roles store `NULL` in `User ID` and use their normalized email as the account identity. For an existing project, apply [supabase/migrations/202610150002_staff_email_identity.sql](supabase/migrations/202610150002_staff_email_identity.sql) after the grievance tables migration. It changes the user identity key and updates staff assignment/event references, including existing staff accounts. The migration requires non-empty, unique emails and a User ID for every Student; it stops with an error if existing records need cleanup or additional tables reference User ID.

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

The migration installs row-level security so students can create and read only their own cases and history; Examination Cell staff can read/update all cases and search users whose Ex Factor identifies `Teaching staff` or `Examination Cell`; teaching staff can read and resolve cases assigned to their account identity (student User ID or normalized staff email). It also creates the private storage bucket and enables realtime notifications. The signed-in JWT role and `user_id` claims are set by `login-by-user-id`; deploy the updated function and log out and sign in again after applying the email identity migration so the token has current claims.

Apply [supabase/migrations/202610160002_case_insensitive_staff_search.sql](supabase/migrations/202610160002_case_insensitive_staff_search.sql) after the grievance migration to let Examination Cell user lookups match role values case-insensitively, including `Teaching Staff`. The forward dialog now queries Supabase as the search text changes rather than only filtering a list loaded when the page opened.

The case ID is the database-generated `grievance_number`, while `id` is the internal UUID. Creation time is one `timestamptz` value, displayed in the browser's local date/time. Supporting document metadata and Storage object paths are in `supporting_documents`. Staff set the due date and priority while forwarding. The assignment stores both `assigned_faculty_user_id` (foreign key to `users`) and the display name; it begins as `ExGrev Unforward`.

Apply [supabase/migrations/202610150003_student_resolution_confirmation.sql](supabase/migrations/202610150003_student_resolution_confirmation.sql) after the grievance tables migration. It enables Examination Cell remarks that move a case to `In Progress`, plus a two-step resolution: Examination Cell proposes the resolution, then the student confirms it before the status becomes `Resolved`. A proposal remains pending until the student confirms.

Teaching staff can review assigned cases and add a remark, which moves the case to `In Progress` and records the update in the timeline. Apply [supabase/migrations/202610160001_teaching_staff_remarks.sql](supabase/migrations/202610160001_teaching_staff_remarks.sql) after the staff email identity and student resolution migrations to enable this role-checked action. Teaching staff cannot change due dates or resolve cases directly.

### History thread on the student dashboard

`grievance_events` is the append-only activity feed associated with each grievance. The app records submission, forwarding/reassignment, and resolution with remarks; the student dashboard orders and displays those events as a timeline. Realtime subscriptions refresh student and staff views when records change. To add another milestone later, insert a new event row with a clear `event_type` and a small JSON `details` object (for example, `{ "status": "In Progress" }`). For production, move the paired grievance update and event insert into one Postgres RPC/trigger transaction, and add a faculty work queue that only returns cases assigned to that faculty member.

First login: use the User ID for Students or email for other roles, and the exact phone number stored in the row as the password. Later logins use the new password. If login reports that the function is not deployed, complete step 3; if it reports that Email Auth is disabled, enable Email in step 1.
