import TeachingStaffTable from "./TeachingStaffTable.jsx";

const statusOptions = ["New", "In Progress", "Resolved", "Over Due"];

function TeachingStaffWorkspace({
  grievances,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  notice,
  onOpenGrievance,
}) {
  return (
    <section className="admin-workspace" aria-label="Assigned grievances">
      <div className="admin-toolbar">
        <label className="admin-search-field">
          <span className="visually-hidden">Search assigned grievances</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search student, case, or subject"
          />
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      {notice && (
        <p role="status" className="grievance-message">
          {notice}
        </p>
      )}
      <TeachingStaffTable
        grievances={grievances}
        onOpenGrievance={onOpenGrievance}
      />
    </section>
  );
}

export default TeachingStaffWorkspace;
