# ExGrev forgot-password email setup

This guide configures Supabase Auth to deliver ExGrev password-recovery emails through a custom SMTP provider. It uses Resend for the SMTP examples, but the same Supabase setup can be used with another transactional email provider.

## What this configures

On the ExGrev sign-in screen, a user enters the email address associated with their account and requests a password reset. The app calls Supabase Auth, which sends the recovery email through the configured SMTP provider. The link opens ExGrev, where the user sets a new password.

The app shows the same confirmation whether or not an account exists for the submitted email. This protects account privacy. SMTP configuration does not change application roles, passwords, or account records.

## Prerequisites

- Admin/Owner access to the ExGrev Supabase project.
- Access to DNS settings for a domain you own or are authorized to send from.
- A production HTTPS URL for the deployed app. For local testing, use the actual local origin, normally `http://localhost:5173`.
- An existing ExGrev account with a valid email address the user can access.

Never put an SMTP password, Resend API key, or Supabase service-role key in browser code, a `VITE_` variable, the repository, or a checked-in file.

## 1. Verify a sender domain with your email provider

If using Resend:

1. Sign in to [Resend](https://resend.com/) and open [Domains](https://resend.com/domains).
2. Add a domain or subdomain you control, for example `mail.example.edu`. Do not use the example domain literally.
3. Copy the DNS records Resend provides into your domain's DNS provider. Use the record type, host/name, and value exactly as shown.
4. If the domain already has an SPF record, ask the domain administrator to update that record rather than adding a second SPF record.
5. Return to Resend and wait for the domain status to show **Verified**.
6. Choose a sender address on that verified domain, such as `ExGrev <no-reply@mail.example.edu>`. Use a real monitored mailbox if users should be able to reply.

For other providers, complete their sender-domain verification and use the SMTP host and credentials they supply.

References: [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction), [Resend SMTP](https://resend.com/docs/send-with-smtp).

## 2. Create SMTP credentials

For Resend SMTP, create a separate API key dedicated to password-recovery email. Choose the most restrictive sending permission available and restrict it to the verified domain if Resend offers that option.

Resend's SMTP settings are:

| Supabase field | Resend value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` for implicit TLS, or `587` for STARTTLS |
| Username | `resend` |
| Password | The Resend API key |
| Sender email | The verified sender address, e.g. `no-reply@mail.example.edu` |
| Sender name | `ExGrev` |

Use the port and encryption mode required by the provider and supported by Supabase's SMTP form. Never use your Resend account password as the SMTP password. Store the API key in a password manager until entering it into Supabase.

For another provider, use its SMTP host, port, username, password, sender email, and sender name instead.

## 3. Configure Supabase Auth SMTP

1. Open the [ExGrev Supabase project](https://supabase.com/dashboard/project/hkdonpsbywfegfvzvqik).
2. Open **Authentication → SMTP Settings** (the exact menu label can vary slightly in the dashboard).
3. Enable custom SMTP and enter the values from the previous section.
4. Set the sender email to an address on the verified domain. Ensure it matches the sender/domain permitted by your provider.
5. Save the settings.
6. In the Auth email rate-limit settings, configure limits consistent with the provider's sending quota. Do not raise limits just to work around provider throttling.

The built-in Supabase email service is intended for testing and has restrictive limits. Configure a production SMTP provider before relying on password reset delivery for users.

## 4. Configure allowed recovery redirects

The app passes the current browser origin and pathname to Supabase as the recovery redirect. Supabase must allow those redirect URLs.

1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to the deployed app's canonical HTTPS origin.
3. Add the exact production app URL to **Redirect URLs**, for example `https://grievances.example.edu/`.
4. For local development, add the exact local URL, normally `http://localhost:5173/`.
5. If the app is deployed under a path (rather than at the domain root), allow its exact path as well.
6. Save the configuration. Avoid broad wildcards in production.

Use the actual app URL, not a Supabase dashboard URL. Local Vite normally serves HTTP, so use `http://` locally; do not use `https://localhost` unless local HTTPS is explicitly configured.

## 5. Check the recovery email template

1. In Supabase, open **Authentication → Email Templates → Reset Password** (the dashboard may label it **Password Recovery**).
2. Keep the Supabase-generated confirmation URL in the message link, using `{{ .ConfirmationURL }}`.
3. Do not replace it with an unverified, hard-coded app URL. Supabase needs to validate the recovery token and redirect it to an allowed URL.
4. Write clear text telling the recipient that this link is for resetting their ExGrev password and should not be shared.
5. Review the recovery-link expiry in **Authentication → Settings** and select a reasonable, short-lived duration for your institution's needs.
6. Save the template.

The recovery link is single-use and expires. If it has expired or already been used, the user should request another link from the sign-in page.

## 6. Test the complete flow

1. Confirm the test user exists in ExGrev and has the correct, accessible email address.
2. Open the app's sign-in page and select **Forgot password?**.
3. Submit the account email address. The app intentionally shows a neutral confirmation instead of revealing whether the address is registered.
4. Check the inbox and spam/junk folder. Confirm the message's sender is the verified address.
5. Open the link in the same browser where the app can be reached. Confirm it returns to ExGrev's password-reset screen.
6. Enter a new password meeting the app's minimum length (12 characters), submit it, and confirm the recovery session ends.
7. Sign in using the new password.
8. Request another recovery email and confirm the previous link cannot be reused.

For local testing, make sure the app is running at the same origin listed in Supabase Redirect URLs. If Vite selected a different port, add that exact origin and request a new recovery link.

## Troubleshooting

| Symptom | Checks |
|---|---|
| No email arrives | Check the Supabase Auth logs, provider activity/logs, spam folder, sender-domain verification, provider quota, and whether the account email is correct. The app's neutral confirmation is shown even when delivery is not successful. |
| SMTP authentication fails | Recheck the SMTP username and password. For Resend, username is `resend`, and password is the API key, not the Resend account password. |
| Provider rejects the sender | Confirm the sender domain is verified and the sender address complies with provider rules. |
| Link says redirect URL is not allowed | Add the exact app URL/path to **Authentication → URL Configuration → Redirect URLs**, then request a new link. |
| Link opens the wrong site | Check the submitted browser origin, Supabase Site URL, redirect allow-list, and the URL in the email template. |
| Link is expired or invalid | Request a fresh link. Recovery links are single-use and time-limited. |
| Local link fails with a TLS/protocol error | Vite normally uses HTTP. Open the app using `http://localhost:<port>/`, not HTTPS, and allow that exact URL in Supabase. |
| Resend reports a send error | Check the Resend API key permission, sending quota, verified domain, sender address, and Resend SMTP logs. Rotate the key if it may have been exposed. |

## Security checklist

- Use a verified domain and a provider key limited to sending.
- Keep SMTP credentials only in Supabase's Auth SMTP settings and a password manager; do not expose them to the frontend.
- Keep recovery redirects limited to the real production app and exact local development origins.
- Keep the neutral account-existence confirmation and use provider/Supabase rate limits.
- Use a short-lived, single-use recovery link and do not forward or share it.
- If an SMTP credential is exposed, revoke it with the provider and replace it in Supabase.
- Do not share recovery tokens or screenshots containing recovery links.

No application code changes, database migration, or Edge Function deployment are required for SMTP configuration. The password recovery flow is already implemented in ExGrev. For the app's broader Supabase setup, see [exgrev/SUPABASE_SETUP.md](../exgrev/SUPABASE_SETUP.md).
