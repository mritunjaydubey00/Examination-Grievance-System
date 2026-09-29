import { useState } from "react";
import AdminHeader from "../components/ExaminationCell/AdminHeader.jsx";
import AdminStats from "../components/ExaminationCell/AdminStats.jsx";
import CaseActionDialog from "../components/ExaminationCell/CaseActionDialog.jsx";
import GrievanceTable from "../components/ExaminationCell/GrievanceTable.jsx";
import sampleGrievances from "../data/sampleGrievances.js";
import "./ExaminationCell.css";

function ExaminationCell({ session, onLogout }) {
  const [grievances, setGrievances] = useState(sampleGrievances);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeAction, setActiveAction] = useState(null);

  const filteredGrievances = grievances.filter((grievance) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        grievance.id,
        grievance.studentId,
        grievance.studentName,
        grievance.subject,
      ].some((value) => value.toLowerCase().includes(query));
    const matchesStatus =
      statusFilter === "ALL" || grievance.status === statusFilter;
    const matchesCategory =
      categoryFilter === "ALL" || grievance.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  function handleCaseAction(grievance, action) {
    setActiveAction({ grievance, action });
  }

  function handleActionSubmit({ faculty, notes }) {
    const { grievance, action } = activeAction;
    setGrievances((current) =>
      current.map((item) => {
        if (item.id !== grievance.id) return item;
        if (action === "forward") {
          return {
            ...item,
            status: "Under Progress",
            assignedFaculty: faculty,
            adminInstructions: notes,
          };
        }
        return { ...item, status: "Resolved", facultyRemarks: notes };
      }),
    );
    setActiveAction(null);
  }

  return (
    <main className="student-page examination-cell-page">
      <AdminHeader session={session} onLogout={onLogout} />
      <AdminStats grievances={grievances} />
      <section
        className="admin-workspace"
        aria-label="Grievance administration"
      >
        <div className="admin-toolbar">
          <label className="admin-search-field">
            <span className="visually-hidden">Search grievances</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, roll number, case, or subject"
            />
          </label>
          <label className="admin-filter-field">
            <span className="visually-hidden">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Progress">Under progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span className="visually-hidden">Filter by category</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="ALL">All categories</option>
              <option value="Re-evaluation">Re-evaluation</option>
              <option value="Marksheet Correction">Marksheet correction</option>
              <option value="Admit Card Issue">Admit card issue</option>
              <option value="Attendance Relief">Attendance relief</option>
              <option value="Other">Other</option>
            </select>
          </label>
        </div>
        <GrievanceTable
          grievances={filteredGrievances}
          onAction={handleCaseAction}
        />
      </section>
      <CaseActionDialog
        grievance={activeAction?.grievance}
        action={activeAction?.action}
        onClose={() => setActiveAction(null)}
        onSubmit={handleActionSubmit}
      />
    </main>
  );
}

export default ExaminationCell;
