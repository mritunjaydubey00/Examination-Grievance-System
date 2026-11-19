import GrievanceTable from "./GrievanceTable.jsx";
import { useEffect, useMemo, useState } from "react";
import { grievanceCategoryOptions, grievanceSubCategories } from "../../data/grievanceCategories.js";
import { getStudyYear } from "../../config/enrollment.js";
import { createGrievanceGroup, forwardGrievanceGroupSolution, listActiveGroupsForMaster } from "../../services/grievanceService.js";

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
  autoForwardGrievance = null,
}) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState([]);
  const [masterId, setMasterId] = useState("");
  const [groupError, setGroupError] = useState("");
  const [forwardDialog, setForwardDialog] = useState(null);
  const [forwardMembers, setForwardMembers] = useState([]);

  useEffect(() => {
    if (autoForwardGrievance) {
      openForwardDialog(autoForwardGrievance);
    }
  }, [autoForwardGrievance]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") || "");
    setStatusFilter(params.get("status") || "ALL");
    setCategoryFilter(params.get("category") || "");
    setSubCategoryFilter(params.get("subCategory") || "");
    setDepartmentFilter(params.get("department") || "");
    setYearFilter(params.get("year") || "");
    setDateFrom(params.get("from") || "");
    setDateTo(params.get("to") || "");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (search) params.set("search", search); else params.delete("search");
    if (statusFilter !== "ALL") params.set("status", statusFilter); else params.delete("status");
    if (categoryFilter) params.set("category", categoryFilter); else params.delete("category");
    if (subCategoryFilter) params.set("subCategory", subCategoryFilter); else params.delete("subCategory");
    if (departmentFilter) params.set("department", departmentFilter); else params.delete("department");
    if (yearFilter) params.set("year", yearFilter); else params.delete("year");
    if (dateFrom) params.set("from", dateFrom); else params.delete("from");
    if (dateTo) params.set("to", dateTo); else params.delete("to");
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", params.toString() ? next : window.location.pathname);
    setPage(1);
  }, [search, statusFilter, categoryFilter, subCategoryFilter, departmentFilter, yearFilter, dateFrom, dateTo]);

  const departments = useMemo(() =>
    [...new Set(grievances.map((item) =>
      item.users?.Department || item.student_department || ""
    ).filter(Boolean))].sort(),
  [grievances]);

  const filtered = useMemo(() => grievances.filter((item) => {
    const itemCategory = item.category || item.problem_category;
    const itemSubCategory = item.sub_category || item.problem_type;
    const department = item.users?.Department || item.student_department || "";
    const studyYear = getStudyYear(item.student_user_id);
    const created = item.created_at?.slice(0, 10);
    return (!categoryFilter || itemCategory === categoryFilter)
      && (!subCategoryFilter || itemSubCategory === subCategoryFilter)
      && (!departmentFilter || department === departmentFilter)
      && (!yearFilter || (yearFilter === "Passed out" ? studyYear === "Passed out" : studyYear.startsWith(yearFilter)))
      && (!dateFrom || (created && created >= dateFrom))
      && (!dateTo || (created && created <= dateTo));
  }), [grievances, categoryFilter, subCategoryFilter, departmentFilter, yearFilter, dateFrom, dateTo]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function clearFilters() {
    onSearchChange("");
    onStatusFilterChange("ALL");
    setCategoryFilter("");
    setSubCategoryFilter("");
    setDepartmentFilter("");
    setYearFilter("");
    setDateFrom("");
    setDateTo("");
  }

  async function createGroup() {
    setGroupError("");
    if (selectedIds.length < 2) {
      setGroupError("Select at least two grievances.");
      return;
    }
    if (!masterId || !selectedIds.includes(masterId)) {
      setGroupError("Choose one selected grievance as the master.");
      return;
    }
    const name = window.prompt("Enter a name for this similar grievance group:");
    if (!name?.trim()) return;
    try {
      await createGrievanceGroup({
        name: name.trim(),
        masterGrievanceId: masterId,
        memberIds: selectedIds,
      });
      setSelectedIds([]);
      setMasterId("");
      setGroupError("Similar grievance group created.");
    } catch (error) {
      setGroupError(error.message || "Could not create the group.");
    }
  }

  async function openForwardDialog(grievance) {
    setGroupError("");
    if (!grievance.resolution_remark) {
      setGroupError("Resolve the master grievance before forwarding.");
      return;
    }
    try {
      const groups = await listActiveGroupsForMaster(grievance.id);
      if (!groups.length) {
        setGroupError("No active group is linked to this master grievance.");
        return;
      }
      const members = (groups[0].grievance_group_members || [])
        .map((member) => member.grievance_id)
        .filter((id) => id !== grievance.id && !groups[0].grievance_group_members.find((item) => item.grievance_id === id)?.removed_at);
      setForwardDialog({ group: groups[0], master: grievance });
      setForwardMembers(members);
    } catch (error) {
      setGroupError(error.message || "Could not load the group.");
    }
  }

  async function confirmForward() {
    try {
      await forwardGrievanceGroupSolution({
        groupId: forwardDialog.group.id,
        memberIds: forwardMembers,
        solutionText: forwardDialog.master.resolution_remark,
        attachments: forwardDialog.master.supporting_documents || [],
      });
      setForwardDialog(null);
      setGroupError("Grouped solution forwarded successfully.");
    } catch (error) {
      setGroupError(error.message || "Could not forward the grouped solution.");
    }
  }

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
        <label className="admin-filter-field">
          <span className="visually-hidden">Filter by category</span>
          <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setSubCategoryFilter(""); }}>
            <option value="">All categories</option>
            {grievanceCategoryOptions.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Filter by sub-category</span>
          <select value={subCategoryFilter} onChange={(event) => setSubCategoryFilter(event.target.value)} disabled={!categoryFilter}>
            <option value="">All sub-categories</option>
            {(grievanceSubCategories[categoryFilter] || []).map((subCategory) => <option key={subCategory}>{subCategory}</option>)}
          </select>
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Department</span>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department}>{department}</option>)}
          </select>
        </label>
        <label className="admin-filter-field">
          <span className="visually-hidden">Study year</span>
          <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
            <option value="">All years</option>
            {["1", "2", "3", "4", "Passed out"].map((year) => (
              <option key={year} value={year}>{year === "Passed out" ? year : `${year}${year === "1" ? "st" : year === "2" ? "nd" : year === "3" ? "rd" : "th"} year`}</option>
            ))}
          </select>
        </label>
        <label className="admin-filter-field">
          <span>From</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="admin-filter-field">
          <span>To</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <button type="button" className="thread-action-secondary" onClick={clearFilters}>Clear filters</button>
      </div>
      <div className="admin-case-heading">
        <span className="admin-case-count">{filtered.length} results</span>
        {selectedIds.length > 0 && (
          <div className="admin-actions-cell">
            <button type="button" className="admin-action-button" onClick={createGroup}>Group as Similar ({selectedIds.length})</button>
            {masterId && (
              <button type="button" className="admin-action-button" onClick={() => {
                const master = grievances.find((item) => item.id === masterId);
                if (master) openForwardDialog(master);
              }}>Forward from Master</button>
            )}
          </div>
        )}
      </div>
      {groupError && <p role="status" className="grievance-message">{groupError}</p>}
      {categoryFilter && subCategoryFilter && (
        <div className="portal-info-card">
          <strong>Suggested similar grievances:</strong>
          <div>
            {filtered.slice(0, 8).map((item) => (
              <label key={item.id} className="form-field">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={(event) => setSelectedIds((current) =>
                    event.target.checked
                      ? [...new Set([...current, item.id])]
                      : current.filter((id) => id !== item.id))}
                />
                {" "}{item.grievance_code || item.id} · {item.subject}
              </label>
            ))}
          </div>
          {selectedIds.length > 0 && (
            <label className="form-field">
              <span>Master grievance</span>
              <select value={masterId} onChange={(event) => setMasterId(event.target.value)}>
                <option value="">Choose master</option>
                {selectedIds.map((id) => {
                  const item = grievances.find((row) => row.id === id);
                  return <option key={id} value={id}>{item?.grievance_code || id} · {item?.subject}</option>;
                })}
              </select>
            </label>
          )}
        </div>
      )}
      <GrievanceTable
        grievances={paged}
        loading={loading}
        error={error}
        onAction={onAction}
        onOpenThread={onOpenThread}
        audience={audience}
      />
      <div className="form-footer">
        <button type="button" className="thread-action-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" className="thread-action-secondary" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>
      {forwardDialog && (
        <dialog open className="student-grievance-dialog" aria-label="Confirm grouped solution forwarding">
          <section className="grievance-form">
            <h3>Forward this same solution to {forwardMembers.length} other grievances?</h3>
            <p>{forwardDialog.master.resolution_remark}</p>
            {forwardMembers.map((id) => {
              const member = grievances.find((item) => item.id === id);
              return (
                <label key={id} className="form-field">
                  <input
                    type="checkbox"
                    checked={forwardMembers.includes(id)}
                    onChange={(event) => setForwardMembers((current) =>
                      event.target.checked ? [...current, id] : current.filter((memberId) => memberId !== id))}
                  />
                  {" "}{member?.grievance_code || id} · {member?.subject}
                </label>
              );
            })}
            <div className="form-footer">
              <button type="button" className="thread-action-secondary" onClick={() => setForwardDialog(null)}>Cancel</button>
              <button type="button" className="submit-button" onClick={confirmForward}>Confirm</button>
            </div>
          </section>
        </dialog>
      )}
    </section>
  );
}

export default AdminWorkspace;
