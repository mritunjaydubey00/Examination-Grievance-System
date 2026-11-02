# GRIEVANCE PORTAL
## Web Application Project Report

**Submitted by:** [Student name]  
**Roll number:** [Roll number]  
**Under the guidance of:** [Guide name]  
**College:** Madhav Institute of Technology and Science, Gwalior  
**Academic year:** [Year]  
**Department / course:** [Department and course]  
**Project report length:** [Add required page count]

---

## CERTIFICATE

This is to certify that the project report titled **“Grievance Portal”** is submitted by **[Student name]**, Roll Number **[Roll number]**, of **[Department and course]**, **[College name]**, for the academic year **[Year]**. The project was completed under the guidance of **[Guide name]**.

The work described in this report is submitted as part of the requirements for **[degree / course requirement]**. The details in the final copy should be checked and approved by the project guide and department.

**Guide signature:** ____________________  
**Head of Department signature:** ____________________  
**Date:** ____________________  
**College seal:** ____________________

---

## DECLARATION

I/We declare that this report describes our project work on the Grievance Portal. The report is written in our own words and is based on the project requirements and the application source available for review.

Any project details that still need confirmation, including student particulars, test outcomes, and measured performance, are marked with placeholders. These should be completed with verified information before submission.

**Student name(s):** [Name(s)]  
**Signature(s):** ____________________  
**Date:** ____________________

---

## ACKNOWLEDGEMENT

We thank **[Guide name]** for guidance and feedback during the planning and development of the Grievance Portal. The guidance helped us shape a clear process for students, Faculty, and the Exam Cell to use when handling examination grievances.

We also thank **[department / college / other contributors]** for the support provided during the project. We are grateful to everyone who reviewed the portal or shared feedback. We will add specific names and contributions here before submitting the final report.

---

## TABLE OF CONTENTS

Page numbers are left for Word to generate or for us to fill after final formatting.

| Section | Page |
|---|---:|
| Project Overview | [ ] |
| 1.1 Abstract | [ ] |
| 1.2 Problem Statement | [ ] |
| 1.3 Objectives | [ ] |
| 1.4 Scope | [ ] |
| 1.5 Feasibility | [ ] |
| Literature Review and Background | [ ] |
| 2.1 Background and Survey | [ ] |
| 2.2 Existing System and Its Limitations | [ ] |
| 2.3 Comparative Study | [ ] |
| 2.4 Proposed Work | [ ] |
| Requirements Analysis and Specification | [ ] |
| 3.1 Functional Requirements | [ ] |
| 3.2 Non-Functional Requirements | [ ] |
| 3.3 Hardware and Software Prerequisites | [ ] |
| System Design and Architecture | [ ] |
| 4.1 Architecture Description | [ ] |
| 4.2 System Modules and Workflow | [ ] |
| 4.3 Database and Data Flow Design | [ ] |
| Technology and Stack Implementation | [ ] |
| 5.1 Technology Stack and Tools | [ ] |
| 5.2 Implementation Details and Modules | [ ] |
| Testing and Results | [ ] |
| 6.1 Testing Methodology and Test Cases | [ ] |
| 6.2 Results and Outputs | [ ] |
| 6.3 Performance Analysis | [ ] |
| Conclusion and Future Scope | [ ] |
| 7.1 Key Achievements | [ ] |
| 7.2 Limitations and Challenges | [ ] |
| 7.3 Future Scope | [ ] |
| 7.4 Conclusion | [ ] |
| References | [ ] |

---

## LIST OF FIGURES

| Figure | Caption | Page |
|---|---|---:|
| Figure 1 | Use case diagram for Student, Faculty, and Exam Cell | [ ] |
| Figure 2 | High-level Grievance Portal architecture | [ ] |
| Figure 3 | Grievance lifecycle and 48-hour response flow | [ ] |
| Figure 4 | Entity relationship diagram for grievance data | [ ] |
| Figure 5 | Data flow diagram for grievance submission and review | [ ] |
| Figure 6 | Student dashboard screenshot | [ ] |
| Figure 7 | Student grievance form and history screenshots | [ ] |
| Figure 8 | Faculty and Exam Cell dashboard screenshots | [ ] |
| Figure 9 | Grievance thread screenshot | [ ] |

## LIST OF TABLES

| Table | Caption | Page |
|---|---|---:|
| Table 1 | Existing and proposed system comparison | [ ] |
| Table 2 | Functional requirements by role | [ ] |
| Table 3 | Non-functional requirements | [ ] |
| Table 4 | Hardware and software prerequisites | [ ] |
| Table 5 | Main database entities and fields | [ ] |
| Table 6 | Technology stack and purpose | [ ] |
| Table 7 | Functional test cases | [ ] |
| Table 8 | Performance measurements to be recorded | [ ] |

---

# 1. PROJECT OVERVIEW

## 1.1 Abstract

The Grievance Portal, also called ExGrev in the application, is a web application for handling student grievances, especially examination-related issues. A student can submit a grievance with a category, problem type, subject, description, and supporting files. The Exam Cell reviews submissions, records remarks, and can forward a case to a Faculty member. Faculty can review grievances assigned to them and add remarks. The system keeps case updates in a shared thread that permitted users can follow.

The portal has separate workspaces for Student, Faculty, and Exam Cell users. Each role sees information relevant to its work. Students see their own grievance counts and cases. Faculty see cases assigned to them. The Exam Cell can review the overall case list. A proposed resolution gives the student 48 hours to accept it or continue the discussion with a remark. If there is no response before the deadline, a scheduled database task marks the case as auto-resolved and records the event. The current source uses React, Vite, and Supabase. Some dashboard sections for Guidelines and the Notice Board are still placeholders, so they are described as planned functions rather than completed content-management features.

## 1.2 Problem Statement

When grievances are sent through informal channels such as email, messages, or paper forms, students may not know whether the right staff member has received them. Staff can also find it difficult to see the case history, the current owner, and previous remarks in one place. This makes follow-up less clear for students and can lead to information being spread across separate conversations.

The project addresses this problem by giving students one place to submit and track a grievance. The Exam Cell can review and route a case, while Faculty can respond to cases assigned to them. A dated activity thread records events such as submission, forwarding, remarks, resolution, student response, and automatic closure. The portal does not decide the merits of a grievance; staff and students still make those decisions.

## 1.3 Objectives

The main objective is to provide a clear, role-based process for examination grievances. We aim to let students file a case with enough information for review and to let them see its status and recorded updates without viewing another student's cases.

We also aim to support staff review, assignment, comments, and resolution through separate Faculty and Exam Cell workspaces. The event thread gives the authorized participants a common record of the case. The 48-hour response window makes the final stage clear: a student can accept a proposed resolution or add a remark to continue the grievance before the deadline.

Other objectives are to restrict data access by role, support private uploads for relevant documents, show role-appropriate dashboard counts, and make account sign-in and password changes part of the portal. The Notice Board and Guidelines are included in the requested design, but their current screen controls are disabled placeholders and need implementation before they can be managed as live content.

## 1.4 Scope

The portal covers the submission and handling of examination-related grievances. The student form contains category and problem-type choices, subject and description fields, and optional supporting documents. In the current application, the subject can contain up to 200 characters and the description up to 10,000 characters. Supported document types include PDF, PNG, JPEG, DOC, and DOCX, with a 10 MB limit per file enforced for thread attachments.

The Exam Cell can view grievances, assign or reassign a case, set priority and a due date, add remarks, and propose a resolution. Faculty can view assigned cases and add remarks. A student can view their own grievances and thread and can respond to a proposed resolution during the response window. The application stores grievance records and events in Supabase and supports live refresh through database change subscriptions.

The report does not claim that the portal changes examination results, determines whether a claim is valid, or replaces formal college appeal rules. There is also no verified integration with a student information system or examination database. The live maintenance of Notices and Guidelines is outside the completed application behavior reviewed for this report, as the relevant page currently displays placeholder content and disabled add buttons.

## 1.5 Feasibility (technical, economic, operational)

**Technical feasibility.** The current codebase already uses a browser-based React interface and a Supabase backend. Supabase provides authentication, a PostgreSQL database, row-level security, private file storage, realtime database updates, and Edge Functions. These services fit the portal’s need to separate role workspaces and keep grievance data and files behind access rules. The project also has migrations for its database structure and actions. Deployment still depends on applying the migrations and configuring the Supabase project correctly.

**Economic feasibility.** The project uses commonly available development tools, including JavaScript, React, Vite, and npm. The report has no verified budget, hosting bill, or usage estimate, so it does not claim that deployment is free. Before production use, we should check the current Supabase plan limits and any costs for database capacity, file storage, email delivery, backups, and traffic. The institution should compare those expected costs with its available resources.

**Operational feasibility.** The three roles map to the existing grievance process: students submit cases, the Exam Cell coordinates them, and Faculty handle assigned cases. Separate dashboards and a single thread can make the work easier to follow. Staff will still need instructions for triage, assignment, due dates, and resolution remarks. The college must also decide who maintains account records, verifies access, manages Notices and Guidelines, and responds to technical issues.

# 2. LITERATURE REVIEW AND BACKGROUND

## 2.1 Background and Survey

The project is based on a common service workflow: a person submits a request, a responsible office reviews it, work is assigned when needed, and the requester receives updates. For this portal, the request is a grievance and the responsible office is the Exam Cell. Faculty involvement is recorded as part of the same case instead of starting a separate conversation.

Our background review focused on the technical parts used by this project. The React documentation describes React as a way to build user interfaces from components [1]. Vite documents the development server and production build used by this application [2]. Supabase documentation explains the managed database, Auth, Storage, Realtime, and Edge Function services that the application uses [3–7]. PostgreSQL documentation describes row security policies, which are important because a hidden button alone is not sufficient to protect grievance data [8].

This is a technical background review, not a measured survey of all grievance systems used by colleges. We do not have verified survey responses or institution-wide data for this report. If the department has collected feedback from students or staff, the final report can add the survey method, number of participants, questions, and summarized answers here.

## 2.2 Existing System and Its Limitations

The existing process at the college should be described using verified local information. In many manual or partly digital processes, a student may contact an office by email, message, or paper form, but this project has not supplied evidence about which method the college formally uses. We therefore do not state that every current grievance is handled in a particular way.

The project is designed to reduce problems that can arise when case details and replies are kept in separate places. Without a shared case record, the student may need to ask for updates, and staff may need to search several messages to understand what happened. It can also be harder to identify the person responsible for the next action or to confirm when a response was made.

The portal improves traceability by keeping a grievance record, an assigned user, status fields, and dated events. However, the application’s Notice Board and Guidelines views are not yet backed by editable content; the current add buttons are disabled and sample text is shown. These features should not be presented as complete until they are connected to saved data and verified by role.

## 2.3 Comparative Study

The comparison below describes the project’s intended difference from a basic email or paper process. The “existing system” column is a general comparison and must be adjusted if the college has a documented current process.

| Area | Existing manual or separate-channel process | Proposed Grievance Portal |
|---|---|---|
| Submission | A student may submit through a form, email, or office process. The exact local process should be confirmed. | A student submits a category, problem type, subject, description, and optional files in the portal. |
| Case ownership | The person responsible may need to be confirmed through follow-up. | The Exam Cell can assign or reassign the case to Faculty or another eligible staff account. |
| Status updates | Updates may be spread across separate messages. | The grievance record displays a status and related activity thread. |
| Access | Messages and paper copies depend on how they are shared and stored. | Role checks and database policies restrict access to the relevant student, assigned staff, and Exam Cell. |
| History | Older remarks may be difficult to collect in one place. | Events are listed with time, actor, role, and relevant details. |
| Resolution response | A response deadline may not be visible in the same record. | The proposed resolution has a 48-hour student response window and an automatic closure event after no response. |
| Attachments | Files may be sent separately or stored with messages. | Supporting files use private Supabase Storage buckets and access-controlled links. |
| Notices and guidelines | They may be shared using existing college channels. | The portal has planned Notice Board and Guidelines sections, but current content management is not implemented. |

## 2.4 Proposed Work

We propose a role-based portal that organizes each grievance around one record and one event thread. A student submits the issue and can return to the same record to see the current status and staff updates. The Exam Cell controls routing and coordinates the case, while Faculty respond to the work assigned to them.

The project includes application checks and backend checks. The user interface provides forms and views, while Supabase database policies and functions enforce key access and actions. This separation is important because client-side code can be changed by a browser user; access decisions must not depend only on what the interface displays.

The proposed work also includes the 48-hour response process. When the Exam Cell proposes a resolution, the portal stores an expiry time. A student can accept the resolution or continue the grievance with a remark before expiry. A scheduled database function checks expired cases and records automatic resolution. The Notice Board and Guidelines are part of the intended user experience, but their content-management workflow remains future implementation work.

# 3. REQUIREMENTS ANALYSIS AND SPECIFICATION

## 3.1 Functional Requirements (role-wise)

The portal supports three user roles. In the current source, Faculty accounts are represented by the role name “Teaching staff.” The interface also accepts common role labels such as “Faculty” and normalizes them for routing.

| Role | Functional requirements |
|---|---|
| Student | Sign in; view a dashboard with only their own grievance counts; submit a grievance; view their own grievance list; open its thread; add a response during the 48-hour window; accept a proposed resolution; view Guidelines and Notices; view and update permitted profile information; log out. |
| Faculty | Sign in; view only grievances assigned to them by the Exam Cell; open the case and its thread; add remarks and permitted supporting files; view dashboard counts, Guidelines, and Notices; manage permitted profile information; log out. |
| Exam Cell | Sign in; view the overall grievance list and dashboard counts; review student submissions; assign or reassign cases to Faculty or eligible staff; set priority and due date; add remarks; propose a resolution; view case history; manage Guidelines and Notices when that feature is implemented; log out. |

For all roles, the case thread should identify the event, timestamp, actor, and role. The current implementation includes events such as submission, forwarding, reassignment, remarks, proposed resolution, student response, accepted resolution, and automatic resolution. Access to the thread follows grievance participation rules enforced by Supabase policies and database logic.

The common interface has a header, footer, navigation, and a session-active timer. The timer displays elapsed time since the current signed-in session began; it is not an inactivity timeout. The requested panel names are represented in navigation. The Guidelines and Notice Board screens exist, but editing and stored live content should be treated as incomplete until their disabled placeholder controls are replaced.

## 3.2 Non-Functional Requirements (security, performance, usability, reliability, etc.)

**Security and privacy.** The system should require authentication and enforce role-based access at the database layer. Students must not read another student’s grievances. Faculty should only access assigned cases, while the Exam Cell can review the overall case list. Supporting documents should remain private and be delivered using temporary signed URLs. Secret keys must remain in server-side configuration and must not be put in browser environment variables.

**Performance.** Common screens should load within a practical time on the college network, and case lists should remain usable as records increase. The project contains indexes for student grievance history, staff assignment/status, and event history. No measured response times or load-test results were provided, so acceptable targets and actual timings must be added after testing.

**Usability and accessibility.** Labels should clearly explain each form field, status, and action. Students should be able to understand whether the Exam Cell is still reviewing a case or has proposed a resolution that needs a reply. The interface should support common desktop and mobile browsers, keyboard navigation, readable contrast, and clear messages when an action fails. These behaviors should be confirmed through manual testing and feedback.

**Reliability and auditability.** The portal should preserve important case events, show visible error messages when data cannot be loaded or saved, and avoid reporting success when an operation fails. The 48-hour job must be enabled in the deployed Supabase database. Database backup, restore, monitoring, and email delivery are operational requirements for a production deployment and need to be planned with the college.

**Maintainability.** Database changes should be made through ordered migrations. Data access should remain in service modules rather than being repeated inside every visual component. The current repository follows this pattern with grievance and user services, Supabase migrations, and separate role pages.

## 3.3 Hardware and Software Prerequisites

The table gives practical development and user prerequisites. Values marked “suggested” are planning guidance, not results from a hardware benchmark.

| Item | Prerequisite |
|---|---|
| Student / staff device | Computer, tablet, or smartphone with a supported modern web browser and internet access. |
| Development computer | Suggested: dual-core processor, 8 GB RAM, and enough free storage for Node.js, npm packages, and the repository. Confirm against the developer’s actual machine before submission. |
| Browser | Current version of Chrome, Edge, Firefox, or Safari. The final supported browser list should be based on testing. |
| Runtime | Node.js version compatible with Vite 8 (the project README lists Node.js 20.19+ or 22.12+), plus npm. |
| Frontend | React, React DOM, React Router, Vite, Bootstrap, and React Bootstrap as listed in `exgrev/package.json`. |
| Backend | Supabase project with PostgreSQL, Auth, Storage, Realtime, database migrations, and required Edge Functions configured. |
| Developer tools | Visual Studio Code or another JavaScript editor, Git, a terminal, and the Supabase CLI when deploying Edge Functions. |
| Network | Internet access to the deployed frontend and Supabase project. Uploads and live refresh require a working connection. |

# 4. SYSTEM DESIGN AND ARCHITECTURE

## 4.1 Architecture Description

The application uses a browser client built with React. Vite serves the frontend during development and creates the production build. React pages render the role workspaces, while shared components handle navigation, profile details, forms, dialogs, and the grievance thread.

The frontend connects to Supabase through the Supabase JavaScript client. Supabase Auth manages signed-in sessions. PostgreSQL stores the grievance records and events. Row Level Security (RLS) policies and database functions control access to records and important actions. Supabase Storage holds documents in private buckets. Realtime subscriptions refresh relevant screens when grievance data changes. Edge Functions support login and authenticated profile resolution; a separate notification function is available for email event delivery when configured.

The browser is not treated as the security boundary. A user interface can hide controls that a role should not use, but database policies and functions must still verify identity, role, and case assignment. The Supabase service-role key is for server-side use only and should not be included in the frontend.

**Suggested diagram:** Add **Figure 1: High-level Grievance Portal architecture**. Show Student, Faculty, and Exam Cell browsers connecting to the React/Vite application, then to Supabase Auth, PostgreSQL/RLS, Storage, Realtime, and Edge Functions.

## 4.2 System Modules and Workflow

The main modules are authentication and profile handling, role-based dashboards, grievance submission, staff review and assignment, grievance thread, resolution response, and document storage. Shared navigation gives each role access to its dashboard and relevant grievance views. The session timer measures time since sign-in and the shared footer identifies the portal and institution.

The grievance lifecycle begins when a student submits a new case. The database creates a grievance record with an initial status and event history. The Exam Cell reviews it and can assign it to Faculty, add a due date and priority, or keep it under its own review. Faculty members work only on cases routed to them and add remarks to the thread. When the Exam Cell proposes a resolution, the student receives a 48-hour period to accept it or add a remark and continue the grievance.

If the student accepts the resolution before expiry, the system records the acceptance and closes the case as resolved. If the student adds a remark within the window, the grievance continues for further review. If the student does not respond, a scheduled database job checks expired windows and records an auto-resolved event. After the case is closed, a student who remains dissatisfied must submit a new grievance, as required by the project workflow.

**Suggested diagram:** Add **Figure 2: Grievance lifecycle and 48-hour response flow**. Show “Submitted” → “Exam Cell review” → “Assigned to Faculty (if needed)” → “Remarks / investigation” → “Resolution proposed” → “Student accepts”, “Student adds remark”, or “No response in 48 hours” → final status.

**Suggested diagram:** Add **Figure 3: Use case diagram** with Student, Faculty, and Exam Cell actors and their permitted actions.

## 4.3 Database and Data Flow Design

The central data is stored in PostgreSQL. The `users` table is an existing account/profile table and is expected to contain the project’s account identifiers, names, roles, email, and related profile fields. The project migrations create `grievances` and `grievance_events`; later migrations add event recipients, resolution-window fields, attachment behavior, and related permissions. Files themselves are stored in Supabase Storage, not inside the grievance row.

| Entity | Important fields | Purpose and relationship |
|---|---|---|
| `users` | `User ID`, `Full Name`, `Ex Factor`, `Department`, `Branch`, `email`, `Phone Number`, `account_identifier` | Existing user and role data. Student and assigned staff identities are referenced by grievance records. |
| `grievances` | `id`, `grievance_number`, `student_user_id`, `created_at`, `subject`, `description`, `problem_category`, `problem_type`, `supporting_documents`, `status`, `due_date`, `priority`, `assigned_faculty_user_id`, `resolution_remark`, `updated_at` | Main case record. A student can have many grievances; a case can have an assigned staff account. Later migrations add response-window fields such as `resolution_pending`, `window_expires_at`, and `auto_resolved_at`. |
| `grievance_events` | `id`, `grievance_id`, `actor_user_id`, `event_type`, `details`, `created_at`, plus actor display information in later migrations | Timeline records for submission, routing, remarks, resolution, acceptance, continuation, and automatic closure. Each event belongs to one grievance. |
| `grievance_event_recipients` | Event reference and recipient snapshot fields | Stores recipients associated with events, supporting participant visibility and notifications. |
| Supabase Storage objects | Bucket, object path, file metadata | Private attachment files and thread attachments. Database metadata stores the paths and names needed to retrieve them. |
| Notification outbox (when configured) | Event and delivery state fields | Supports asynchronous email notification processing through the notification Edge Function. |

The student flow starts with a form submission. The client uploads selected files to private Storage and then inserts the grievance record. If the record insert fails, the service attempts to remove the uploaded files so unused objects are not left behind. The database creates an event for the submission. Later staff actions call database functions, which update case fields and append events. The user interface reads the record and its thread, then creates signed links when a participant needs to open a private attachment.

**Suggested diagram:** Add **Figure 4: Entity relationship diagram** showing `users` to `grievances`, `grievances` to `grievance_events`, and event recipients and Storage paths. Add **Figure 5: Data flow diagram** from grievance form through Supabase Storage and PostgreSQL to staff review, student thread, and notification handling.

# 5. TECHNOLOGY AND STACK IMPLEMENTATION

## 5.1 Technology Stack and Tools

The selected stack lets us build a single-page web application and use managed backend services for identity, data, files, and live updates. The technologies below are read from the project configuration and setup documentation.

| Technology / tool | Use in this project | Reason for use |
|---|---|---|
| HTML, CSS, JavaScript | Browser structure, styling, and application behavior | These are the standard web technologies used by the React frontend. |
| React 19 | Builds the interface from pages and reusable components | It supports separate role views and shared controls such as navigation and dialogs [1]. |
| Vite 8 | Local development server and production build | It provides the project’s frontend development and build commands [2]. |
| React Router 7 | Routing support in the frontend dependencies | It is available for managing application navigation; the current role workspaces are primarily selected from the authenticated profile. |
| Bootstrap 5 and React Bootstrap | Layout and interface components | They provide styling and reusable interface patterns used by the application. |
| Supabase JavaScript client | Frontend connection to Supabase services | It handles Auth, database queries, Storage, Realtime, and function calls [3]. |
| Supabase Auth | Sign-in, session handling, OAuth support, and password recovery | It provides authenticated sessions used by the application [4]. |
| PostgreSQL and RLS | Grievance records, event history, role policies, and database functions | Relational records and database-side access rules suit this workflow [8]. |
| Supabase Storage | Private grievance documents and thread attachments | It stores files separately from case data and supports access-controlled signed URLs [5]. |
| Supabase Realtime | Refreshes lists when grievance or event data changes | It helps signed-in users see updates without manually reloading the page [6]. |
| Supabase Edge Functions | Login/profile operations and optional email notification worker | Server-side functions can run operations that should not use secret credentials in the browser [7]. |
| Supabase Cron (`pg_cron`) | Runs the expired-resolution-window job | The migration schedules a database task that checks and records cases that reached the 48-hour deadline. |
| Oxlint | JavaScript and JSX lint checks | It is the configured lint command in the frontend package. |
| Git and npm | Source control and dependency management | They support versioned development and repeatable package installation. |

## 5.2 Implementation Details and Modules

**Authentication and profiles.** The login service invokes the `login-by-user-id` Edge Function. Student users can use their User ID, while staff can use email according to the setup guide. The application also supports Google sign-in when the provider is configured. The role is read from the approved account profile, and the app routes the signed-in user to the matching workspace. First-time accounts can be required to change their temporary password. Password recovery and profile handling use Supabase Auth and the user service.

**Student workspace.** The student dashboard calculates total, pending, and resolved counts from the signed-in student’s grievance list. The service query filters grievances by that student’s account. The submission form collects category, problem type, subject, description, and optional files. The grievance history opens a case thread, where the student can see recorded events and use the resolution response actions when they are available.

**Faculty workspace.** The Faculty workspace displays grievances assigned to the signed-in staff identity. Faculty can open a case and add remarks to its thread. The assignment filter and database policies work together so Faculty do not use the dashboard to review unrelated student cases. Staff role labels in the implementation use “Teaching staff,” while this report uses “Faculty” for readability.

**Exam Cell workspace.** The Exam Cell view can load the overall grievance list. Staff can search or filter cases, assign or reassign a case, set priority and a due date, add remarks, and propose a resolution. The database validates important actions through Supabase functions, including resolution behavior and date checks.

**Grievance thread and attachments.** Each thread displays events in time order with event label, timestamp, actor name, and role where available. Supporting documents and thread attachments are stored in private buckets. The application requests short-lived signed URLs to display them. The event model includes assignment, remarks, proposed resolution, student response, acceptance, and automatic resolution.

**Dashboard, Guidelines, Notice Board, and shared layout.** The dashboard shows role-specific grievance counts and includes areas for Guidelines and Notice Board content. In the current application, these content areas display sample or placeholder text and the add controls are disabled. They should be connected to an Exam Cell-managed data source before the report can claim that users can publish or update real content. The shared layout also includes the portal header, footer, profile controls, and session elapsed-time display.

# 6. TESTING AND RESULTS

## 6.1 Testing Methodology and Test Cases

Testing should cover the role workflows and the backend access rules, not only whether pages render. For each role, we should test both permitted actions and denied actions using separate test accounts. The 48-hour feature should be tested with controlled test data or a development database so that the deadline can be exercised without waiting on real cases.

The repository package defines `lint` and `build` commands but does not define an automated test command. The actual result column below is intentionally left for execution evidence. “Not run” is used where this report has not measured the behavior. Before submission, record the browser, environment, test account role, date, and any relevant logs.

| Test case ID | Description | Input | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| TC-01 | Sign in with a valid Student account | Valid Student credentials | Student workspace opens and the profile role is Student | [Record after test] | Not run |
| TC-02 | Reject invalid sign-in | Incorrect password | Sign-in fails and a clear error is shown | [Record after test] | Not run |
| TC-03 | Submit a complete grievance | Valid category, problem type, subject, description | New grievance is saved and appears in the student history with a submission event | [Record after test] | Not run |
| TC-04 | Reject a submission missing required fields | Missing category, subject, or description | The form does not submit and identifies required input | [Record after test] | Not run |
| TC-05 | Verify student data isolation | Student A tries to load Student B’s grievance | Student A cannot read Student B’s grievance or thread | [Record after test] | Not run |
| TC-06 | Verify Faculty assignment scope | Faculty account opens assigned and unassigned cases | Assigned cases are available; unrelated cases are denied or absent | [Record after test] | Not run |
| TC-07 | Forward or reassign a grievance | Exam Cell chooses a valid staff member and permitted date | Assignee and relevant case fields update; forwarding/reassignment event is added | [Record after test] | Not run |
| TC-08 | Add a staff remark | Assigned Faculty or Exam Cell submits a remark | Remark is saved to the thread with actor and time | [Record after test] | Not run |
| TC-09 | Respond within the 48-hour window | Student accepts or adds a remark before expiry | Acceptance closes as accepted, or a remark continues the case; the action is recorded | [Record after test] | Not run |
| TC-10 | Auto-resolve after the response deadline | Pending resolution past `window_expires_at`, with scheduled task enabled | Database task marks the case auto-resolved and records an event | [Record after test] | Not run |
| TC-11 | Upload and retrieve an allowed attachment | PDF or image within configured size | File uploads privately and an authorized participant can open a signed link | [Record after test] | Not run |
| TC-12 | Verify role-specific dashboard counts | Sign in separately as Student, Faculty, and Exam Cell | Counts reflect only the data available to each role | [Record after test] | Not run |
| TC-13 | Check Notice Board and Guidelines permissions | Open the sections as Student, Faculty, and Exam Cell | All roles can view published content; only Exam Cell can edit it once editing is implemented | [Record after test] | Not run |
| TC-14 | Run frontend lint and production build | `npm run lint` and `npm run build` in `exgrev/` | Both commands complete without errors | [Record command output] | Not run |

## 6.2 Results and Outputs

The **login screen** accepts an account identifier and password and provides password recovery. Depending on Supabase configuration, Google sign-in can also be available. The **password screen** supports the required first password change, signed-in password changes, and recovery completion.

The **Student dashboard** shows total, pending, and resolved counts for that student’s cases. The **Add New** screen accepts grievance information and optional files. The **Your Grievances** screen lists cases and opens each case thread. The **Faculty dashboard** shows counts for assigned work and the Faculty grievance views separate active and resolved cases. The **Exam Cell dashboard** shows an overall view and opens case management actions.

The **grievance thread** shows the case activity in time order, including submission, routing, remarks, proposed resolution, student acceptance or continuation, and automatic resolution where those events have occurred. The **Profile** view supports account details and password actions that are available in the implementation. The **Guidelines** and **Notice Board** screens currently show placeholder/sample content; the Exam Cell edit controls are disabled, so screenshots should identify them as placeholders rather than finished content-management screens.

Add current screenshots after testing. Each screenshot should be taken from a test or approved demo account and should not expose real student names, email addresses, grievance descriptions, or uploaded documents without permission.

## 6.3 Performance Analysis

No measured performance figures were supplied for this report. We should not claim a particular response time, capacity, uptime, or number of supported users until those values are measured. A useful test should record the date, deployment environment, network, browser, number of test records, and how each measurement was collected.

The analysis should measure initial dashboard load, grievance list load, thread load, attachment access, and time for a database change to appear through Realtime. A separate load test can use synthetic accounts and records to check behavior with increasing concurrent requests. Any such test should use a development environment and should not use real student information.

| Measurement | Actual value |
|---|---|
| Dashboard load time (test conditions and sample count) | [Add measured result] |
| Grievance list load time | [Add measured result] |
| Thread load time | [Add measured result] |
| Realtime update delay | [Add measured result] |
| Attachment upload time and file size | [Add measured result] |
| Concurrent-user test and outcome | [Add measured result] |
| Test date, environment, browser, and network | [Add details] |

# 7. CONCLUSION AND FUTURE SCOPE

## 7.1 Key Achievements

The project brings the student, Faculty, and Exam Cell workflows into one web application. Students can submit and follow their own cases, the Exam Cell can manage the overall case flow, and Faculty can work on cases assigned to them. Separate role workspaces make the case list and dashboard relevant to each user.

The portal also records grievance events in a thread and supports private attachments. Its database policies and functions provide a server-side basis for role checks. The 48-hour response period is represented in the database with an expiry time and scheduled auto-resolution, so the final action can be recorded rather than relying only on an informal reminder.

The project has a working technical foundation with React, Vite, and Supabase. However, the report does not treat the disabled Notice Board and Guidelines controls as completed features. Those areas, as well as end-to-end testing evidence and performance measurements, remain to be completed or verified.

## 7.2 Limitations and Challenges

The current Notice Board and Guidelines pages do not yet provide working content management. Placeholder messages and disabled add buttons are present. A complete version needs database tables or another approved content store, Exam Cell-only edit rules, validation, and tests confirming that Student and Faculty accounts can only view the published content.

The portal also depends on correct backend setup. Required migrations, Auth settings, Edge Functions, Storage policies, and environment values must be configured for a deployment. If the resolution scheduler is not installed or running, the 48-hour automatic action may not occur as expected. The deployment team must verify the scheduled job and its event records in the target Supabase project.

The project does not automatically decide grievance category, priority, assignment, or the correctness of a proposed remedy. Those decisions remain with students and staff. We also do not have verified measurements for performance, user satisfaction, uptime, or a full security assessment. These should be collected before wider institutional use.

## 7.3 Future Scope

The first improvement should be completing the Notice Board and Guidelines modules. The Exam Cell should be able to add, edit, publish, and archive content, while Student and Faculty accounts should have read-only access. The changes should be saved in the database and protected by RLS policies rather than relying on disabled buttons or client-side role checks.

The portal could later add clearer notifications for assignment and approaching 48-hour deadlines, provided email settings and delivery monitoring are configured. Other useful work includes searchable reports for the Exam Cell, export of anonymized case data, improved accessibility checks, and integration with approved college identity or examination systems. These changes should follow privacy and access reviews.

Before a larger rollout, we should run role-based security tests, test the scheduled resolution job, measure performance using synthetic data, review backup and recovery steps, and collect feedback from actual users. Any new status, escalation rule, or appeal path should be agreed with the college before implementation.

## 7.4 Conclusion

The Grievance Portal provides a structured way to submit, assign, discuss, and track examination grievances. Its role-based views, grievance thread, private attachments, and 48-hour student response flow are designed to make the progress of a case easier to understand for both students and staff.

The project is a useful foundation, but it should be described honestly as a system with some incomplete areas. In particular, Notice Board and Guidelines content management needs to be built, and test and performance results must be collected rather than assumed. With these items completed and the Supabase configuration verified, the portal can be evaluated for a broader college deployment.

---

# REFERENCES

1. React Documentation, “Quick Start.” https://react.dev/learn  
2. Vite Documentation, “Getting Started.” https://vite.dev/guide/  
3. Supabase Documentation, “JavaScript Client Library.” https://supabase.com/docs/reference/javascript/introduction  
4. Supabase Documentation, “Auth.” https://supabase.com/docs/guides/auth  
5. Supabase Documentation, “Storage.” https://supabase.com/docs/guides/storage  
6. Supabase Documentation, “Realtime.” https://supabase.com/docs/guides/realtime  
7. Supabase Documentation, “Edge Functions.” https://supabase.com/docs/guides/functions  
8. PostgreSQL Documentation, “Row Security Policies.” https://www.postgresql.org/docs/current/ddl-rowsecurity.html  
9. ExGrev project repository, `README.md`, `exgrev/README.md`, and `exgrev/SUPABASE_SETUP.md`. Project implementation and setup details, accessed [add date].  
10. ExGrev project repository, database migrations in `exgrev/supabase/migrations/`, including the grievance schema, thread, and resolution acceptance window migrations. Project implementation details, accessed [add date].

---

## DIAGRAM AND SCREENSHOT NOTES

Before final submission, insert the diagrams listed in the List of Figures. Use the actual project tables and roles when drawing them. Avoid adding database entities or features that are not in the application or clearly marked as planned.

For screenshots, use a test account or redact personal information. Suggested captures are the login screen, each role dashboard, student submission form, grievance history, staff assignment dialog, grievance thread with a response window, and the placeholder Notice Board and Guidelines screens. Label placeholder screens accurately.

## COMPLETION CHECKLIST

- Replace all bracketed student, guide, course, year, page-count, and signature fields.
- Confirm the college’s current grievance process before finalizing Section 2.2.
- Run all applicable tests and replace every “Not run” or result placeholder with observed evidence.
- Verify that the 48-hour scheduled job runs in the deployed Supabase project.
- Complete and test Exam Cell-only editing for Guidelines and the Notice Board, or retain the limitation stated in this report.
- Add approved diagrams and redacted screenshots, then update page numbers and the Table of Contents in Word.
