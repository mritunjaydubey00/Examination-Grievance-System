# Supabase login setup

The login form accepts either `User ID` or the account's email address with the password. The Edge Function looks up the account by either value, then signs in through Supabase's **Email + Password** Auth provider. On first login, it creates that Auth account with the phone number as a temporary password. The user is then asked to set a new password. No Phone Auth provider or SMS setup is needed.

The Dev user-entry form requires an Ex Factor first. Student accounts keep their required User ID; other roles store `NULL` in `User ID` and use their normalized email as the account identity. For an existing project, apply [supabase/migrations/202610150002_staff_email_identity.sql](supabase/migrations/202610150002_staff_email_identity.sql) after the grievance tables migration. It changes the user identity key and updates staff assignment/event references, including existing staff accounts. The migration requires non-empty, unique emails and a User ID for every Student; it stops with an error if existing records need cleanup or additional tables reference User ID.

The `email` and `Phone Number` fields must be present for each account. Emails must be unique, and phone numbers should be stored as text. The `Ex Factor` column must identify each account as `Student`, `Examination Cell`, or `Teaching staff`; login uses this value to route the user to the correct portal.

## One-time setup

1. In Supabase, make sure **Authentication → Sign In / Providers → Email** is enabled. This is normally enabled by default.
2. To enable Google login, create an OAuth client in Google Cloud Console and add the Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI. In **Authentication → Sign In / Providers → Google**, enable the provider and enter the Google client ID and secret. Add the deployed app URL and local development URL (for example `http://localhost:5173`) to Supabase's allowed redirect URLs.
3. Apply [supabase/migrations/202610210002_approved_auth_users.sql](supabase/migrations/202610210002_approved_auth_users.sql) in **SQL Editor** after the existing login/grievance migrations. It restricts new Supabase Auth users to email addresses and valid roles already present in `public.users`, and switches database authorization claims to server-managed `app_metadata`. It never creates application users. Supabase may create an Auth identity for an approved user on their first Google sign-in; people not already listed in `public.users` are rejected before an Auth user is created. Existing sessions should sign out and back in after applying this migration.
4. In **Project Settings → Edge Functions → Secrets**, add `SUPABASE_SERVICE_ROLE_KEY` with your project's secret/service-role key. Keep this key in Supabase only.
5. In PowerShell, go to the project folder, sign in to the Supabase CLI, then deploy both login functions:

   ```powershell
   cd "D:\GitHub\Examination Grievance System\exgrev"
   npx supabase login
   npx supabase functions deploy login-by-user-id --project-ref hkdonpsbywfegfvzvqik
   npx supabase functions deploy resolve-authenticated-profile --project-ref hkdonpsbywfegfvzvqik
   ```

   The first `npx` command may ask to install the Supabase CLI; type `y` to continue. `npx supabase login` asks for a Supabase access token. Create one in the Supabase dashboard under **Account → Access Tokens** and paste it into the terminal prompt. Do not share that token.

The app's Supabase URL and publishable key are already in the ignored `.env.local` file. There is no sign-up form: approved users sign in with their existing Google account or the credentials provisioned for them. The server checks the verified email against `public.users` and gets the role/profile from that table; Google profile fields are not used to assign access.

### Google sign-in troubleshooting

If sign-in returns `Unsupported provider: provider is not enabled`, Supabase Auth has not enabled Google for the project receiving the request. In this app, confirm the Supabase dashboard project ref is `hkdonpsbywfegfvzvqik`, then open **Authentication → Sign In / Providers → Google**, enable Google, save the provider settings, and confirm the Google client ID and secret are present. The `VITE_SUPABASE_URL` configured for this app points to `hkdonpsbywfegfvzvqik.supabase.co`. If you changed `.env.local`, restart the Vite development server before retrying.

## Grievance flow setup

The student and Examination Cell pages now use `public.grievances` and `public.grievance_events`; uploaded files use a private `grievance-documents` Storage bucket. Apply [supabase/migrations/202609290001_grievances.sql](supabase/migrations/202609290001_grievances.sql) in **Supabase Dashboard → SQL Editor → New query → Run**. Before running it, confirm `public.users` has the exact quoted columns `User ID`, `Full Name`, `Ex Factor`, `Branch`, and `Department`, and that `User ID` is a primary or unique key. Those are the names already used by the login function. If your table uses different names, edit the references in the migration to match.

The migration installs row-level security so students can create and read only their own cases and history; Examination Cell staff can read/update all cases and search users whose Ex Factor identifies `Teaching staff` or `Examination Cell`; teaching staff can read and update cases assigned to their account identity (student User ID or normalized staff email). The grievance-thread migration further narrows teaching-staff reads to assigned cases. It also creates the private storage bucket and enables realtime notifications. The signed-in JWT role and `user_id` claims are set by `login-by-user-id`; deploy the updated function and log out and sign in again after applying the email identity migration so the token has current claims.

Apply [supabase/migrations/202610160002_case_insensitive_staff_search.sql](supabase/migrations/202610160002_case_insensitive_staff_search.sql) after the grievance migration to let Examination Cell user lookups match role values case-insensitively, including `Teaching Staff`. The forward dialog now queries Supabase as the search text changes rather than only filtering a list loaded when the page opened.

Apply [supabase/migrations/202610160003_prevent_past_grievance_due_dates.sql](supabase/migrations/202610160003_prevent_past_grievance_due_dates.sql) to enforce that newly set or changed grievance due dates are not earlier than the current date. The Examination Cell uses the browser calendar's minimum-date setting and validates the date again before saving.

The case ID is the database-generated `grievance_number`, while `id` is the internal UUID. Creation time is one `timestamptz` value, displayed in the browser's local date/time. Supporting document metadata and Storage object paths are in `supporting_documents`. Staff set the due date and priority while forwarding. The assignment stores both `assigned_faculty_user_id` (foreign key to `users`) and the display name; it begins as `ExGrev Unforward`.

Apply [supabase/migrations/202610150003_student_resolution_confirmation.sql](supabase/migrations/202610150003_student_resolution_confirmation.sql) after the grievance tables migration. It enables Examination Cell remarks that move a case to `In Progress`, plus a two-step resolution: Examination Cell proposes the resolution, then the student confirms it before the status becomes `Resolved`. A proposal remains pending until the student confirms.

Teaching staff can review assigned cases and add a remark, which moves the case to `In Progress` and records the update in the timeline. Apply [supabase/migrations/202610160001_teaching_staff_remarks.sql](supabase/migrations/202610160001_teaching_staff_remarks.sql) after the staff email identity and student resolution migrations to enable this role-checked action. Teaching staff cannot change due dates or resolve cases directly.

Apply [supabase/migrations/202610200001_grievance_thread.sql](supabase/migrations/202610200001_grievance_thread.sql) after the other migrations to add the dedicated grievance thread. It stores sender-name snapshots and recipient snapshots for new events, restricts teaching-staff reads to assigned cases, and moves assignment, remarks, resolution events, and submission history into database functions or a trigger so each case update and its event are committed together. Students, assigned teaching staff, and Examination Cell users can post remarks; remarks are addressed to the other case participants. Existing event rows are preserved, and their recipients remain unspecified if they were not recorded previously.

Apply [supabase/migrations/202610200002_allow_participant_remarks.sql](supabase/migrations/202610200002_allow_participant_remarks.sql) after the grievance-thread migration. It routes legacy remark actions through the participant-authorized remark function while keeping resolution proposals restricted to the Examination Cell.

Apply [supabase/migrations/202610210001_staff_identity_claim_fallback.sql](supabase/migrations/202610210001_staff_identity_claim_fallback.sql) after the grievance-thread migration. It lets staff row-level security policies use the normalized Auth email when a staff JWT is missing its `user_id` metadata claim. After applying it and deploying the latest `login-by-user-id` function, have staff sign out and sign in again to refresh their session claims.

If student grievance submissions still fail with a row-level security error, apply [supabase/migrations/202610280001_student_identity_rls.sql](supabase/migrations/202610280001_student_identity_rls.sql) after the other grievance migrations. It resolves a student's canonical User ID from the authenticated email and the matching `Student` row in `public.users`; the insert policy, submission event trigger, and document upload policy then verify against that record rather than relying on potentially stale JWT profile claims. Confirm each student has a unique, correct email in `public.users` matching the signed-in Auth email, then sign out and back in.

Apply [supabase/migrations/202610280002_grievance_thread_attachments.sql](supabase/migrations/202610280002_grievance_thread_attachments.sql) after the grievance-thread migration and any later grievance migrations to enable optional file attachments on thread remarks. It creates a separate private bucket, limits uploads to the case participants, and records attachment metadata with each remark. Files are limited to PDF, PNG, JPG, DOC, or DOCX and 10 MB each.

`grievance_events` is the append-only activity feed associated with each grievance. The `grievance_event_recipients` table stores the recipients for new events. Use the existing role-checked RPCs and `record_grievance_event` helper for future event types rather than inserting event rows directly. The thread subscribes to case and event changes so participants see updates as they happen.

First login: use the User ID for Students or email for other roles, and the exact phone number stored in the row as the password. Later logins use the new password. If login reports that the function is not deployed, complete step 3; if it reports that Email Auth is disabled, enable Email in step 1.
