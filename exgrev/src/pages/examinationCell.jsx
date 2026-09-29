import { useCallback, useEffect, useState } from "react";
import AdminHeader from "../components/ExaminationCell/AdminHeader.jsx";
import AdminStats from "../components/ExaminationCell/AdminStats.jsx";
import CaseActionDialog from "../components/ExaminationCell/CaseActionDialog.jsx";
import GrievanceTable from "../components/ExaminationCell/GrievanceTable.jsx";
import { getDocumentUrl, listAssignableUsers, listGrievances, updateGrievance } from "../services/grievanceService.js";
import { supabase } from "../lib/supabase.js";
import "./ExaminationCell.css";
function ExaminationCell({ session, onLogout }) {
  const [grievances, setGrievances] = useState([]); const [users, setUsers] = useState([]);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("ALL"); const [activeAction, setActiveAction] = useState(null); const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    try { const [rows, people] = await Promise.all([listGrievances(), listAssignableUsers()]);
      const enriched = await Promise.all(rows.map(async (row) => ({ ...row,
        student_name: row.users?.["Full Name"] || row.student_user_id,
        branch: row.users?.Branch || "",
        assigned_faculty_name: row.assigned_faculty || "ExGrev Unforward",
        supporting_documents: await Promise.all((row.supporting_documents || []).map(async (file) => ({ ...file, url: await getDocumentUrl(file.path) }))),
      })));
      setGrievances(enriched); setUsers(people);
    } catch (error) { setNotice(error.message || "Could not load grievances. Apply the Supabase setup SQL and check table policies."); }
  }, []);
  useEffect(() => { refresh(); const channel = supabase.channel("examination-cell-grievances").on("postgres_changes", { event: "*", schema: "public", table: "grievances" }, refresh).subscribe(); return () => { supabase.removeChannel(channel); }; }, [refresh]);
  const filtered = grievances.filter((g) => (!search || [g.grievance_number, g.student_user_id, g.student_name, g.subject].some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()))) && (statusFilter === "ALL" || g.status === statusFilter));
  async function submit({ faculty, notes, dueDate, priority }) { try { await updateGrievance({ grievance: activeAction.grievance, action: activeAction.action, userId: session.userId, faculty, notes, dueDate, priority }); setActiveAction(null); setNotice("Grievance updated."); await refresh(); } catch (error) { setNotice(error.message || "Could not update grievance."); } }
  return <main className="student-page examination-cell-page"><AdminHeader session={session} onLogout={onLogout}/><AdminStats grievances={grievances}/><section className="admin-workspace" aria-label="Grievance administration"><div className="admin-toolbar"><label className="admin-search-field"><span className="visually-hidden">Search grievances</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, roll number, case, or subject"/></label><label className="admin-filter-field"><span className="visually-hidden">Filter by status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ALL">All statuses</option>{["New", "In Progress", "Resolved", "Over Due"].map((v) => <option key={v}>{v}</option>)}</select></label></div>{notice && <p role="status" className="grievance-message">{notice}</p>}<GrievanceTable grievances={filtered} onAction={(grievance, action) => setActiveAction({ grievance, action })}/></section><CaseActionDialog grievance={activeAction?.grievance} action={activeAction?.action} users={users} onClose={() => setActiveAction(null)} onChooseAction={(action) => setActiveAction((current) => ({ ...current, action }))} onSubmit={submit}/></main>;
}
export default ExaminationCell;
