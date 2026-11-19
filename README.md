# ExGrev - Examination Grievance System

ExGrev is a React and Supabase portal for examination-grievance submission and resolution. It supports Student, Examination Cell, and Teaching Staff roles.

## Features

### Student
- Sign in with User ID or approved email; change password.
- Submit a grievance with title, required description, category, sub-category, optional "Any Other" specification, and supporting documents.
- View grievance history and category/sub-category.
- Open the grievance thread, add remarks/attachments, accept a resolution, or continue it within 48 hours.
- Read notices and guidelines.

### Examination Cell
- Review, search, filter, and paginate grievances.
- Filter by department, admission year/study year, status, category, sub-category, date range, and keyword.
- Assign or reassign cases, set priority/due date, add remarks, and propose resolutions.
- Select multiple similar grievances, create a group, choose a master, and atomically forward the master's common solution.
- Add, edit, hide/show, and delete notices and guidelines, with optional PDF/image attachments.

### Teaching Staff
- Review assigned grievances and add remarks.
- Read notice board and guidelines.

## Technology

- React 19, React Router 7, Vite 8
- Bootstrap 5 / React Bootstrap
- Supabase Auth, Postgres, RLS, Storage, Realtime, Edge Functions
- Oxlint and Node test runner

## Repository layout

```text
exgrev/
  src/
    components/          Shared and role-specific UI
    config/enrollment.js Enrollment/year/branch rules
    data/                Category and exam data
    lib/                 Supabase and shared helpers
    pages/               Role dashboards and grievance thread
    services/            Supabase data operations
  supabase/
    functions/           login and profile Edge Functions
    migrations/          Timestamped SQL migrations
  .env.example
  SUPABASE_SETUP.md
  package.json
  vite.config.js
```

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm
- Supabase project and Dashboard access
- Supabase CLI for Edge Functions

## Environment variables

Create `exgrev/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-browser-publishable-key
```

Use only the browser-safe publishable/anon key. Never place the service-role key in `VITE_*`, source control, or SQL sent to the browser.

## Run locally

```powershell
cd exgrev
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Supabase setup

1. Enable Email/password in **Authentication → Providers**.
2. Add local and deployed redirect URLs in **Authentication → URL Configuration**.
3. Apply `exgrev/supabase/migrations/` in filename order through the Supabase SQL Editor.
4. At minimum, run the existing migrations followed by `202611190001_predeploy_fixes.sql`.
5. Deploy `login-by-user-id` and `resolve-authenticated-profile`:

```powershell
npx supabase login
npx supabase functions deploy login-by-user-id --project-ref <project-ref>
npx supabase functions deploy resolve-authenticated-profile --project-ref <project-ref>
```

6. Create or verify `grievance-documents`, `grievance-thread-attachments`, `notices`, and `guidelines` Storage buckets. The migration creates/verifies their private-bucket configuration and policies.
7. Set the Edge Function secrets and the existing exam notification secrets as described in `exgrev/SUPABASE_SETUP.md`.

## Auth redirect URLs

Use the current app origin. Add these Supabase Redirect URLs:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- Your deployed HTTPS application URL

Set the production app URL as the Supabase Site URL. Google sign-in, when enabled, requires:

- Google JavaScript origin: local origin and deployed HTTPS origin
- Google authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`

## Enrollment year logic

The shared helper in `exgrev/src/config/enrollment.js` implements:

- Admission year: characters at 1-based positions 5–6. `BTCB25O1116` becomes 2025.
- Study year: academic sessions start in July (`ACADEMIC_YEAR_CONFIG.academicSessionStartsInMonth = 7`).
- The program length is configured as four years. A later admission becomes `Passed out`.
- Invalid or short values return `Unknown`.
- The assumed branch code extraction is characters 3–4. Known mappings:
  - `CB`: Computer Science and Business Systems
  - `CS`: Computer Science
  - `IT`: Information Technology
  - `EC`: Electronics and Communication
  - `EE`: Electrical
  - `ME`: Mechanical
  - `CE`: Civil
  - `BT`: Biotechnology

Stored `users.Department` and `users.Branch` values are preferred. `admission_year` is generated and indexed when applying the predeploy migration.

## Checks

```powershell
cd exgrev
npm run test
npm run lint
npm run build
npm run preview
```

Test the student, teaching-staff, and Examination Cell flows against a non-production Supabase project before deployment.

## Branch

The implementation branch is `version3`. Keep database migrations and frontend environment values synchronized across the deployed build.

## Known limitations

- Notice/guideline attachment URLs are created for private buckets and should be renewed if viewing after the signed URL expiry.
- Google sign-in may remain disabled until the provider is enabled and its OAuth credentials are configured in Supabase.
- Legacy grievances are backfilled to `Grievance / General`; administrators should review unusual legacy data.
- Deployment hosting must receive the build-time `VITE_*` variables and be rebuilt after changing them.
