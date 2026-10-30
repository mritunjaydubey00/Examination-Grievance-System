# ExGrev grievance email notifications

This guide configures event-driven email notifications for the ExGrev Supabase project (`hkdonpsbywfegfvzvqik`). It covers the email provider, Supabase secrets and Vault, the database migration, deployment, testing, and troubleshooting.

## What the system sends

Grievance actions create activity events and recipient snapshots in the database. A database trigger queues one private outbox item per event recipient. A scheduled Supabase Edge Function sends those items through Resend.

- New grievance submissions notify every account whose `Ex Factor` normalizes to `Examination Cell`, `Exam Cell`, `Admin`, or `Exam Cell Admin`, provided that account has an email.
- Forwarding or reassigning a case notifies the selected staff member.
- Remarks and resolution events notify the other recipients recorded for that event.
- Emails include an event summary, case reference, actor display name, and a link to ExGrev. They do not include grievance descriptions, remarks, or attachments.
- Delivery is asynchronous, so an email-provider outage does not block grievance actions. Transient errors are retried up to five times; permanent failures are marked `failed`.
- Only events created after the migration is applied are queued. Existing events are not sent retroactively.

## Prerequisites

Before starting, have:

1. Access to the Resend account and DNS management for a domain you own or are authorized to use. Ask your institution's IT team if needed.
2. Owner/Admin access to the ExGrev Supabase project.
3. The app's production HTTPS origin. For local-only testing, use the actual Vite URL, normally `http://localhost:5173/`.
4. The Supabase CLI installed through `npx` and authenticated. A Supabase publishable key is needed for the Vault dispatcher header. Do not use a secret/service-role key for this.

Do not put Resend keys, webhook secrets, or service-role keys in browser code, Git, screenshots, chat, or a checked-in `.env` file.

## Part 1: Verify a sending domain in Resend

Resend requires a domain you own or are authorized to use. A personal Gmail/Yahoo address cannot be used as the production sender. Resend recommends a dedicated subdomain, such as `notifications.example.edu`, to separate transactional-email reputation from the main domain.

1. Sign in to [Resend](https://resend.com/).
2. Open **Domains** at [resend.com/domains](https://resend.com/domains).
3. Select **Add Domain** and enter your actual domain/subdomain, for example `notifications.example.edu`. Do not enter the example domain literally.
4. Choose a region and settings as appropriate. For grievance notifications, leave open/click tracking off unless there is a specific need; links and tracking pixels are unnecessary for these minimal notices.
5. Resend displays DNS records for that domain (often DKIM and SPF). Keep this page open.
6. Sign in to the DNS provider for that domain and add the records exactly as Resend displays them:
   - Use the record type, host/name, value, and TTL Resend specifies.
   - Do not copy DNS values from another domain or another Resend account.
   - Do not delete unrelated records.
   - If the domain already has an SPF record, ask the domain administrator to merge the needed SPF authorization into the existing record. Do not publish multiple SPF records.
7. Return to Resend and wait for the domain to show **Verified**. DNS propagation can take time. If verification remains pending, compare the DNS host and value with the Resend screen and contact the DNS administrator.
8. Pick a sender address on that verified domain, such as `notifications@notifications.example.edu`. Resend does not require a separate mailbox to send from an address on a verified domain, but replies to it need a working mailbox if replies are expected.

Official guide: [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction).

## Part 2: Create a restricted Resend API key

1. Open [Resend API keys](https://resend.com/api-keys).
2. Create a key named `ExGrev grievance notifications`.
3. Choose the most restrictive sending permission available and restrict it to the verified domain if the dashboard offers that option.
4. Copy the key once and store it temporarily in a password manager. Resend does not show the key value again after creation.
5. Do not paste the key into the repository, Vite `.env.local`, SQL migration, or a support chat.

If the key is exposed, revoke it in Resend and create a replacement.

Official guide: [Resend API key management](https://resend.com/docs/dashboard/api-keys/introduction).

## Part 3: Generate a separate worker webhook secret

The database scheduler calls an Edge Function with a dedicated random header secret. This must be different from the Resend API key, the Supabase publishable key, and the Supabase service-role key.

In PowerShell, run:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$notificationSecret = [Convert]::ToBase64String($bytes)
$rng.Dispose()
$notificationSecret
```

Keep the printed value private. Use exactly the same value in the Edge Function secret and Supabase Vault below. Do not commit it or put it in a migration.

## Part 4: Add Edge Function secrets in Supabase

1. Open the [ExGrev Supabase project](https://supabase.com/dashboard/project/hkdonpsbywfegfvzvqik).
2. Open **Edge Functions → Secrets** (some dashboard versions label this **Functions → Secrets**).
3. Add each secret below and save:

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | The restricted API key copied from Resend. |
| `EXGREV_EMAIL_FROM` | A sender at the verified domain, for example `ExGrev <notifications@notifications.example.edu>`. Use your real domain. |
| `EXGREV_APP_URL` | The app origin users should open, for example `https://grievances.example.edu/`. For local testing, use the exact Vite URL such as `http://localhost:5173/`. |
| `NOTIFICATION_WEBHOOK_SECRET` | The random value generated in Part 3. |
| `SUPABASE_SERVICE_ROLE_KEY` | The project's server-side service-role key only if the function runtime does not already provide it. Never add it to frontend configuration. |

`SUPABASE_URL` is provided by the Supabase Edge Function runtime. Do not create a `VITE_` variable for any secret above. `EXGREV_APP_URL` is reduced to its origin by the worker, so do not include a route, query string, or recovery token.

## Part 5: Store dispatcher values in Supabase Vault

The scheduled Postgres dispatcher reads three values from Vault: the project URL, the publishable key, and the same webhook secret used in Part 4.

1. In Supabase, open **Integrations → Vault** (the menu may appear as **Database → Vault**).
2. Add the following three secrets. Use the exact name in the first column:

| Vault secret name | Value |
|---|---|
| `grievance_email_function_url` | `https://hkdonpsbywfegfvzvqik.supabase.co` |
| `grievance_email_publishable_key` | The ExGrev **publishable** key from **Project Settings → API Keys**. Legacy projects may label this the `anon` key. |
| `grievance_email_webhook_secret` | The exact same random value saved as `NOTIFICATION_WEBHOOK_SECRET` in Part 4. |

3. Save each secret in Vault. Verify that the names match exactly; do not reveal or copy the decrypted values into chat.

If Vault is unavailable in the dashboard, an administrator can create the same named secrets with `vault.create_secret()` in SQL Editor. Replace the placeholders locally and run the statements without saving/sharing the query:

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

Use the real key prefix/value shown in the dashboard; the `sb_publishable_...` text above is only a placeholder. Never put the service-role key in Vault for the dispatcher, in an HTTP header, or in this SQL. The function itself uses the server-side service-role key provided to its runtime.

`pg_net` temporarily queues outbound HTTP headers while requests are waiting. Keep database and `net` schema access privileged; do not grant browser roles access to its request queue.

## Part 6: Deploy the notification worker

Open PowerShell and run:

```powershell
Set-Location 'D:\GitHub\Examination Grievance System\exgrev'
npx supabase functions deploy grievance-email-notifications --project-ref hkdonpsbywfegfvzvqik
```

Expected output includes `Deployed Functions.` Confirm in **Edge Functions → Functions** that `grievance-email-notifications` is **ACTIVE**. This function intentionally has JWT verification disabled in `supabase/config.toml` because it is called by the database scheduler; the separate `x-notification-secret` check in the function is mandatory. Do not remove that check or expose the secret.

## Part 7: Apply the database migration

The migration creates the private outbox and service-role-only worker RPCs, connects event recipients to the outbox, and schedules dispatch every minute.

1. Open Supabase **SQL Editor → New query** for the ExGrev project.
2. Open the repository file [202610310001_grievance_email_notifications.sql](../../exgrev/supabase/migrations/202610310001_grievance_email_notifications.sql).
3. Copy the complete migration into the SQL Editor and run it once.
4. Confirm the query succeeds. If it reports missing extension privileges, do not remove the extension statements; ask a project owner to enable `pg_cron`, `pg_net`, and Vault for the project, then retry.
5. The schedule can be inspected with:

   ```sql
   select jobname, schedule, active
   from cron.job
   where jobname = 'grievance-email-notifications';
   ```

   Expect one active job with schedule `* * * * *`.

The migration is transactional. It replaces the student-submission event trigger so it records all the specified Examination Cell role aliases. If migration execution fails, stop and resolve the SQL error before testing; do not assume partially created objects are active.

## Part 8: Test safely

Use a test grievance and approved test recipient addresses before relying on notifications for real cases.

1. In Supabase, verify every intended Examination Cell user has a non-empty, correct `email` in `public.users` and a supported `Ex Factor`.
2. Submit a test grievance as a student.
3. Wait about one minute for the scheduled worker. Confirm each matching Examination Cell account with a valid email receives one email.
4. Assign or reassign a test case to a teaching staff account with a valid email. Confirm the selected person is notified.
5. Verify the email contains only the event summary, case reference, actor display name, and app link—not case text or attachments.
6. Check Resend's email logs for provider acceptance, delivery, bounce, or rejection.
7. Check Supabase **Edge Functions → Logs** for worker errors.
8. In the trusted Supabase SQL Editor, check outbox counts:

   ```sql
   select status, count(*)
   from public.grievance_email_outbox
   group by status
   order by status;
   ```

9. To inspect failed deliveries, query only from the trusted SQL Editor:

   ```sql
   select event_id, recipient_email, attempt_count, last_error, updated_at
   from public.grievance_email_outbox
   where status = 'failed'
   order by updated_at desc
   limit 25;
   ```

The outbox is intentionally inaccessible to browser users. Do not expose it through a dashboard API or grant authenticated/anon roles access.

## Troubleshooting

| Symptom | Checks |
|---|---|
| No outbox rows after an event | Confirm the migration succeeded; confirm the event has recipient rows; verify recipient `account_identifier` maps to a `public.users` row with a non-empty email. New submissions use normalized Examination Cell/Admin role aliases. |
| Outbox remains `pending` | Check `cron.job` for one active schedule. Check Vault secret names and ensure the URL, publishable key, and webhook secret are present. Review `pg_net` request errors and Edge Function logs. |
| Worker returns unauthorized | Ensure Vault's `grievance_email_webhook_secret` exactly matches Edge Function `NOTIFICATION_WEBHOOK_SECRET`. Do not include surrounding whitespace. |
| Worker reports missing configuration | Check all required Edge Function secrets: `RESEND_API_KEY`, `EXGREV_EMAIL_FROM`, `EXGREV_APP_URL`, `NOTIFICATION_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` where runtime injection does not provide it. |
| Resend rejects the sender | Confirm the sender domain is verified, and `EXGREV_EMAIL_FROM` uses an address on that domain. Check the Resend API key is active and restricted to the correct domain. |
| Outbox becomes `failed` | Review `last_error`, Edge Function logs, and Resend logs. Transient failures retry automatically up to five attempts; permanent provider rejection does not. Fix the provider/configuration issue before any manual retry. |
| Recipient does not receive mail | Confirm their account email is valid, check spam/quarantine, and inspect Resend delivery/bounce logs. A provider "accepted" result is not proof the user's mailbox received it. |

Do not manually resend or reset outbox records without understanding provider idempotency and the previous delivery result; doing so can create duplicate mail.

## Security checklist

- [ ] Resend domain is controlled by the institution and DNS records were copied from Resend.
- [ ] API key is restricted to sending and the verified domain where possible.
- [ ] Resend API key and webhook secret exist only in Supabase secrets/Vault and approved secret storage.
- [ ] `NOTIFICATION_WEBHOOK_SECRET` and `grievance_email_webhook_secret` match exactly.
- [ ] No service-role key is in the frontend, Git, Vault dispatch header, or email.
- [ ] The worker checks the webhook secret and sends one message per recipient.
- [ ] Outbox table/RPCs are unavailable to `anon` and `authenticated` users.
- [ ] Notifications contain no grievance text, remarks, or attachments.
- [ ] Production `EXGREV_APP_URL` uses HTTPS and points to the real app.

## Related project files

- [Supabase setup overview](../../exgrev/SUPABASE_SETUP.md)
- [Notification migration](../../exgrev/supabase/migrations/202610310001_grievance_email_notifications.sql)
- [Notification Edge Function](../../exgrev/supabase/functions/grievance-email-notifications/index.ts)
- [Supabase Function config](../../exgrev/supabase/config.toml)

