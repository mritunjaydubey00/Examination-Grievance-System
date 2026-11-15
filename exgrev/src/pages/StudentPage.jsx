import { useCallback, useEffect, useState } from "react";
import {
  createGrievance,
  listStudentGrievances,
} from "../services/grievanceService.js";
import {
  createLateEntryRequest,
  getStudentProfileSnapshot,
  hasLateEntryQRCodeToday,
  listExamSchedulesForStudent,
  listLateEntryRequestsForStudent,
} from "../services/lateEntryService.js";
import { supabase } from "../lib/supabase.js";
import StudentHeader from "../components/StudentPage/StudentHeader.jsx";
import UserProfileSection from "../components/UserProfileSection.jsx";
import GrievanceForm from "../components/StudentPage/GrievanceForm.jsx";
import GrievanceHistory from "../components/StudentPage/GrievanceHistory.jsx";
import {
  PortalDashboard,
  PortalPlaceholderPage,
  PortalSidePanel,
} from "../components/PortalNavigation.jsx";
import GrievanceThreadPage from "./GrievanceThreadPage.jsx";
import PortalLoading from "../components/PortalLoading.jsx";
import LateEntryPassModal from "../components/StudentPage/LateEntryPassModal.jsx";

function LateEntryRequestWorkspace({ session }) {
  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState("");
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await getStudentProfileSnapshot(session.userId);
      const [studentSchedules, lateEntries] = await Promise.all([
        listExamSchedulesForStudent({
          department: snapshot.Department,
          branch: snapshot.Branch,
        }),
        listLateEntryRequestsForStudent(session.userId),
      ]);
      setSchedules(studentSchedules);
      setScheduleId((current) =>
        studentSchedules.some((schedule) => schedule.id === current)
          ? current
          : studentSchedules[0]?.id || "",
      );
      setRequests(lateEntries);
      setMessage("");
    } catch (error) {
      setMessage(
        error.message || "Could not load your late-entry requests and schedules.",
      );
    }
  }, [session.userId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(refresh, 0);
    const channel = supabase
      .channel(`student-late-entry-${session.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "late_entry_requests",
          filter: `student_user_id=eq.${session.userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "late_entry_exam_schedules",
        },
        refresh,
      )
      .subscribe();
    const timer = window.setInterval(refresh, 30000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [refresh, session.userId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const request = await createLateEntryRequest({
        userId: session.userId,
        scheduleId,
        reason,
        files,
      });

      setRequests((current) => [request, ...current]);
      setReason("");
      setFiles([]);
      setMessage("Late entry request submitted successfully.");
    } catch (error) {
      setMessage(error.message || "Could not submit your late entry request.");
    } finally {
      setBusy(false);
    }
  }

  const selectedSchedule = schedules.find(
    (schedule) => schedule.id === scheduleId,
  );

  return (
    <>
    <section className="grievance-panel" aria-labelledby="late-entry-title">
      <div className="panel-intro">
        <p className="eyebrow">Student portal</p>
        <h3 id="late-entry-title">Late Entry Request</h3>
        <p>
          Submit a late-arrival request for an examination and track the review process.
        </p>
      </div>
      <form className="grievance-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="late-entry-schedule">Published examination</label>
          <select
            id="late-entry-schedule"
            required
            value={scheduleId}
            onChange={(event) => setScheduleId(event.target.value)}
            disabled={!schedules.length}
          >
            <option value="">
              {schedules.length
                ? "Select your examination"
                : "No published examination schedule for your department"}
            </option>
            {schedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {schedule.exam_type} · {schedule.course_name} ({schedule.course_code})
              </option>
            ))}
          </select>
        </div>
        {selectedSchedule && (
          <div className="form-grid" aria-live="polite">
            {[
              ["Exam type", selectedSchedule.exam_type],
              ["Course name", selectedSchedule.course_name],
              ["Course code", selectedSchedule.course_code],
            ].map(([label, value]) => (
              <div className="form-field" key={label}>
                <label>{label}</label>
                <input type="text" value={value || ""} readOnly />
              </div>
            ))}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="late-entry-reason">Reason for late arrival</label>
          <textarea
            id="late-entry-reason"
            rows="5"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Please explain why you have arrived late for your examination."
          />
        </div>

        <div className="form-field">
          <label htmlFor="late-entry-documents">
            Supporting documents (optional)
          </label>
          <input
            id="late-entry-documents"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
        </div>

        {message && (
          <p role="status" className="grievance-message">
            {message}
          </p>
        )}

        <div className="form-footer">
          <p>
            Your request is linked to your authenticated student record. Only
            one QR pass can be issued per UTC calendar day.
          </p>
          <button
            type="submit"
            className="submit-button"
            disabled={busy || !reason.trim() || !scheduleId}
          >
            {busy ? "Submitting…" : "Submit Late Entry Request"}
          </button>
        </div>
      </form>

      <div className="portal-info-card" style={{ marginTop: "1.5rem" }}>
        <div className="portal-card-heading">
          <div>
            <p className="eyebrow">History</p>
            <h3>Your late-entry requests</h3>
          </div>
        </div>
        {requests.length === 0 ? (
          <p className="portal-placeholder-message">
            No late entry requests submitted yet.
          </p>
        ) : (
          <ul className="portal-placeholder-list">
            {requests.map((request) => (
              <li key={request.id || request.student_user_id + request.requested_at}>
                <strong>{request.status || "Pending"}</strong>
                <span>
                  {" "}
                  · {request.exam_type || "Examination"} ·{" "}
                  {request.course_name || request.subject || "Course"}{" "}
                  {request.course_code ? `(${request.course_code})` : ""}
                </span>
                <div>
                  {request.examination_date || "Date not available"} ·{" "}
                  {String(request.scheduled_start_time || "").slice(0, 5)}
                </div>
                <div>{request.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
    </>
  );
}

function ApprovedLateEntryPassPrompt({ userId }) {
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [dismissedRequestId, setDismissedRequestId] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () =>
      Promise.all([
        listLateEntryRequestsForStudent(userId),
        hasLateEntryQRCodeToday(),
      ])
        .then(([entries, qrIssuedToday]) => {
          if (active) {
            const now = Date.now();
            const isAvailable = (entry) =>
              entry.status === "approved" &&
              !entry.entry_confirmed_at &&
              Number.isFinite(Date.parse(entry.reviewed_at)) &&
              now < Date.parse(entry.reviewed_at) + 60 * 60 * 1000;
            const currentRequest = entries.find(
              (entry) => entry.id === request?.id && isAvailable(entry),
            );
            setRequest(
              currentRequest ||
                (qrIssuedToday
                  ? null
                  : entries.find(
                      (entry) =>
                        entry.id !== dismissedRequestId && isAvailable(entry),
                    )) ||
                null,
            );
            setError("");
          }
        })
        .catch((loadError) => {
          if (active) {
            setError(loadError.message || "Could not check for an approved late-entry request.");
          }
        });

    const initialLoad = window.setTimeout(refresh, 0);
    const channel = supabase
      .channel(`student-late-entry-pass-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "late_entry_requests",
          filter: `student_user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();
    const timer = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [dismissedRequestId, request?.id, userId]);

  if (error) {
    return (
      <div className="late-entry-modal-backdrop">
        <section className="late-entry-modal" role="alert">
          <h2>Could not load your entry pass</h2>
          <p>{error}</p>
        </section>
      </div>
    );
  }
  if (!request) return null;

  return (
    <LateEntryPassModal
      key={request.id}
      request={request}
      onClose={() => {
        setRequest(null);
        setDismissedRequestId(request.id);
      }}
    />
  );
}

function StudentPage({
  session,
  onLogout,
  onChangePassword,
}) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const [grievances, setGrievances] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [threadGrievanceId, setThreadGrievanceId] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [dashboardMetric, setDashboardMetric] = useState("");

  // The listStudentGrievances query is scoped to this signed-in student.
  const studentMetrics = [
    { key: "total", label: "Total Submitted", value: grievances.length, tone: "teal" },
    {
      key: "pending",
      label: "Pending",
      value: grievances.filter(
        (grievance) =>
          grievance.status !== "Resolved" || grievance.resolution_pending,
      ).length,
      tone: "amber",
    },
    {
      key: "resolved",
      label: "Resolved",
      value: grievances.filter(
        (grievance) =>
          grievance.status === "Resolved" && !grievance.resolution_pending,
      ).length,
      tone: "green",
    },
  ];

  const displayedGrievances = grievances.filter(
    (grievance) =>
      !dashboardMetric ||
      dashboardMetric === "total" ||
      (dashboardMetric === "pending" &&
        (grievance.status !== "Resolved" || grievance.resolution_pending)) ||
      (dashboardMetric === "resolved" &&
        grievance.status === "Resolved" &&
        !grievance.resolution_pending),
  );

  function showMetricGrievances(metric) {
    setDashboardMetric(metric);
    setActivePage("Your Grievances");
  }

  const refresh = useCallback(async () => {
    try {
      setGrievances(await listStudentGrievances(session.userId));
    } catch (error) {
      setMessage(error.message || "Could not load your grievances.");
    } finally {
      setInitialLoading(false);
    }
  }, [session.userId]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`student-grievances-${session.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grievances",
          filter: `student_user_id=eq.${session.userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grievance_events" },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, session.userId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createGrievance({
        userId: session.userId,
        subject: form.get("subject"),
        description: form.get("description"),
        category: selectedCategory,
        problemType: selectedProblem,
        files: form.getAll("documents").filter((file) => file.size > 0),
      });
      formElement.reset();
      setSelectedCategory("");
      setSelectedProblem("");
      setMessage("Grievance submitted successfully.");
      await refresh();
    } catch (error) {
      setMessage(error.message || "Could not submit your grievance.");
    } finally {
      setBusy(false);
    }
  }

  if (initialLoading) {
    return <PortalLoading label="Loading your grievances…" />;
  }

  if (threadGrievanceId) {
    return (
      <div className="student-page portal-thread-shell">
        <div className="portal-layout">
          <PortalSidePanel
            role="student"
            activePage={activePage}
            onNavigate={(page) => {
              setThreadGrievanceId(null);
              setDashboardMetric("");
              setActivePage(page);
            }}
            onLogout={onLogout}
          />
          <div className="portal-content portal-thread-content">
            <GrievanceThreadPage
              grievanceId={threadGrievanceId}
              session={session}
              onBack={() => setThreadGrievanceId(null)}
              onLogout={onLogout}
            />
          </div>
        </div>
        <ApprovedLateEntryPassPrompt userId={session.userId} />
      </div>
    );
  }

  return (
    <main className="student-page">
      <StudentHeader
        session={session}
        onLogout={onLogout}
      />
      <div className="portal-layout">
        <PortalSidePanel
          role="student"
          activePage={activePage}
          onNavigate={(page) => {
            setDashboardMetric("");
            setActivePage(page);
          }}
          onLogout={onLogout}
        />
        <div className="portal-content">
          {activePage === "Dashboard" && (
            <PortalDashboard
              role="student"
              metrics={studentMetrics}
              canEditContent={false}
              onMetricClick={showMetricGrievances}
            />
          )}
          {activePage === "Add New" && (
            <GrievanceForm
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedProblem={selectedProblem}
              onProblemChange={setSelectedProblem}
              busy={busy}
              message={message}
              onSubmit={handleSubmit}
            />
          )}
          {activePage === "Late Entry Request" && (
            <LateEntryRequestWorkspace session={session} />
          )}
          {activePage === "Your Grievances" && (
            <GrievanceHistory
              grievances={displayedGrievances}
              onOpenThread={(grievance) => setThreadGrievanceId(grievance.id)}
              onRefresh={refresh}
              onSubmitNewGrievance={() => setActivePage("Add New")}
            />
          )}
          {activePage === "Profile" && (
            <UserProfileSection
              session={session}
              onChangePassword={onChangePassword}
            />
          )}
          {["Guidelines", "Notice Board"].includes(activePage) && (
            <PortalPlaceholderPage
              page={activePage}
              canEditContent={false}
            />
          )}
        </div>
      </div>
      <ApprovedLateEntryPassPrompt userId={session.userId} />
    </main>
  );
}

export default StudentPage;
