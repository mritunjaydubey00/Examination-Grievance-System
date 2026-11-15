import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/ExaminationCell/AdminHeader.jsx";
import UserProfileSection from "../components/UserProfileSection.jsx";
import AdminWorkspace from "../components/ExaminationCell/AdminWorkspace.jsx";
import CaseActionDialog from "../components/ExaminationCell/CaseActionDialog.jsx";
import GrievanceThreadPage from "./GrievanceThreadPage.jsx";
import ToastNotice from "../components/ToastNotice.jsx";
import {
  PortalDashboard,
  PortalPlaceholderPage,
  PortalSidePanel,
} from "../components/PortalNavigation.jsx";
import {
  getDocumentUrl,
  listGrievances,
  updateGrievance,
} from "../services/grievanceService.js";
import {
  createExamSchedule,
  listExamSchedulesForExamCell,
  listStudentDepartments,
  listLateEntryRequestsForExamCell,
  updateLateEntryRequestStatus,
} from "../services/lateEntryService.js";
import { supabase } from "../lib/supabase.js";
import PortalLoading from "../components/PortalLoading.jsx";
import "../components/lateEntryDialogs.css";
import "./ExaminationCell.css";

function LateEntryReviewBoard() {
  const [entries, setEntries] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    department: "",
    branch: "",
    examType: "",
    courseName: "",
    courseCode: "",
    examDate: "",
    startTime: "",
  });

  useEffect(() => {
    let ignore = false;

    async function loadEntries() {
      try {
        const [items, existingSchedules, studentDepartments] = await Promise.all([
          listLateEntryRequestsForExamCell(),
          listExamSchedulesForExamCell(),
          listStudentDepartments(),
        ]);
        if (!ignore) {
          setEntries(items || []);
          setSchedules(existingSchedules || []);
          setDepartments(studentDepartments || []);
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error.message || "Could not load late-entry requests.");
        }
      }
    }

    loadEntries();
    return () => {
      ignore = true;
    };
  }, []);

  async function submitSchedule(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const schedule = await createExamSchedule(scheduleForm);
      setSchedules((current) =>
        [...current, schedule].sort(
          (left, right) =>
            `${left.exam_date} ${left.start_time}`.localeCompare(
              `${right.exam_date} ${right.start_time}`,
            ),
        ),
      );
      setScheduleForm({
        department: "",
        branch: "",
        examType: "",
        courseName: "",
        courseCode: "",
        examDate: "",
        startTime: "",
      });
      setMessage("Examination schedule published for the selected department.");
    } catch (error) {
      setMessage(error.message || "Could not publish the examination schedule.");
    } finally {
      setBusy(false);
    }
  }

  async function decideRequest(requestId, status) {
    const decisionReason =
      status === "rejected"
        ? window.prompt("Enter the reason for rejecting this request:") || ""
        : "";
    if (status === "rejected" && !decisionReason.trim()) {
      setMessage("A rejection reason is required.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const updated = await updateLateEntryRequestStatus({
        requestId,
        status,
        decisionReason,
      });
      setEntries((current) =>
        current.map((entry) => (entry.id === requestId ? { ...entry, ...updated } : entry)),
      );
      setMessage(
        status === "approved"
          ? "Late-entry request approved."
          : "Late-entry request rejected.",
      );
    } catch (error) {
      setMessage(error.message || "Could not update the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grievance-panel" aria-labelledby="late-entry-review-title">
      <div className="panel-intro">
        <p className="eyebrow">Review queue</p>
        <h3 id="late-entry-review-title">Late Entry Requests</h3>
        <p>Approve or reject student late-entry requests before the invigilator scans the QR pass.</p>
      </div>
      {message && (
        <p role="status" className="grievance-message">
          {message}
        </p>
      )}
      <div className="portal-info-card" style={{ marginBottom: "1.5rem" }}>
        <div className="portal-card-heading">
          <div>
            <p className="eyebrow">Examination timetable</p>
            <h3>Publish department schedule</h3>
          </div>
        </div>
        <form className="grievance-form" onSubmit={submitSchedule}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="late-schedule-department">Department / branch</label>
              <select
                id="late-schedule-department"
                required
                value={`${scheduleForm.department}|${scheduleForm.branch}`}
                onChange={(event) => {
                  const [department, branch] = event.target.value.split("|");
                  setScheduleForm((current) => ({ ...current, department, branch }));
                }}
              >
                <option value="|">Select department and branch</option>
                {departments.map((item) => (
                  <option
                    key={`${item.department}|${item.branch}`}
                    value={`${item.department}|${item.branch}`}
                  >
                    {item.department}{item.branch ? ` · ${item.branch}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="late-schedule-exam-type">Exam type</label>
              <input
                id="late-schedule-exam-type"
                required
                value={scheduleForm.examType}
                onChange={(event) =>
                  setScheduleForm((current) => ({ ...current, examType: event.target.value }))
                }
                placeholder="e.g. End-semester"
              />
            </div>
            <div className="form-field">
              <label htmlFor="late-schedule-course">Course name</label>
              <input
                id="late-schedule-course"
                required
                value={scheduleForm.courseName}
                onChange={(event) =>
                  setScheduleForm((current) => ({ ...current, courseName: event.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="late-schedule-code">Course code</label>
              <input
                id="late-schedule-code"
                required
                value={scheduleForm.courseCode}
                onChange={(event) =>
                  setScheduleForm((current) => ({ ...current, courseCode: event.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="late-schedule-date">Date</label>
              <input
                id="late-schedule-date"
                type="date"
                required
                value={scheduleForm.examDate}
                onChange={(event) =>
                  setScheduleForm((current) => ({ ...current, examDate: event.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="late-schedule-time">Start time</label>
              <input
                id="late-schedule-time"
                type="time"
                required
                value={scheduleForm.startTime}
                onChange={(event) =>
                  setScheduleForm((current) => ({ ...current, startTime: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="form-footer">
            <p>Students in the selected department/branch will see the published details.</p>
            <button type="submit" className="submit-button" disabled={busy || !departments.length}>
              {busy ? "Publishing…" : "Publish examination schedule"}
            </button>
          </div>
        </form>
        {schedules.length > 0 && (
          <ul className="portal-placeholder-list">
            {schedules.map((schedule) => (
              <li key={schedule.id}>
                <strong>{schedule.exam_type}</strong> · {schedule.department}
                {schedule.branch ? ` / ${schedule.branch}` : ""} · {schedule.course_name} ({schedule.course_code}) · {schedule.exam_date} {String(schedule.start_time).slice(0, 5)}
              </li>
            ))}
          </ul>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="portal-placeholder-message">No late-entry requests are pending review.</p>
      ) : (
        <div className="portal-placeholder-list" style={{ padding: 0 }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="portal-info-card"
              style={{ marginBottom: "1rem", padding: "1rem" }}
            >
              <div className="portal-card-heading">
                <div>
                  <p className="eyebrow">{entry.status || "pending"}</p>
                  <h3>{entry.student_name || "Student"}</h3>
                </div>
              </div>
              <p>
                <strong>Subject:</strong> {entry.subject || "Not provided"}
              </p>
              <p>
                <strong>Reason:</strong> {entry.reason || "Not provided"}
              </p>
              <p>
                <strong>Submitted:</strong>{" "}
                {entry.requested_at
                  ? new Date(entry.requested_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })
                  : "Unknown"}
              </p>
              <div className="form-footer">
                <button
                  type="button"
                  className="submit-button"
                  disabled={busy || entry.status === "approved" || entry.status === "rejected"}
                  onClick={() => decideRequest(entry.id, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="submit-button"
                  style={{ marginLeft: "0.75rem", background: "#7f1d1d" }}
                  disabled={busy || entry.status === "approved" || entry.status === "rejected"}
                  onClick={() => decideRequest(entry.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LateEntryPriorityDialog() {
  const [requests, setRequests] = useState([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refreshPendingRequests = useCallback(async () => {
    try {
      const entries = await listLateEntryRequestsForExamCell();
      setRequests(entries.filter((entry) => entry.status === "pending"));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Could not load priority late-entry requests.");
    }
  }, []);

  useEffect(() => {
    refreshPendingRequests();
    const channel = supabase
      .channel("late-entry-priority-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "late_entry_requests" },
        refreshPendingRequests,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshPendingRequests]);

  const request = requests[0];

  async function decide(status) {
    const reason = rejectionReason.trim();
    if (status === "rejected" && !reason) {
      setError("Enter a reason before rejecting this request.");
      return;
    }
    if (!request) return;

    setBusy(true);
    setError("");
    try {
      await updateLateEntryRequestStatus({
        requestId: request.id,
        status,
        decisionReason: status === "rejected" ? reason : "",
      });
      setRejectionReason("");
      await refreshPendingRequests();
    } catch (decisionError) {
      setError(decisionError.message || "Could not record this decision.");
    } finally {
      setBusy(false);
    }
  }

  if (!request) {
    return error ? (
      <div className="late-entry-priority-error" role="alert">
        {error}
      </div>
    ) : null;
  }

  return (
    <div className="late-entry-modal-backdrop">
      <section
        className="late-entry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="late-entry-priority-title"
      >
        <div className="late-entry-modal-heading">
          <div>
            <p className="eyebrow">Priority action required</p>
            <h2 id="late-entry-priority-title">Late-entry request awaiting review</h2>
          </div>
        </div>
        <dl className="late-entry-modal-request-details">
          <div><dt>Student</dt><dd>{request.student_name}</dd></div>
          <div><dt>Student ID</dt><dd>{request.student_roll_number || request.student_user_id}</dd></div>
          <div><dt>Department / branch</dt><dd>{request.department}{request.branch ? ` · ${request.branch}` : ""}</dd></div>
          <div><dt>Examination</dt><dd>{request.exam_type || request.examination_name}</dd></div>
          <div><dt>Course</dt><dd>{request.course_name || request.subject} {request.course_code ? `(${request.course_code})` : ""}</dd></div>
          <div><dt>Date / time</dt><dd>{request.examination_date} · {String(request.scheduled_start_time || "").slice(0, 5)}</dd></div>
          <div><dt>Submitted</dt><dd>{request.requested_at ? new Date(request.requested_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Unknown"}</dd></div>
          <div><dt>Reason</dt><dd>{request.reason}</dd></div>
        </dl>
        <div className="form-field">
          <label htmlFor="late-entry-priority-rejection">Rejection reason (required only when rejecting)</label>
          <textarea
            id="late-entry-priority-rejection"
            rows="3"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
          />
        </div>
        {error && <p className="late-entry-modal-error" role="alert">{error}</p>}
        <div className="late-entry-modal-actions">
          <button
            type="button"
            className="submit-button"
            style={{ background: "#7f1d1d" }}
            disabled={busy || !rejectionReason.trim()}
            onClick={() => decide("rejected")}
          >
            Reject
          </button>
          <button
            type="button"
            className="submit-button"
            disabled={busy}
            onClick={() => decide("approved")}
          >
            Approve
          </button>
        </div>
      </section>
    </div>
  );
}

function ExaminationCell({
  session,
  mobileMenuTarget,
  onLogout,
  onChangePassword,
}) {
  const [grievances, setGrievances] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dashboardMetric, setDashboardMetric] = useState("");
  const [activeAction, setActiveAction] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [threadGrievanceId, setThreadGrievanceId] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");

  // listGrievances supplies the overall set visible to the Examination Cell.
  const examinationCellMetrics = [
    {
      key: "total",
      label: "Total Grievances Received",
      value: grievances.length,
      tone: "teal",
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
    {
      key: "pending",
      label: "Pending",
      value: grievances.filter((grievance) => grievance.status === "New")
        .length,
      tone: "amber",
    },
    {
      key: "awaiting-response",
      label: "Awaiting Student Response",
      value: grievances.filter((grievance) => grievance.resolution_pending)
        .length,
      tone: "blue",
    },
    {
      key: "forwarded",
      label: "Forwarded to Faculty",
      value: grievances.filter(
        (grievance) =>
          grievance.status === "In Progress" &&
          grievance.assigned_faculty_user_id,
      ).length,
      tone: "teal",
    },
  ];

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const rows = await listGrievances();
      const enriched = rows.map((row) => ({
        ...row,
        student_name: row.users?.["Full Name"] || row.student_user_id,
        branch: row.users?.Branch || "",
        assigned_faculty_name: row.assigned_faculty || "ExGrev Unforward",
        supporting_documents: row.supporting_documents || [],
      }));
      setGrievances(enriched);

      const documentErrors = [];
      const rowsWithDocumentUrls = await Promise.all(
        enriched.map(async (row) => ({
          ...row,
          supporting_documents: await Promise.all(
            row.supporting_documents.map(async (file) => {
              try {
                return { ...file, url: await getDocumentUrl(file.path) };
              } catch (error) {
                documentErrors.push(error);
                return file;
              }
            }),
          ),
        })),
      );
      setGrievances(rowsWithDocumentUrls);
      if (documentErrors.length) {
        setNoticeType("error");
        setNotice(
          documentErrors[0].message ||
            "Some supporting documents could not be loaded.",
        );
      }
    } catch (error) {
      const message =
        error.message ||
        "Could not load grievances. Apply the Supabase setup SQL and check table policies.";
      setLoadError(message);
      setNoticeType("error");
      setNotice(message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("examination-cell-grievances")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grievances" },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const filteredGrievances = grievances.filter(
    (grievance) =>
      (!search ||
        [
          grievance.grievance_code,
          grievance.student_user_id,
          grievance.student_name,
          grievance.subject,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(search.toLowerCase()),
        )) &&
      (activePage === "Active Grievances"
        ? dashboardMetric
          ? true
          : grievance.status !== "Resolved"
        : activePage === "Resolved Grievances"
          ? dashboardMetric
            ? true
            : grievance.status === "Resolved"
          : true) &&
      (!dashboardMetric ||
        dashboardMetric === "total" ||
        (dashboardMetric === "resolved" &&
          grievance.status === "Resolved" &&
          !grievance.resolution_pending) ||
        (dashboardMetric === "pending" && grievance.status === "New") ||
        (dashboardMetric === "awaiting-response" &&
          grievance.resolution_pending) ||
        (dashboardMetric === "forwarded" &&
          grievance.status === "In Progress" &&
          grievance.assigned_faculty_user_id)) &&
      (statusFilter === "ALL" || grievance.status === statusFilter),
  );

  function showMetricGrievances(metric) {
    setDashboardMetric(metric);
    setStatusFilter("ALL");
    setActivePage(
      metric === "total"
        ? "All Grievances"
        : metric === "resolved"
          ? "Resolved Grievances"
          : "Active Grievances",
    );
  }

  async function submitAction({ faculty, notes, dueDate, priority }) {
    try {
      await updateGrievance({
        grievance: activeAction.grievance,
        action: activeAction.action,
        faculty,
        notes,
        dueDate,
        priority,
      });
      setActiveAction(null);
      setNoticeType("success");
      setNotice(
        activeAction.action === "remark"
          ? "Remark sent. Grievance status is now In Progress."
          : activeAction.action === "resolve"
            ? "Resolution proposed. The grievance will be resolved after the student confirms."
            : "Grievance updated.",
      );
      await refresh();
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not update grievance.");
    }
  }

  if (initialLoading) {
    return <PortalLoading label="Loading the Examination Cell…" />;
  }

  if (threadGrievanceId) {
    return (
      <div className="student-page examination-cell-page portal-thread-shell">
        <div className="portal-layout">
          <PortalSidePanel
            role="exam-cell"
            mobileMenuTarget={mobileMenuTarget}
            activePage={activePage}
            onNavigate={(page) => {
              setThreadGrievanceId(null);
              setActivePage(page);
              setDashboardMetric("");
              if (
                ["All Grievances", "Active Grievances", "Resolved Grievances"].includes(
                  page,
                )
              ) {
                setStatusFilter("ALL");
              }
            }}
            onLogout={onLogout}
          />
          <div className="portal-content portal-thread-content">
            <GrievanceThreadPage
              grievanceId={threadGrievanceId}
              session={session}
              onBack={() => setThreadGrievanceId(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="student-page examination-cell-page">
      <AdminHeader session={session} />
      <div className="portal-layout">
        <PortalSidePanel
          role="exam-cell"
          mobileMenuTarget={mobileMenuTarget}
          activePage={activePage}
          onNavigate={(page) => {
            setActivePage(page);
            setDashboardMetric("");
            if (
              ["All Grievances", "Active Grievances", "Resolved Grievances"].includes(
                page,
              )
            ) {
              setStatusFilter("ALL");
            }
          }}
          onLogout={onLogout}
        />
        <div className="portal-content">
          {activePage === "Dashboard" && (
            <PortalDashboard
              role="exam-cell"
              metrics={examinationCellMetrics}
              canEditContent
              onMetricClick={showMetricGrievances}
            />
          )}
          {["All Grievances", "Active Grievances", "Resolved Grievances"].includes(
            activePage,
          ) && (
            <AdminWorkspace
              grievances={filteredGrievances}
              loading={loading}
              error={loadError}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onAction={(grievance, action) =>
                setActiveAction({ grievance, action })
              }
              onOpenThread={(grievance) => setThreadGrievanceId(grievance.id)}
            />
          )}
          {activePage === "Late Entry Requests" && (
            <LateEntryReviewBoard />
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
              canEditContent
            />
          )}
        </div>
      </div>
      <CaseActionDialog
        grievance={activeAction?.grievance}
        action={activeAction?.action}
        onClose={() => setActiveAction(null)}
        onChooseAction={(action) =>
          setActiveAction((current) => ({ ...current, action }))
        }
        onSubmit={submitAction}
      />
      <ToastNotice
        message={notice}
        type={noticeType}
        onDismiss={() => setNotice("")}
      />
      <LateEntryPriorityDialog />
    </main>
  );
}

export default ExaminationCell;
