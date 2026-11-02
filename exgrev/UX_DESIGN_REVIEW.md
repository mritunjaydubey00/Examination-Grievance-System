# ExGrev Website UX and Visual Design Review

**Review date:** 3 November 2026
**Scope:** User-facing experience, visual hierarchy, navigation, responsive
behavior, accessibility, content clarity, and interaction feedback.  
**Method:** Source review of the React screens and their CSS, plus a check of
the public production route. This is a design/UX review, not a security,
database-policy, or formal accessibility-conformance audit.

## Executive summary

ExGrev has a recognizable visual language and a coherent role-based purpose:
students submit and follow cases, Examination Cell staff administer them, and
teaching staff work on assigned cases. The restrained teal palette, clear
status labels, and dedicated grievance thread are good foundations.

The most important design opportunities are to make failure states impossible
to confuse with successful empty states, simplify the staff experience on
phones, make navigation location and active state clearer, and complete
accessibility semantics for controls and dialogs. Student grievance cards
should provide enough identifying information to distinguish cases while
keeping the event history in the dedicated thread. The current implementation
does this with grievance ID, subject, category/type, status, and an **Open
thread** action; detailed events and attachments are not rendered in the list.

## Scope and verification limits

- The public production page was observable at its sign-in screen. Authenticated
  screens require an approved test account and were not visually exercised.
- Student, Examination Cell, teaching-staff, profile, and thread behavior below
  is based on the source structure and CSS, not a live interaction test with
  real account data.
- Mobile behavior was assessed from responsive rules in the source; it was not
  tested on a device or with a browser viewport matrix.
- Contrast ratios, screen-reader announcements, keyboard-only flows, and
  actual tap-target dimensions have not been formally measured. Findings here
  identify what should be verified, not a claim of WCAG certification.
- This review does not assess authorization, RLS, data protection, or
  vulnerability risk.

## Experience map

| Area | Main user goal | Current experience |
| --- | --- | --- |
| Sign in and recovery | Access an approved account or recover access | User ID/email and password, password recovery/reset, forced password change where required; Google sign-in is displayed as unavailable. |
| Student dashboard | Understand case workload and reach a task | Dashboard metrics can take students to filtered grievance lists; shared navigation also offers Add New, Your Grievances, Profile, Guidelines, and Notice Board. |
| Submit a grievance | Describe a problem and provide supporting documents | Categorized form with problem selection, description, and optional uploads. |
| Student grievance list | Identify a case and open its details | Compact case cards show case identifier, subject, category/type, current status, and Open thread. |
| Grievance thread | Read history, respond, and follow resolution | Case summary, status, resolution window where relevant, chronological events, attachments, and reply/acceptance actions. |
| Examination Cell | Find, prioritize, assign, and resolve cases | Dashboard metrics and a searchable/filterable case table with case actions and thread access. |
| Teaching staff | Review assigned cases and add updates | Assigned-case dashboard/list with case detail and remark actions. |
| Profile and shared navigation | Maintain account settings and move between work areas | Shared profile controls for phone and password; role-based sidebar; Guidelines and Notice Board are currently placeholders. |

Implementation references: [StudentPage.jsx](./src/pages/StudentPage.jsx),
[GrievanceForm.jsx](./src/components/StudentPage/GrievanceForm.jsx),
[StudentGrievance.jsx](./src/components/StudentPage/StudentGrievance.jsx),
[GrievanceThreadPage.jsx](./src/pages/GrievanceThreadPage.jsx),
[examinationCell.jsx](./src/pages/examinationCell.jsx),
[TeachingStaffPage.jsx](./src/pages/TeachingStaffPage.jsx),
[PortalNavigation.jsx](./src/components/PortalNavigation.jsx),
[UserProfileSection.jsx](./src/components/UserProfileSection.jsx), and
[LogIn.jsx](./src/pages/LogIn.jsx).

## Visual design assessment

### Strengths to preserve

1. **Consistent identity.** Teal, white, and pale-green surfaces, restrained
   borders, and soft shadows provide a consistent institutional feel across
   authentication, dashboards, cards, and thread screens.
2. **Useful content grouping.** Panels, card boundaries, and section headings
   distinguish major tasks without decorative imagery competing with case
   content.
3. **Status is written, not color-only.** Status labels accompany color
   treatment. This is a good foundation for users who cannot distinguish
   color alone.
4. **Authentication has a clear focal point.** The sign-in form is distinct
   from its supporting introduction; labels, autocomplete hints, and
   loading/error/success feedback are present in the form implementation.
5. **Thread is the appropriate home for detailed history.** A student’s
   routine list remains scannable while event history and attachments stay
   available in the case context.
6. **Responsive intent exists.** Shared navigation and profile layouts have
   narrow-screen rules, and the login introduction yields space to the form on
   smaller/portrait displays.

### Design-system refinements

- **Typography:** Establish a small, consistent scale for page title, section
  title, card title, metadata, and helper text. Avoid shrinking essential
  information to fit dense staff tables.
- **Spacing:** Use a repeatable spacing scale for panel padding, card gaps,
  form groups, and mobile gutters. Keep each page's primary action visually
  distinct from secondary actions.
- **Status treatment:** Keep status text visible, use consistent badge
  padding/radius across all roles, and ensure the longest status labels wrap
  without colliding with adjacent controls.
- **Interaction states:** Apply a consistent focus-visible outline, hover
  feedback, disabled treatment, and loading state to buttons, links, sidebar
  items, and custom controls.
- **Responsive containment:** Check long subject names, grievance references,
  email addresses, and error messages for wrapping rather than horizontal
  overflow.

## Role-by-role design review

### Authentication and account access

**What works:** The form has visible labels and provides both sign-in and
recovery flows. Busy and feedback states are represented in the component.

**Improve:** The Google button is currently unavailable. Verify that the
disabled state is obvious and does not look like a broken primary option; if
Google sign-in is not enabled for the deployment, consider hiding it or
explaining why it is unavailable. Test password recovery from the production
domain, including the return path after opening the recovery email.

### Student dashboard and grievance list

**What works:** Dashboard metrics provide useful shortcuts into total, pending,
and resolved cases. Compact cards make it faster to scan many grievances.

**Current card content:** Grievance code, subject, category/type, status, and
an **Open thread** action. The case thread, not the list, is where event
history and attachments belong.

**Improve:** Preserve that information hierarchy on phones: case identity
first, status next, thread action easy to tap. Test long subjects and the
longest response-window status label. When a metric filters the list, show
which filter is active and provide a clear way to return to all grievances.

### Grievance submission

**What works:** A structured category/problem flow gives submissions useful
context; documents are optional, so upload is not the only path to submit.

**Improve:** Tell students up front which file formats and size limits are
accepted. Summarize selected filenames and provide a way to remove a file
before submission. Make required fields and validation errors easy to locate,
and retain entered text if submission fails.

### Grievance thread

**What works:** The separate thread supports chronological updates, case
context, attachments, remarks, and the student response window. This is a
better place for detailed history than an expandable wall of events in every
list card.

**Improve:** Keep the case identifier and status visible while reviewing a
long thread; visually distinguish event type, actor, time, and message. Make
the response deadline and its consequence explicit, and ensure the Accept
resolution action is visible to students during the response window without
being confused with the remark/continue action. Verify that opening and
closing the reply dialog returns keyboard focus appropriately.

### Examination Cell

**What works:** Metrics, search, filters, identifiers, and case actions support
the administrative workflow. The table exposes the data needed to triage and
assign work.

**Improve:** The current wide table has a substantial minimum width and may
require horizontal scrolling on a phone. Prefer a compact mobile case-card
view with the most important fields and actions, or visibly signal that the
table scrolls horizontally. Keep assignment and resolution actions clearly
separated, and confirm before consequential actions.

### Teaching staff

**What works:** The interface is focused on assigned cases and remarks rather
than exposing irrelevant administrative actions.

**Improve:** Make the assigned case count, status, and next action apparent
without requiring users to open multiple screens. Test the narrow layout with
long subject names and status text. Verify the remark action is easy to reach
and clearly indicates who will see a message.

### Shared navigation and profile

**What works:** A common role-aware navigation pattern and shared profile
screen reduce the need to learn a different shell for every task.

**Improve:** Active navigation should communicate the current location
visually and to assistive technology. Keep a parent navigation group open
when one of its child pages is active. Guidelines and Notice Board currently
present as destinations but contain placeholder content; label them as
coming soon, provide useful content, or remove them until ready. Consider
URL-backed page state so refresh, browser back, and bookmarks behave as users
expect.

## Prioritized findings

Priority reflects user impact and how broadly the issue affects the workflow.

### P1 — Distinguish failed loading from a genuinely empty grievance list

**Observed:** If the student grievance request fails, the page ends its initial
loading state, but the history component can still render the empty-state
message. The fetch error is held separately and is not passed into the history
list.

**Why it matters:** A student could interpret a backend/network failure as
having no grievances, lose confidence in the system, or submit a duplicate.

**Recommendation:** Use three explicit states: loading, successful empty
result, and load failure. The failure state should explain that cases could
not be loaded and offer a retry. Never render “No grievances submitted yet”
after an unsuccessful request.

**Acceptance check:** Simulate a failed list request and verify a visible,
announced error plus retry; simulate a successful empty response and verify
the empty state appears only then.

### P1 — Make submission success and failure unmistakably different

**Observed:** Submission success and caught errors share one message field;
the form presents that message with status semantics and similar styling.

**Why it matters:** Users need to know whether a grievance was actually saved.
Ambiguous feedback can lead to duplicate submissions or abandoned cases.

**Recommendation:** Give success and error separate visual treatments and
appropriate live-region semantics (`status` for success, `alert` for
actionable failure). Preserve form values on failure and describe a safe next
step.

**Acceptance check:** Verify success is announced as completion; force a
failure and confirm the error is prominent, specific enough to act on, and
does not clear entered data.

### P2 — Improve staff case browsing on small screens

**Observed:** The staff case table retains a wide minimum width and can require
horizontal scrolling on mobile.

**Why it matters:** Important case details and actions are harder to compare
and operate on a narrow phone screen.

**Recommendation:** Add a responsive card/list presentation at a narrow
breakpoint, or reduce columns and add a clearly visible horizontal-scroll cue.
Keep search and filters above the case results and make action buttons
touch-friendly.

**Acceptance check:** At a 360–390 CSS-pixel viewport, users can search, read
the identifier/status/assignee, and open the correct case without accidental
horizontal page scrolling.

### P2 — Clarify location and active state in navigation

**Observed:** Portal navigation changes local component state rather than a
URL. A nested Grievances menu can start collapsed even when a child page is
active, and the active item is not exposed with `aria-current`.

**Why it matters:** Users can lose their location after refresh and may not
understand which section is open.

**Recommendation:** At minimum, keep active parent groups expanded and expose
the current page semantically. Consider URL-backed navigation for refresh,
browser history, direct linking, and bookmarking.

**Acceptance check:** Active state is visible and announced; navigating to a
child keeps its parent expanded; browser refresh/back behavior is predictable.

### P2 — Complete accessible labels, headings, and dialog focus

**Observed:** Some category/problem captions are visual spans rather than
programmatically associated labels. Custom staff dialogs have dialog
semantics, but explicit initial-focus and focus-return behavior is not visible
in the component. The authenticated shell and portal hero can each render an
`h1`.

**Why it matters:** Keyboard and assistive-technology users need clear control
names, a sensible heading outline, and predictable focus when dialogs open and
close.

**Recommendation:** Associate every label with its control, expose selected
and expanded states, keep one meaningful page-level `h1`, move focus into a
dialog on open, trap it while modal, and restore it to the invoking control on
close.

**Acceptance check:** Complete sign-in, submission, navigation, case actions,
and thread reply using only a keyboard; inspect the screen-reader name and
state of each custom control and dialog.

### P3 — Clarify unfinished destinations and upload guidance

**Observed:** Guidelines and Notice Board destinations use placeholder
content/actions. The grievance form does not make all upload constraints
obvious alongside the chooser.

**Why it matters:** A visible but nonfunctional destination and late upload
rejection create avoidable uncertainty.

**Recommendation:** Clearly mark unfinished destinations or defer them.
Display upload formats, maximum size, and selected-file summary before submit.

**Acceptance check:** No navigation item appears fully available if its
destination is placeholder-only; students can confirm valid files before
submitting.

## Recommended implementation sequence

1. **Protect trust first:** Separate list load failure from a successful empty
   state and make submission success/error messages distinct.
2. **Improve high-frequency navigation:** Keep student cards compact but
   identifiable; make active navigation/filter context clear; retain the
   thread as the only full event-history view.
3. **Fix mobile case handling:** Test all three roles at phone widths, then
   improve the Examination Cell table presentation and tap targets.
4. **Address accessibility foundations:** Associate labels, improve dialog
   focus management, verify heading hierarchy and status announcements.
5. **Polish completeness:** Clarify upload limits and make placeholder
   destinations intentional.
6. **Validate with users:** Run short task-based sessions with one student,
   one Examination Cell user, and one teaching-staff user on desktop and
   mobile. Observe task completion, misclicks, and uncertainty rather than
   relying only on visual preference.

## Suggested design QA checklist

- [ ] Student can distinguish loading, no cases, and failed-to-load states.
- [ ] Student list identifies each case with ID, subject, category/type,
      status, and a clear thread action; events remain inside the thread.
- [ ] Student can see and act on the resolution response window in the thread.
- [ ] Form validation, upload limits, selected files, success, and failure are
      clear and accessible.
- [ ] Staff can search/filter and operate case actions at desktop and mobile
      widths without losing critical fields.
- [ ] Navigation marks the current page visually and semantically.
- [ ] All interactive controls have accessible names, keyboard focus, and
      usable touch targets.
- [ ] Modal dialogs manage focus and return focus to the triggering control.
- [ ] Status, error, and success states do not rely on color alone.
- [ ] Long labels, case identifiers, and messages wrap without clipping or
      horizontal page overflow.
- [ ] Placeholder destinations are clearly identified or removed from the
      active navigation.
- [ ] Test the deployed website with representative accounts and realistic
      data before release.

## Source references

- [Application shell and role routing](./src/App.jsx)
- [Shared visual styles](./src/App.css)
- [Student dashboard and list state](./src/pages/StudentPage.jsx)
- [Student grievance form](./src/components/StudentPage/GrievanceForm.jsx)
- [Student grievance card](./src/components/StudentPage/StudentGrievance.jsx)
- [Student history list](./src/components/StudentPage/GrievanceHistory.jsx)
- [Grievance thread and reply actions](./src/pages/GrievanceThreadPage.jsx)
- [Thread styles](./src/pages/GrievanceThread.css)
- [Examination Cell page](./src/pages/examinationCell.jsx)
- [Teaching-staff page](./src/pages/TeachingStaffPage.jsx)
- [Staff case table](./src/components/ExaminationCell/GrievanceTable.jsx)
- [Case action dialog](./src/components/ExaminationCell/CaseActionDialog.jsx)
- [Shared portal navigation](./src/components/PortalNavigation.jsx)
- [Student category controls](./src/components/StudentPage/DropDown.jsx)
- [Shared profile section](./src/components/UserProfileSection.jsx)
- [Login form](./src/components/LogIn/LoginForm.jsx)
- [Password recovery](./src/pages/ForgotPassword.jsx)
- [Password change](./src/pages/ChangePassword.jsx)
