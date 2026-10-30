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

The app's Supabase URL and publishable key are already in the ignored `.env.local` file. There is no sign-up form: approved users sign in with their existing Google account or the credentials provisioned for them. The server checks the verified email against `public.users` and gets the role/profile from that table; Google profile fields are not used to assign access. Deploy both functions after profile-claim changes; the app revalidates older sessions when the profile version changes, and staff should sign out and back in if their dashboard still shows no cases.

## Password recovery and changes

For the step-by-step custom SMTP setup, including Resend SMTP values and recovery email testing, see the developer guide [Dev/forgotPassword.md](../Dev/forgotPassword.md).

The sign-in screen accepts the account email for password recovery. Supabase sends a one-time recovery link to that address; the app displays the same confirmation whether or not an account exists, so the interface does not disclose registered accounts. A valid link opens a dedicated password-reset screen, and the recovery session is signed out after the password changes. Signed-in users can change their password from any role's dashboard or grievance thread; they must enter their current password first. First sign-in still requires creating a personal password.

In Supabase **Authentication → URL Configuration**, add the exact deployed app and local development redirect URLs to **Redirect URLs** (the app uses the current origin and path). Avoid broad wildcards unless the deployment requires them. In **Authentication → Email Templates**, ensure the password recovery template uses Supabase's recovery URL (`{{ .ConfirmationURL }}`) and an appropriate expiry. Configure a production SMTP provider and review Auth email rate limits before launch; the app's neutral confirmation is not a substitute for provider-side rate limiting. Recovery links are single-use and time-limited by Supabase. Users should request a new link if one expires.

New and changed passwords must be at least 12 characters in the app. Review **Authentication → Settings** for the project's minimum password length and leaked-password protection, and set compatible policies there as well. Keep the Supabase service-role key server-side; password recovery and updates use the signed-in Supabase Auth client and do not require a new Edge Function or database migration.

## Grievance event email notifications

For the complete Resend domain verification, secret management, worker deployment, migration, test, and troubleshooting walkthrough, see the developer guide [Dev/docs/emailNotifications.md](../Dev/docs/emailNotifications.md).

The notification worker uses a private database outbox and the `grievance-email-notifications` Supabase Edge Function. It sends one email per recorded event recipient through Resend. New submissions notify every account whose Ex Factor is `Examination Cell`, `Exam Cell`, `Admin`, or `Exam Cell Admin`; assignments notify the selected faculty; other event notifications follow the recipient snapshots already written to `grievance_event_recipients`. Messages contain the case reference and a link to ExGrev, not the grievance description, remarks, or attachments. Delivery is asynchronous and does not block grievance actions. Transient errors are retried up to five attempts; permanent failures are marked failed.

### Configure the sender and function secrets

1. In Resend, create an account, verify a domain you control, and create an API key with permission to send from that domain. Do not use a personal or unverified sender address. See [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction).
2. In the Supabase Dashboard, open **Edge Functions → Secrets** for the ExGrev project and add:
   - `RESEND_API_KEY`: the API key from Resend.
   - `EXGREV_EMAIL_FROM`: a verified sender, for example `ExGrev <notifications@your-domain.example>`.
   - `EXGREV_APP_URL`: the app origin, such as `https://your-real-app-domain/`. For local testing, use `http://localhost:5173/`.
   - `NOTIFICATION_WEBHOOK_SECRET`: a new random secret shared only with Vault in the next step.
   - `SUPABASE_SERVICE_ROLE_KEY`: the existing server-side service-role key, if it is not already configured for Edge Functions.
3. Generate a dedicated webhook secret locally in PowerShell. Do not use a password, the Supabase service-role key, or a Resend API key:

   ```powershell
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $bytes = New-Object byte[] 32
   $rng.GetBytes($bytes)
   $notificationSecret = [Convert]::ToBase64String($bytes)
   $rng.Dispose()
   $notificationSecret
   ```

   Enter that value as `NOTIFICATION_WEBHOOK_SECRET` in Edge Function Secrets. Keep the value private; you will enter the same value into Vault in the next section.

### Store the dispatcher values in Supabase Vault

In the ExGrev project, open **SQL Editor → New query**. Get the project's **publishable key** from **Project Settings → API Keys** (this is not the service-role/secret key). Run the following statements after replacing the two placeholders. Enter the exact same random webhook secret you saved as the Edge Function secret:

```sql
select vault.create_secret(
  'https://hkdonpsbywfegfvzvqik.supabase.co',
  'grievance_email_function_url'
);
select vault.create_secret(
  'sb_publishable_REPLACE_WITH_EXGREV_PUBLISHABLE_KEY',
  'grievance_email_publishable_key'
);
select vault.create_secret(
  'PASTE_THE_SAME_RANDOM_NOTIFICATION_WEBHOOK_SECRET',
  'grievance_email_webhook_secret'
);
```

Do not save or share a SQL query containing the webhook secret. The publishable key is intended for client identification; the separate random header secret authorizes the worker call. `pg_net` queues HTTP headers briefly while a request is pending, so treat direct database access and the `net` schema as privileged; do not grant queue access to browser roles. Never place the service-role key in the SQL webhook headers, frontend, or migration files.

### Deploy and apply the migration

From the `exgrev` directory, deploy the worker:

```powershell
npx supabase functions deploy grievance-email-notifications --project-ref hkdonpsbywfegfvzvqik
```

Then apply [supabase/migrations/202610310001_grievance_email_notifications.sql](supabase/migrations/202610310001_grievance_email_notifications.sql) in the Supabase SQL Editor. It enables `pg_cron`, `pg_net`, and Vault; creates the locked-down outbox and service-role-only RPCs; and schedules a worker call every minute. The worker uses `verify_jwt = false` because the database scheduler sends a dedicated `x-notification-secret`; the function rejects calls without that secret. The dispatcher reads the function URL, publishable key, and webhook secret from Vault. If Vault values are absent or mistyped, the job will not dispatch successfully.

The migration does not send emails for old thread events. Only events created after it is applied are queued. For local app testing, make sure `EXGREV_APP_URL` matches the local URL and Vite port. For production, configure the deployed HTTPS origin and a verified sender domain before enabling the migration.

### Verify and monitor

1. Submit a test grievance as a student. Every matching Examination Cell account with a valid email should receive an email after the scheduled worker runs (normally within about a minute).
2. Assign a test grievance to a faculty account and verify that the assigned account receives the assignment notification.
3. In the SQL Editor, check delivery statuses:

   ```sql
   select status, count(*)
   from public.grievance_email_outbox
   group by status
   order by status;
   ```

   To inspect a failed message without exposing its contents:

   ```sql
   select event_id, recipient_email, attempt_count, last_error, updated_at
   from public.grievance_email_outbox
   where status = 'failed'
   order by updated_at desc
   limit 25;
   ```

   This table is not readable by browser users; inspect it only in the trusted Supabase SQL Editor. Review Edge Function logs for worker errors and Resend logs for provider delivery/bounces. Failed messages are not automatically retried after the fifth attempt; resolve the provider/configuration issue before any manual retry.

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
