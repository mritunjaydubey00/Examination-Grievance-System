import { useCallback, useEffect, useState } from "react";
import TeachingStaffHeader from "../components/teachingStaff/TeachingStaffHeader.jsx";
import UserProfileSection from "../components/UserProfileSection.jsx";
import TeachingStaffWorkspace from "../components/teachingStaff/TeachingStaffWorkspace.jsx";
import TeachingStaffCaseDialog from "../components/teachingStaff/TeachingStaffCaseDialog.jsx";
import ToastNotice from "../components/ToastNotice.jsx";
import {
  PortalDashboard,
  PortalPlaceholderPage,
  PortalSidePanel,
} from "../components/PortalNavigation.jsx";
import {
  addGrievanceRemark,
  listAssignedGrievances,
} from "../services/grievanceService.js";
import { verifyLateEntryQRCode } from "../services/lateEntryService.js";
import GrievanceThreadPage from "./GrievanceThreadPage.jsx";
import { supabase } from "../lib/supabase.js";
import PortalLoading from "../components/PortalLoading.jsx";
import "./ExaminationCell.css";

function LateEntryVerifier() {
  const [qrPayload, setQrPayload] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError("");

    try {
      setResult(await verifyLateEntryQRCode(qrPayload.trim()));
    } catch (verificationError) {
      setError(verificationError.message || "Could not verify the late entry pass.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grievance-panel" aria-labelledby="late-entry-scanner-title">
      <div className="panel-intro">
        <p className="eyebrow">Faculty verification</p>
        <h3 id="late-entry-scanner-title">Scan Late Entry Pass</h3>
        <p>
          Scan the student’s live QR with a camera or Google Lens, then paste the decoded
          opaque text below to validate it against the server.
        </p>
      </div>
      <form className="grievance-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="late-entry-qr-payload">Scanned QR content</label>
          <textarea
            id="late-entry-qr-payload"
            rows="4"
            required
            value={qrPayload}
            onChange={(event) => setQrPayload(event.target.value)}
            placeholder="EXGREV-LATE-ENTRY:…"
          />
        </div>
        {error && (
          <p role="status" className="grievance-message">
            {error}
          </p>
        )}
        {result && (
          <div className="portal-info-card" role="status">
            <p><strong>Pass verified</strong> · {result.student_name}</p>
            <p>Student ID: {result.student_roll_number || "Not recorded"}</p>
            <p>Department: {result.department}{result.branch ? ` · ${result.branch}` : ""}</p>
            <p>{result.exam_type} · {result.course_name} ({result.course_code})</p>
            <p>{result.exam_date} · {String(result.start_time || "").slice(0, 5)}</p>
            <p>Approved by: {result.approved_by || "Examination Cell"}</p>
            <p>
              Validated: {new Date(result.verified_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            </p>
            <p>Verify the student's original ID card and physical identity before allowing entry.</p>
          </div>
        )}
        <div className="form-footer">
          <p>
            This validates the pass only; it does not confirm entry.
          </p>
          <button type="submit" className="submit-button" disabled={busy || !qrPayload.trim()}>
            {busy ? "Validating…" : "Validate scanned pass"}
          </button>
        </div>
      </form>
    </section>
  );
}

function TeachingStaffPage({
  session,
  mobileMenuTarget,
  onLogout,
  onChangePassword,
}) {
  const [grievances, setGrievances] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeAction, setActiveAction] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [threadGrievanceId, setThreadGrievanceId] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [dashboardMetric, setDashboardMetric] = useState("");

  // listAssignedGrievances is scoped to the signed-in faculty member.
  const facultyMetrics = [
    { key: "total", label: "Total Received", value: grievances.length, tone: "teal" },
    {
      key: "active",
      label: "Active",
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
    {
      key: "awaiting-response",
      label: "Awaiting Student Response",
      value: grievances.filter((grievance) => grievance.resolution_pending)
        .length,
      tone: "blue",
    },
  ];

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

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const authUser = data.session?.user;
      const identities = [
        session.userId,
        authUser?.email,
        authUser?.app_metadata?.user_id,
      ];
      const rows = await listAssignedGrievances(identities);
      const enrichedRows = rows.map((row) => ({
        ...row,
        student_name: row.users?.["Full Name"] || row.student_user_id,
        branch: row.users?.Branch || "",
        student_department: row.users?.Department || "Not provided",
      }));
      setGrievances(enrichedRows);
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not load your assigned grievances.");
    } finally {
      setInitialLoading(false);
    }
  }, [session.userId]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`teaching-staff-grievances-${session.userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grievances" },
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

  const filteredGrievances = grievances.filter((grievance) => {
    const searchMatches =
      !search ||
      [
        grievance.grievance_code,
        grievance.student_user_id,
        grievance.student_name,
        grievance.subject,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    const viewMatches = dashboardMetric
      ? dashboardMetric === "total" ||
        (dashboardMetric === "active" &&
          (grievance.status !== "Resolved" || grievance.resolution_pending)) ||
        (dashboardMetric === "resolved" &&
          grievance.status === "Resolved" &&
          !grievance.resolution_pending) ||
        (dashboardMetric === "awaiting-response" &&
          grievance.resolution_pending)
      : activePage === "Active Grievances"
        ? grievance.status !== "Resolved"
        : activePage === "Resolved Grievances"
          ? grievance.status === "Resolved"
          : true;
    return (
      searchMatches &&
      viewMatches &&
      (statusFilter === "ALL" || grievance.status === statusFilter)
    );
  });

  async function handleSubmitRemark(notes) {
    try {
      await addGrievanceRemark({
        grievanceId: activeAction.grievance.id,
        notes,
      });
      setActiveAction(null);
      setNoticeType("success");
      setNotice("Remark sent to the student and Examination Cell.");
      await refresh();
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not send the remark.");
    }
  }

  if (initialLoading) {
    return <PortalLoading label="Loading your assigned grievances…" />;
  }

  if (threadGrievanceId) {
    return (
      <div className="student-page examination-cell-page portal-thread-shell">
        <div className="portal-layout">
          <PortalSidePanel
            role="faculty"
            mobileMenuTarget={mobileMenuTarget}
            activePage={activePage}
            onNavigate={(page) => {
              setThreadGrievanceId(null);
              setActivePage(page);
              setDashboardMetric("");
              setStatusFilter("ALL");
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
      <TeachingStaffHeader session={session} />
      <div className="portal-layout">
        <PortalSidePanel
          role="faculty"
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
              role="faculty"
              metrics={facultyMetrics}
              canEditContent={false}
              onMetricClick={showMetricGrievances}
            />
          )}
          {["All Grievances", "Active Grievances", "Resolved Grievances"].includes(activePage) && (
            <TeachingStaffWorkspace
              grievances={filteredGrievances}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onOpenGrievance={(grievance) =>
                setActiveAction({ grievance, mode: "view" })
              }
              onOpenThread={(grievance) => setThreadGrievanceId(grievance.id)}
            />
          )}
          {activePage === "Scan Late Entry Pass" && (
            <LateEntryVerifier />
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
      <TeachingStaffCaseDialog
        key={`${activeAction?.grievance.id || "none"}-${activeAction?.mode || "closed"}`}
        grievance={activeAction?.grievance}
        mode={activeAction?.mode}
        onClose={() => setActiveAction(null)}
        onAddRemark={() =>
          setActiveAction((current) => ({ ...current, mode: "remark" }))
        }
        onSubmitRemark={handleSubmitRemark}
      />
      <ToastNotice
        message={notice}
        type={noticeType}
        onDismiss={() => setNotice("")}
      />
    </main>
  );
}

export default TeachingStaffPage;
