# ExGrev - Examination Grievance System

ExGrev is a web application for submitting, assigning, tracking, and resolving examination grievances. This repository's application is in [`exgrev/`](./exgrev/README.md); this document is the developer guide for working on it.

## What the application does

The app has three role-based workspaces:

- **Students** submit grievances with supporting documents, follow case activity, and confirm a proposed resolution.
- **Examination Cell staff** review all cases, assign or reassign them to staff, set priority and due dates, add remarks, and propose resolutions.
- **Teaching staff** review cases assigned to them and add remarks to the case timeline.

The frontend is not the authorization boundary. Supabase Auth, Row Level Security (RLS), database functions, and Storage policies enforce access to protected data.

## Technology

- React 19 and Vite 8
- React Router 7
- Bootstrap 5 / React Bootstrap
- Supabase JavaScript client, Auth, Postgres, Storage, Realtime, and Edge Functions
- Oxlint

## Repository layout

```text
exgrev/
  public/                  Static assets
  src/
    components/            Role-specific UI and shared controls
    data/                  Form categories and sample display data
    lib/supabase.js         Supabase client initialization
    pages/                 Login, password change, and role workspaces
    services/              Authentication and grievance data operations
    App.jsx                 Session restoration and role-based page selection
    main.jsx                React entry point
  supabase/
    functions/              Supabase Edge Functions
    migrations/             Ordered database migrations
  .env.example              Frontend environment variable template
  SUPABASE_SETUP.md         Detailed backend setup and login notes
  package.json              Scripts and dependencies
```

The browser application starts in `src/main.jsx`. `App.jsx` restores the Supabase session and selects a workspace based on the authenticated profile. Keep data access in `src/services/` rather than embedding Supabase queries throughout presentational components.

## Prerequisites

- Node.js compatible with Vite 8 (Node.js 20.19+ or 22.12+)
- npm
- Access to a Supabase project configured for ExGrev
- Supabase Dashboard access; the Supabase CLI is needed to deploy the Edge Function

## Local development

Run these commands from the frontend directory:

```powershell
cd exgrev
npm ci
Copy-Item .env.example .env.local
```

Set the following values in `exgrev/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Use the publishable/anon key intended for browser clients. Never put a Supabase service-role key or other server secret in a `VITE_` variable or commit it. The local environment file is ignored by Git.

Start the development server:

```powershell
npm run dev
```

Vite prints the local URL (typically `http://localhost:5173`). The frontend requires a reachable Supabase project with the schema, policies, and login function described below; setting the two browser variables alone does not provision the backend.

## Supabase setup

The application expects an existing `public.users` table. Its current database and login integration uses the exact column names `User ID`, `Full Name`, `Ex Factor`, `Branch`, `Department`, `Phone Number`, and `email`. User IDs must be present for Student accounts; email addresses must be unique, and all accounts need an email and phone number. `Ex Factor` determines the role: `Student`, `Examination Cell`, or `Teaching staff`.

For the complete setup, prerequisites, and troubleshooting details, read [`exgrev/SUPABASE_SETUP.md`](./exgrev/SUPABASE_SETUP.md). In brief:

1. Enable Email/password sign-in in Supabase Auth.
2. In the Supabase SQL Editor, apply the SQL migrations in `exgrev/supabase/migrations/` in filename order, after confirming that the existing `users` table meets the schema requirements. The migrations create the grievance tables, access policies, Storage bucket, database actions, and related behavior.
3. Configure the `SUPABASE_SERVICE_ROLE_KEY` as a **Supabase Edge Function secret only**.
4. Deploy `login-by-user-id` from `exgrev/` using the Supabase CLI:

   ```powershell
   npx supabase login
   npx supabase functions deploy login-by-user-id --project-ref <your-project-ref>
   ```

   Replace the placeholder with the Supabase project reference. Do not put access tokens or service-role keys in source control.

For a first-time account, login accepts the Student's User ID or a staff member's email. The temporary password is the phone number stored for that account; the user is required to change it after signing in.

## Application and data flow

- `src/services/userService.js` invokes the `login-by-user-id` function, establishes the Supabase session, restores the user's profile, and handles password changes and sign-out.
- `src/services/grievanceService.js` reads and writes grievances and timeline events, uploads supporting documents to the private `grievance-documents` bucket, and requests short-lived signed URLs for access.
- `src/services/portalContentService.js` reads and manages notices and guidelines stored in `public.portal_content`. RLS allows all three portal roles to read published content and restricts publishing actions to the Examination Cell.
- `grievances` stores the current case state; `grievance_events` stores the case activity timeline. Realtime subscriptions keep role workspaces refreshed.
- Database migrations and RLS policies are authoritative for data access. When changing a role's capabilities or a query's data requirements, update and review the associated database policy/function as well as the UI.

## Contributor workflow

1. Create a focused branch from the project's current base branch.
2. Install dependencies with `npm ci` from `exgrev/`.
3. Keep UI changes in the relevant page/component and shared data operations in `src/services/`.
4. For schema, policy, Storage, or database function changes, add a new, timestamp-prefixed migration; do not rewrite an already-applied migration. Test it against a non-production Supabase project and check its RLS behavior for each affected role.
5. Run the checks below and manually verify the affected role workflows against a configured Supabase project.
6. Submit a pull request describing the behavior change, migration/deployment requirements, and verification performed.

Follow the existing JavaScript/JSX patterns, keep error states visible to users, and avoid placing credentials or environment-specific configuration in source files.

## Checks and production preview

From `exgrev/`:

```powershell
npm run lint
npm run build
npm run preview
```

The current package scripts do not define an automated test command. For changes to authentication, case permissions, uploads, or resolution behavior, also verify the affected student, Examination Cell, and teaching-staff workflows in a configured development Supabase project.

## Troubleshooting

- **Missing Supabase environment variables:** ensure `.env.local` exists in `exgrev/` and contains both variables from `.env.example`; restart Vite after changing environment values.
- **Login function not deployed:** deploy `login-by-user-id` to the same Supabase project used by the frontend.
- **Email provider disabled:** enable Email/password sign-in in Supabase Auth.
- **Login setup or permission errors:** check the `users` column names and values, apply the required migrations, confirm the Edge Function secret is configured, and verify that the signed-in user's role matches `Ex Factor`.
- **Case data or document access denied:** inspect the relevant RLS or Storage policy and test as the role that needs access; do not solve authorization problems by exposing the bucket or disabling RLS.
