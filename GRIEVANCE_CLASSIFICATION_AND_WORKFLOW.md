# Grievance Classification and Workflow Automation

## Project report

### Purpose

ExGrev is an examination grievance portal for students, the Examination Cell, and teaching staff. Students submit examination or result-related cases with a category, a more specific problem type, a subject, a description, and optional supporting documents. The system keeps the case, assignment, status, and activity history in Supabase so the appropriate staff can review it and the student can follow progress.

This report describes the behavior present in the project source and database migrations. It distinguishes automated system behavior from decisions made by staff.

## How grievances are classified

Classification is a two-level selection made by the student on the submission form. Choosing a category filters the available problem types. These values are defined in `src/data/tagOptions.js` and saved as `problem_category` and `problem_type` on the grievance record. The source does not classify cases by analyzing the subject or description; it does not use an AI classifier or keyword-routing rules.

| Category | Problem types offered |
| --- | --- |
| Major Exam | Absent on exam day; Report misconduct; Desktop issue; Incorrect Question; Exam date clash with another exam; Exam paper issue; Course not in time-table |
| Minor Exam | Absent on exam day; Report Misconduct; Incorrect Question; Date Clash with another exam; Discrepancy in question paper; Exam paper issue |
| Central Level Quiz | Absent on quiz day; Report Misconduct; Desktop issue; Date clash with another exam |
| Marksheet/Result Issue | Result Not Published; Incorrect Marks; Marksheet Not Available; Data Change Request; Request for duplicate Marksheet |

The wording and capitalization of some problem types differ between categories. These are currently stored as text values, so consistent naming matters for reporting and future filtering. The project has no separate taxonomy table, category-level SLA, automatic assignment by category, or validation that a selected problem type belongs to its category on the database side; the form supplies the current options.

## Workflow

1. **Student submits a case.** The form requires category, problem type, subject, and description. Subject is limited to 200 characters and description to 10,000. A signed-in student's identity is attached to the case. The database assigns an internal UUID and a grievance code. The app uploads any documents to the private `grievance-documents` bucket, then saves their metadata and object paths with the case.
2. **Submission is logged.** New records start with status `New`, medium priority, no due date, and no assigned staff member (displayed as “ExGrev Unforward”). A `submitted` event is written to the case timeline.
3. **Examination Cell reviews and routes.** Cell staff can search and filter cases, add a remark, or forward a case to an eligible teaching staff member or Examination Cell account. Forwarding sets the assignee, due date, and priority, changes status to `In Progress`, and adds a `forwarded` event; changing an existing assignee records `reassigned`. Assignment and priority are staff decisions, not automated by the selected category.
4. **Assigned teaching staff works the case.** Teaching staff can see cases assigned to their account and add remarks. A remark changes status to `In Progress` and creates a `remark_added` timeline event. Teaching staff cannot set due dates, change priority, or complete resolution in the current workflow.
5. **Examination Cell communicates and proposes resolution.** Cell staff can add remarks, which move a case to `In Progress`, or submit a resolution remark. A proposed resolution is stored and flagged as pending; the status remains `In Progress` while waiting for the student. The case cannot accept another staff action while the proposal is pending.
6. **Student confirms.** The submitting student can confirm the proposed resolution. The database then sets status to `Resolved`, clears the pending flag, records the confirmation time, and appends a `student_confirmed_resolution` event. The timeline shows submission, forwarding/reassignment, remarks, resolution proposal, and confirmation.

## What the system automates

- **Identity and access:** the signed-in role and user identity control which grievances a user can read or update. Students can create and read their own cases; the Examination Cell can review all cases; teaching staff are restricted to assigned cases. Database row-level security and role-checked database functions enforce key actions.
- **Case identifiers:** the database generates a grievance code in the form two letters and two digits. Active cases must have unique codes; resolved cases release their code for reuse. The internal UUID is the relational key.
- **Initial record and history:** database defaults initialize status and priority; the app records a submission event. Forwarding, reassignment, remarks, resolution proposal, and confirmation also produce events used by the timeline.
- **Document storage:** uploaded files are stored privately. The configured bucket permits PDF, PNG, JPEG, DOC, and DOCX files up to 10 MB each. The app generates short-lived signed links when staff views attachments.
- **Due-date guard:** the interface rejects a past due date and a database trigger enforces the same rule for inserts or changes to a due date.
- **Live refresh:** student and staff screens subscribe to Supabase Realtime changes on grievance and event records and refresh their displayed data.
- **Resolution gate:** a staff proposal does not close the case. Only the student who filed it can confirm it, and the confirmation function checks ownership and pending status before marking it resolved.

## What remains a human decision

The system does not infer a category, decide urgency, assess the merits of a grievance, select the best staff member, set a due date, or determine whether the proposed remedy is satisfactory. The student selects the classification; the Examination Cell chooses assignment, priority, and due date; staff investigate and describe their actions; the student confirms the proposed resolution.

## Status and operational notes

The database status values are `New`, `In Progress`, `Resolved`, and `Over Due`. The UI exposes these as status filters, but the examined code contains no scheduled job or database trigger that changes a case to `Over Due` when its due date passes. Until such automation is added, overdue cases should not be assumed to be updated automatically. The current dashboard metrics count `New`, `In Progress`, and `Resolved` cases.

The main data is held in `public.grievances`; event history is in `public.grievance_events`; user roles and staff identities come from `public.users`; files are in Supabase Storage. The setup guide lists the required migrations and explains the role policies. The resolution flow, teaching staff remarks, staff identity migration, grievance codes, and past-due-date prevention depend on the corresponding migrations having been applied in Supabase.

## Source basis

- Classification and form fields: `src/data/tagOptions.js`, `src/components/StudentPage/GrievanceForm.jsx`
- Submission, assignment, event, and document operations: `src/services/grievanceService.js`
- Student, Examination Cell, and teaching staff screens: `src/pages/StudentPage.jsx` (student route is assembled in the app), `src/pages/examinationCell.jsx`, `src/pages/TeachingStaffPage.jsx`
- Tables, access policies, storage, and realtime: `supabase/migrations/202609290001_grievances.sql`
- Grievance codes: `supabase/migrations/202610150001_grievance_codes.sql`
- Student-confirmed resolution: `supabase/migrations/202610150003_student_resolution_confirmation.sql`
- Teaching staff remarks: `supabase/migrations/202610160001_teaching_staff_remarks.sql`
- Due-date validation: `supabase/migrations/202610160003_prevent_past_grievance_due_dates.sql`
- Backend provisioning and workflow notes: `SUPABASE_SETUP.md`
