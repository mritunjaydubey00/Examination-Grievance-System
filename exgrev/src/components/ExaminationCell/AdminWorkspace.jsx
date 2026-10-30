import GrievanceTable from "./GrievanceTable.jsx";

const statusOptions = ["New", "In Progress", "Resolved", "Over Due"];

function AdminWorkspace({
  grievances,
  loading,
  error,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAction,
  onOpenThread,
  audience = "examination-cell",
}) {
  return (
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
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search student, roll number, case, or subject"
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
      <GrievanceTable
        grievances={grievances}
        loading={loading}
        error={error}
        onAction={onAction}
        onOpenThread={onOpenThread}
        audience={audience}
      />
    </section>
  );
}

export default AdminWorkspace;
