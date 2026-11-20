import GrievanceTable from "./GrievanceTable.jsx";

const statusOptions = ["New", "In Progress", "Resolved", "Over Due"];

function AdminWorkspace({
  grievances,
  loading,
  error,
  filters = {},
  filterOptions = { departments: [], admissionYears: [] },
  categories = [],
  onFilterChange,
  onClearFilters,
  totalCount = 0,
  page = 1,
  pageSize = 25,
  onPageChange,
  onAction,
  onOpenThread,
  selectedGrievances = [],
  onToggleSelection,
  suggestions = [],
  onGroupSelected,
  onToggleSuggestion,
  pendingGroups = [],
  onResumeGroup,
  audience = "examination-cell",
}) {
  const canGroup = audience === "examination-cell";
  return (
    <section
      className="admin-workspace"
      aria-label="Grievance administration"
    >
      <div className="admin-toolbar">
        {canGroup && (
          <button
            type="button"
            className="admin-action-button admin-forward-button"
            onClick={onGroupSelected}
            disabled={selectedGrievances.length < 2}
          >
            Group as Similar ({selectedGrievances.length})
          </button>
        )}
        <label className="admin-search-field">
          <span className="visually-hidden">Search grievances</span>
          <input
            type="search"
            value={filters.search || ""}
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder="Search student, roll number, case, or subject"
          />
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Filter by department</span>
          <select
            value={filters.department || ""}
            onChange={(event) => onFilterChange("department", event.target.value)}
          >
            <option value="">All departments</option>
            {filterOptions.departments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Filter by study year or admission batch</span>
          <select
            value={filters.year || ""}
            onChange={(event) => onFilterChange("year", event.target.value)}
          >
            <option value="">All years / batches</option>
            {[1, 2, 3, 4].map((year) => (
              <option key={year} value={`study:${year}`}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year</option>
            ))}
            <option value="passed">Passed out</option>
            <option value="unknown">Unknown year</option>
            {filterOptions.admissionYears.map((year) => (
              <option key={year} value={`admission:${year}`}>Admission batch {year}</option>
            ))}
          </select>
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Filter by status</span>
          <select
            value={filters.status || "ALL"}
            onChange={(event) => onFilterChange("status", event.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Filter by category</span>
          <select
            value={filters.category || ""}
            onChange={(event) => onFilterChange("category", event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Created on or after</span>
          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(event) => onFilterChange("dateFrom", event.target.value)}
          />
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Created on or before</span>
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={(event) => onFilterChange("dateTo", event.target.value)}
          />
        </label>
        <button
          type="button"
          className="admin-action-button admin-forward-button"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </div>
      <p className="admin-filter-result-count">
        {totalCount} matching grievance{totalCount === 1 ? "" : "s"}
      </p>
      {canGroup && pendingGroups.length > 0 && (
        <section
          className="pending-grievance-groups"
          aria-label="Grouped solutions awaiting forwarding"
        >
          <strong>Grouped solutions awaiting forwarding</strong>
          {pendingGroups.map((pendingGroup) => (
            <p key={pendingGroup.id}>
              {pendingGroup.name} ·{" "}
              {pendingGroup.master.grievance_code || "Master grievance"}
              <button
                type="button"
                className="admin-action-button admin-forward-button"
                onClick={() => onResumeGroup(pendingGroup.id)}
              >
                Review forwarding
              </button>
            </p>
          ))}
        </section>
      )}
      {canGroup && suggestions.length > 0 && (
        <section className="similar-grievance-suggestions" aria-label="Suggested similar grievances">
          <strong>Suggested similar grievances</strong>
          <ul>
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedGrievances.some(
                      ({ id }) => id === suggestion.id,
                    )}
                    onChange={() => onToggleSuggestion(suggestion)}
                  />
                  <span>
                    {suggestion.grievance_code || "ID pending"} ·{" "}
                    {suggestion.title || suggestion.subject} ·{" "}
                    {suggestion.department || "Unknown department"}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
      <GrievanceTable
        grievances={grievances}
        loading={loading}
        error={error}
        onAction={onAction}
        onOpenThread={onOpenThread}
        selectedIds={selectedGrievances.map(({ id }) => id)}
        onToggleSelection={onToggleSelection}
        audience={audience}
      />
      {totalCount > pageSize && (
        <div className="admin-pagination" aria-label="Grievance pages">
          <button
            type="button"
            className="admin-action-button admin-forward-button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(totalCount / pageSize)}
          </span>
          <button
            type="button"
            className="admin-action-button admin-forward-button"
            disabled={page >= Math.ceil(totalCount / pageSize)}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}

export default AdminWorkspace;
