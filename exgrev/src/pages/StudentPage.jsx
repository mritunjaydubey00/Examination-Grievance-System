import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGrievance,
  listStudentGrievances,
} from "../services/grievanceService.js";
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

function StudentPage({
  session,
  mobileMenuTarget,
  onLogout,
  onChangePassword,
}) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const [grievances, setGrievances] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [grievanceLoadError, setGrievanceLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [formResetVersion, setFormResetVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [threadGrievanceId, setThreadGrievanceId] = useState(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [dashboardMetric, setDashboardMetric] = useState("");
  const [grievanceDialogOpen, setGrievanceDialogOpen] = useState(false);
  const grievanceDialog = useRef(null);

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
      setGrievanceLoadError("");
    } catch (error) {
      setGrievanceLoadError(error.message || "Could not load your grievances.");
    } finally {
      setInitialLoading(false);
    }
  }, [session.userId]);

  function handleCategoryChange(category) {
    setSelectedCategory(category);
    setSelectedProblem("");
  }

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

  useEffect(() => {
    const dialog = grievanceDialog.current;
    if (!dialog) return;

    if (grievanceDialogOpen && !dialog.open) {
      dialog.showModal();
    } else if (!grievanceDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [grievanceDialogOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createGrievance({
        userId: session.userId,
        title: form.get("title"),
        description: form.get("description"),
        category: selectedCategory,
        subCategory: selectedProblem,
        otherText: form.get("otherText") || "",
        files: form.getAll("documents").filter((file) => file.size > 0),
      });
      formElement.reset();
      setSelectedCategory("");
      setSelectedProblem("");
      setFormResetVersion((version) => version + 1);
      setMessage("Grievance submitted successfully.");
      await refresh();
    } catch (error) {
      setMessage(error.message || "Could not submit your grievance.");
    } finally {
      setBusy(false);
    }
  }

  if (threadGrievanceId) {
    return (
      <div className="student-page portal-thread-shell fade-in-up">
        <div className="portal-layout">
          <PortalSidePanel
            role="student"
            userId={session.userId}
            mobileMenuTarget={mobileMenuTarget}
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
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="student-page fade-in-up">
      <StudentHeader session={session} />
      <div className="portal-layout">
        <PortalSidePanel
          role="student"
          mobileMenuTarget={mobileMenuTarget}
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
              userId={session.userId}
              metrics={studentMetrics}
              canEditContent={false}
              onMetricClick={showMetricGrievances}
              onAddGrievance={() => setGrievanceDialogOpen(true)}
            />
          )}
          {activePage === "Add New" && (
            <GrievanceForm
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              selectedProblem={selectedProblem}
              onProblemChange={setSelectedProblem}
              busy={busy}
              message={message}
              resetVersion={formResetVersion}
              onSubmit={handleSubmit}
            />
          )}
          {activePage === "Your Grievances" && (
            <GrievanceHistory
              grievances={displayedGrievances}
              loading={initialLoading}
              error={grievanceLoadError}
              onOpenThread={(grievance) => setThreadGrievanceId(grievance.id)}
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
              userId={session.userId}
            />
          )}
        </div>
      </div>
      {activePage === "Dashboard" && (
        <dialog
          ref={grievanceDialog}
          className="student-grievance-dialog"
          aria-labelledby="grievance-title"
          onClose={() => setGrievanceDialogOpen(false)}
          onCancel={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <button
            type="button"
            className="student-grievance-dialog-close"
            disabled={busy}
            onClick={() => setGrievanceDialogOpen(false)}
          >
            Close
          </button>
          <GrievanceForm
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            selectedProblem={selectedProblem}
            onProblemChange={setSelectedProblem}
            busy={busy}
            message={message}
            resetVersion={formResetVersion}
            onSubmit={handleSubmit}
          />
        </dialog>
      )}
    </main>
  );
}

export default StudentPage;
