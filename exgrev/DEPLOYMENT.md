# Deploying ExGrev for free

This guide deploys the ExGrev frontend to **Cloudflare Pages** or **Vercel**
and keeps Supabase as its backend. These platforms serve the built React
application; they do not host or replace the Supabase database, authentication,
file storage, or Edge Functions.

**For a strict free deployment, Cloudflare Pages is the recommended option.**
It provides a `*.pages.dev` address, so a custom domain is optional. Vercel
also offers a free Hobby plan, but its terms restrict Hobby to personal,
non-commercial use; verify that your use qualifies before deploying an
institutional system there. Railway can host the frontend, but its Free plan
provides only $1 of monthly usage credit, so it is not a dependable choice for
an always-on site at no cost. Free-plan limits and availability can change;
check the current [Cloudflare Pages plans](https://pages.cloudflare.com/),
[Vercel Hobby plan](https://vercel.com/docs/plans/hobby),
[Railway plans](https://docs.railway.com/pricing/plans), and
[Supabase pricing](https://supabase.com/pricing). Supabase free projects may be
paused after inactivity and have resource limits. Plan for those limits before
using the system for real institutional records.

## 1. Prepare the repository

1. Make sure the application builds locally. In PowerShell:

   ```powershell
   cd "D:\GitHub\Examination Grievance System\exgrev"
   npm ci
   npm run lint
   npm run build
   ```

2. Push the reviewed code to a GitHub repository. Keep the repository private
   if it contains institutional implementation details. Do not commit
   `.env.local`, access tokens, service-role keys, or other secrets.
3. Before publishing, review all uncommitted changes and migrations. Do not
   apply an unreviewed migration to the production database.

## 2. Prepare Supabase

The app requires a configured Supabase project. If you already have one, verify
it is the intended project and take a backup before changing its schema. If
starting from scratch, follow the repository's
[Supabase setup guide](./SUPABASE_SETUP.md) to prepare the existing
`public.users` data, apply the required SQL migrations, configure Auth, and
deploy the Edge Functions. Do not rerun migrations that have already been
applied.

You will need the project's **Project URL** and **publishable key** from
Supabase's project API settings. They correspond to the variables in
[`.env.example`](./.env.example):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The publishable key is intended for browser use. The `VITE_` prefix means its
value is included in the public frontend build; **never** put a service-role
key, database password, OAuth client secret, Resend key, or other server
secret in either variable or in a frontend hosting environment variable.
Keep server secrets in Supabase Edge Function Secrets.

## 3. Create the Cloudflare Pages site

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/) and
   open **Workers & Pages**.
2. Select **Create application** → **Pages** → **Connect to Git**. Authorize
   Cloudflare to access the GitHub repository and select the ExGrev repository.
3. Configure the build:

   | Setting | Value |
   | --- | --- |
   | Production branch | The branch you use for production, usually `main` |
   | Root directory | `exgrev` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

   These paths are relative to the repository/root directory as shown in the
   Cloudflare form. The Vite build output is `exgrev/dist` in the repository.
   Cloudflare's current build image includes Node.js 22, which meets Vite 8's
   minimum requirement (Node.js 20.19+ or 22.12+). If you pin a version in
   Cloudflare's build environment, use a supported Node 22 release.
4. Before the first production build, add these environment variables in the
   Pages project's **Settings** → **Environment variables** → **Production**:

   | Variable | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | The Supabase Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | The Supabase publishable key |

   Add values without quotes or `VITE_`-prefixed secrets. If you enable
   preview builds, set their variables deliberately as well. Prefer a separate
   staging Supabase project for previews; do not let an experimental preview
   modify production grievances.
5. Save and deploy. Cloudflare builds and publishes the selected production
   branch. The resulting `https://<your-pages-project>.pages.dev` address is
   your initial public URL. Use Cloudflare's build log if a deployment fails.

The project is a single-page application. Cloudflare Pages serves `index.html`
for application routes by default when the output does not contain a top-level
`404.html`; do not add a static 404 page unless routing has been configured to
preserve that fallback.

## Alternative: deploy with Vercel

Use Vercel only if the project qualifies under the current Hobby plan's
personal, non-commercial use restrictions, or choose a paid plan that permits
your use.

1. In Vercel, select **Add New** → **Project**, connect the GitHub repository,
   and select the ExGrev project.
2. Set the **Root Directory** to `exgrev`. Select Vite if Vercel does not
   detect it automatically. Set the build command to `npm run build` and the
   output directory to `dist`.
3. In the project's **Settings** → **Environment Variables**, add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production. Add
   Preview values intentionally; use a separate staging Supabase project for
   preview deployments rather than exposing production data to test branches.
4. Deploy and copy the production URL (typically
   `https://<project-name>.vercel.app`). The included
   [`vercel.json`](./vercel.json) rewrites application routes to `index.html`
   so refreshing a client-side route serves the SPA.
5. Add this production URL to Supabase Auth's allowed redirect URLs as
   described below. If you add a custom domain, configure that domain in Vercel
   and add its exact URL to Supabase as well.

Vercel Git integration creates preview deployments for branches and
automatically deploys production-branch changes. Check the build output and
verify login, password recovery, and app refreshes on the deployed URL.

## Railway note

Railway supports GitHub deployments and can deploy this repository, but it runs
an application service rather than acting as a static-site CDN. You must
configure a production web server to serve Vite's `dist` directory and listen
on Railway's assigned port. The free plan's $1 monthly usage credit may not
cover a continuously running service. Check current usage and pricing before
choosing Railway if the site must remain online without charges.

## 4. Configure Supabase for the deployed URL

1. Copy the production `https://<your-pages-project>.pages.dev` URL.
2. In Supabase, open **Authentication** → **URL Configuration**:
   - Set **Site URL** to the production URL.
   - Add the exact production URL to **Redirect URLs**.
   - Keep `http://localhost:5173/**` (or the exact local redirect you use) for
     local development.
   - Add any custom domain after it is configured. Avoid broad wildcards.
3. If Google sign-in is enabled, keep the Google OAuth client's authorized
   redirect URI pointed at Supabase's callback URL:
   `https://<project-ref>.supabase.co/auth/v1/callback`. The app's production
   URL is a Supabase allowed redirect URL, not the Google callback URI.
4. If grievance email notifications are enabled, update the Supabase Edge
   Function secret `EXGREV_APP_URL` to the production app URL. Follow the
   email-notification section in the
   [Supabase setup guide](./SUPABASE_SETUP.md) for all required secrets,
   migration, and scheduled worker configuration.
5. Redeploy the Pages site after changing frontend environment variables.
   Vite embeds them at build time; changing a dashboard value alone does not
   change an already-published build.

## 5. Verify the live deployment

Open the Pages URL in a private/incognito browser window and verify:

- The page loads over HTTPS and a refresh does not produce a hosting 404.
- An approved student can sign in, change the temporary password, submit a
  grievance, and attach a permitted document.
- Examination Cell and teaching staff see only the cases and actions allowed
  for their roles; verify assignment, comments/thread updates, and resolution
  behavior with appropriate test accounts.
- Password recovery and Google sign-in work if enabled.
- No browser console or network errors expose configuration or secrets.
- Supabase **Auth**, **Edge Function**, **Database**, and **Storage** logs show
  no failed requests or unexpected access.

Use test accounts and non-sensitive test data for the first verification.
Frontend hosting does not make the application safe for public data by itself:
review the database's RLS and Storage policies, account provisioning, privacy
requirements, and backup/recovery arrangements before accepting real student
records.

## 6. Routine updates

Use this release path for future changes:

1. Create a feature branch; do not develop directly on the production branch.
2. Make the change and run `npm ci`, `npm run lint`, and `npm run build` from
   `exgrev/`.
3. If the change needs a database update, add a new, timestamp-prefixed SQL
   file under `supabase/migrations/`. Never rewrite an already-applied
   migration. Test the new migration against a non-production project and
   review its RLS/Storage effects. Back up production data before applying a
   production migration.
4. If an Edge Function changed, deploy that function separately from
   `exgrev/`, targeting the intended Supabase project:

   ```powershell
   npx supabase functions deploy <function-name> --project-ref <project-ref>
   ```

   Use the deployment steps in `SUPABASE_SETUP.md`; keep CLI access tokens and
   function secrets out of Git and the frontend build.
5. Apply only the new, reviewed SQL migration to the intended Supabase
   project, using the repository's documented migration process. Confirm it
   succeeded before deploying frontend code that depends on it. If the
   project's migration history has not been set up for Supabase CLI, do not
   run `supabase db push` blindly; first reconcile the remote migration
   history.
6. Push the feature branch and inspect its Cloudflare preview deployment.
   Preview deployments use the preview environment variables configured in
   Cloudflare. Do not use production data for preview testing.
7. Merge the reviewed change into the production branch. Cloudflare
   automatically builds and deploys it. Check the build log and repeat the
   live verification above for the changed workflow.

Cloudflare's Git integration also lets you roll the frontend back to a
previous successful deployment from the Pages dashboard. A frontend rollback
does **not** reverse a database migration or an Edge Function deployment.
Database changes should be designed to remain compatible with the previous
frontend version; use a new corrective migration rather than trying to undo
production data changes by hand.

## Deploying the existing `workers.dev` Worker with Wrangler

If you created a Worker project (its URL ends in `workers.dev`) instead of a
Cloudflare Pages project, this repository includes `wrangler.jsonc` and a
`npm run deploy` script for that deployment type.

1. In the Cloudflare dashboard, open the existing Worker
   `examination-grievance-system`, then **Settings → Build**. Set the root
   directory to `exgrev`, the build command to `npm run build`, and the deploy
   command to `npx wrangler deploy`.
2. Under **Build variables and secrets**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`. These are build-time values consumed by
   Vite; the static-assets-only Worker does not need runtime bindings for them.
   Save the settings and retry the build.
3. For a local deployment, open PowerShell in `exgrev` and run:

   ```powershell
   npm ci
   npx wrangler login
   npm run deploy
   ```

   Wrangler opens a browser to authorize your Cloudflare account. Sign in
   directly at Cloudflare; never paste your Cloudflare password or API token
   into chat or source files. The local build reads the ignored `.env.local`
   file. If you have not created it, copy `.env.example` to `.env.local` and
   enter the two Vite variables before deploying.
4. Confirm the deployment in the Cloudflare dashboard and open the
   `workers.dev` URL. Refresh the page and a client-side route to verify SPA
   fallback. After future changes, run `npm run deploy` again or push to the
   connected branch to use Cloudflare's configured Git build.

Wrangler uses the Worker name in `wrangler.jsonc`; keep it aligned with the
existing Worker to update the same deployment instead of creating another one.

## Official references

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages SPA routing](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Cloudflare Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare Workers SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Railway Free plan](https://docs.railway.com/pricing/plans)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
