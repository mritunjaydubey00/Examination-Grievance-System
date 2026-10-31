import { useCallback, useEffect, useState } from "react";
import TeachingStaffHeader from "../components/teachingStaff/TeachingStaffHeader.jsx";
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
import GrievanceThreadPage from "./GrievanceThreadPage.jsx";
import { supabase } from "../lib/supabase.js";
import "./ExaminationCell.css";

// TODO: Replace these placeholders with grievances assigned to this faculty member.
const facultyMetrics = [
  { label: "Total Received", value: 8, tone: "teal" },
  { label: "Active", value: 3, tone: "amber" },
  { label: "Resolved", value: 5, tone: "green" },
];

function TeachingStaffPage({ session, onLogout, onChangePassword }) {
  const [grievances, setGrievances] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeAction, setActiveAction] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [threadGrievanceId, setThreadGrievanceId] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");

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
    const viewMatches =
      activePage === "Active Grievances"
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

  if (threadGrievanceId) {
    return (
      <div className="student-page examination-cell-page portal-thread-shell">
        <div className="portal-layout">
          <PortalSidePanel
            role="faculty"
            activePage={activePage}
            onNavigate={(page) => {
              setThreadGrievanceId(null);
              setActivePage(page);
              setStatusFilter("ALL");
            }}
            onLogout={onLogout}
          />
          <div className="portal-content portal-thread-content">
            <GrievanceThreadPage
              grievanceId={threadGrievanceId}
              session={session}
              onBack={() => setThreadGrievanceId(null)}
              onLogout={onLogout}
              onChangePassword={onChangePassword}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="student-page examination-cell-page">
      <TeachingStaffHeader
        session={session}
        onLogout={onLogout}
        onChangePassword={onChangePassword}
      />
      <div className="portal-layout">
        <PortalSidePanel
          role="faculty"
          activePage={activePage}
          onNavigate={(page) => {
            setActivePage(page);
            if (page === "Active Grievances" || page === "Resolved Grievances") {
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
            />
          )}
          {["Active Grievances", "Resolved Grievances"].includes(activePage) && (
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
          {["Guidelines", "Profile", "Notice Board"].includes(activePage) && (
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
