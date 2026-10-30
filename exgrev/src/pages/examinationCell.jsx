import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/ExaminationCell/AdminHeader.jsx";
import AdminStats from "../components/ExaminationCell/AdminStats.jsx";
import AdminWorkspace from "../components/ExaminationCell/AdminWorkspace.jsx";
import CaseActionDialog from "../components/ExaminationCell/CaseActionDialog.jsx";
import GrievanceThreadPage from "./GrievanceThreadPage.jsx";
import ToastNotice from "../components/ToastNotice.jsx";
import {
  getDocumentUrl,
  listGrievances,
  updateGrievance,
} from "../services/grievanceService.js";
import { supabase } from "../lib/supabase.js";
import "./ExaminationCell.css";

function ExaminationCell({
  session,
  onLogout,
  embedded = false,
  view = "all",
}) {
  const [grievances, setGrievances] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeAction, setActiveAction] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [threadGrievanceId, setThreadGrievanceId] = useState(null);

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
      (view !== "resolved" || grievance.status === "Resolved") &&
      (view !== "active" || grievance.status !== "Resolved") &&
      (statusFilter === "ALL" || grievance.status === statusFilter),
  );

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

  if (threadGrievanceId) {
    return (
      <GrievanceThreadPage
        grievanceId={threadGrievanceId}
        session={session}
        onBack={() => setThreadGrievanceId(null)}
        onLogout={onLogout}
      />
    );
  }

  return (
    <main
      className={`student-page examination-cell-page${embedded ? " embedded" : ""}`}
    >
      {!embedded && <AdminHeader session={session} onLogout={onLogout} />}
      <AdminStats grievances={grievances} />
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
    </main>
  );
}

export default ExaminationCell;
