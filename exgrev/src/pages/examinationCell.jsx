import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/ExaminationCell/AdminHeader.jsx";
import AdminStats from "../components/ExaminationCell/AdminStats.jsx";
import AdminWorkspace from "../components/ExaminationCell/AdminWorkspace.jsx";
import CaseActionDialog from "../components/ExaminationCell/CaseActionDialog.jsx";
import {
  getDocumentUrl,
  listAssignableUsers,
  listGrievances,
  updateGrievance,
} from "../services/grievanceService.js";
import { supabase } from "../lib/supabase.js";
import "./ExaminationCell.css";

function ExaminationCell({ session, onLogout }) {
  const [grievances, setGrievances] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeAction, setActiveAction] = useState(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [rows, people] = await Promise.all([
        listGrievances(),
        listAssignableUsers(),
      ]);
      const enriched = await Promise.all(
        rows.map(async (row) => ({
          ...row,
          student_name: row.users?.["Full Name"] || row.student_user_id,
          branch: row.users?.Branch || "",
          assigned_faculty_name: row.assigned_faculty || "ExGrev Unforward",
          supporting_documents: await Promise.all(
            (row.supporting_documents || []).map(async (file) => ({
              ...file,
              url: await getDocumentUrl(file.path),
            })),
          ),
        })),
      );
      setGrievances(enriched);
      setUsers(people);
    } catch (error) {
      setNotice(
        error.message ||
          "Could not load grievances. Apply the Supabase setup SQL and check table policies.",
      );
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
      (statusFilter === "ALL" || grievance.status === statusFilter),
  );

  async function submitAction({ faculty, notes, dueDate, priority }) {
    try {
      await updateGrievance({
        grievance: activeAction.grievance,
        action: activeAction.action,
        userId: session.userId,
        faculty,
        notes,
        dueDate,
        priority,
      });
      setActiveAction(null);
      setNotice(
        activeAction.action === "remark"
          ? "Remark sent. Grievance status is now In Progress."
          : activeAction.action === "resolve"
            ? "Resolution proposed. The grievance will be resolved after the student confirms."
            : "Grievance updated.",
      );
      await refresh();
    } catch (error) {
      setNotice(error.message || "Could not update grievance.");
    }
  }

  return (
    <main className="student-page examination-cell-page">
      <AdminHeader session={session} onLogout={onLogout} />
      <AdminStats grievances={grievances} />
      <AdminWorkspace
        grievances={filteredGrievances}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        notice={notice}
        onAction={(grievance, action) =>
          setActiveAction({ grievance, action })
        }
      />
      <CaseActionDialog
        grievance={activeAction?.grievance}
        action={activeAction?.action}
        users={users}
        onClose={() => setActiveAction(null)}
        onChooseAction={(action) =>
          setActiveAction((current) => ({ ...current, action }))
        }
        onSubmit={submitAction}
      />
    </main>
  );
}

export default ExaminationCell;
