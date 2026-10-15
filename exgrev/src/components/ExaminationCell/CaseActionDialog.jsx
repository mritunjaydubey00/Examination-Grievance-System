import { useEffect, useState } from "react";
import GrievanceTimeline from "../StudentPage/GrievanceTimeline.jsx";
import SupportingDocuments from "../StudentPage/SupportingDocuments.jsx";
import CalendarDatePicker from "../CalendarDatePicker.jsx";
import { listAssignableUsers } from "../../services/grievanceService.js";

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CaseActionDialog({
  grievance,
  action,
  mode = "examination-cell",
  onClose,
  onSubmit,
  onChooseAction,
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchError, setUserSearchError] = useState("");
  const [faculty, setFaculty] = useState(null);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");

  const isViewing = action === "view";
  const isForwarding = action === "forward";
  const isRemark = action === "remark";
  const isResolving = action === "resolve";
  const isSubmittingRemark = isRemark || isResolving;
  const isResolutionPending = grievance?.resolution_pending;
  const isTeachingStaff = mode === "teaching-staff";

  useEffect(() => {
    setQuery("");
    setFaculty(null);
    setNotes("");
    setDueDate("");
    setPriority("medium");
  }, [grievance, action]);

  useEffect(() => {
    if (!isForwarding) return undefined;

    let isCurrentSearch = true;
    const timeout = window.setTimeout(async () => {
      setSearchingUsers(true);
      setUserSearchError("");
      try {
        const matches = await listAssignableUsers(query);
        if (isCurrentSearch) setUsers(matches);
      } catch (error) {
        if (isCurrentSearch) {
          setUsers([]);
          setUserSearchError(error.message || "Could not search staff.");
        }
      } finally {
        if (isCurrentSearch) setSearchingUsers(false);
      }
    }, 250);

    return () => {
      isCurrentSearch = false;
      window.clearTimeout(timeout);
    };
  }, [isForwarding, query]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!grievance || !action) return null;

  return (
    <div
      className="admin-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="admin-dialog admin-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
      >
        <button
          type="button"
          className="admin-dialog-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <p className="eyebrow">Grievance details</p>
        <h3 id="admin-dialog-title">
          {grievance.grievance_code || "ID pending"}: {grievance.subject}
        </h3>
        <dl className="grievance-detail-grid">
          <div>
            <dt>Student</dt>
            <dd>
              {grievance.student_name} · {grievance.student_user_id}
            </dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{grievance.users?.Department || "Not provided"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(grievance.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>
              {grievance.problem_category} · {grievance.problem_type}
            </dd>
          </div>
          <div>
            <dt>Status / priority</dt>
            <dd>
              {grievance.status} · {grievance.priority}
            </dd>
          </div>
          <div>
            <dt>Due date</dt>
            <dd>{grievance.due_date || "Not set"}</dd>
          </div>
          <div>
            <dt>Assigned faculty</dt>
            <dd>{grievance.assigned_faculty_name || "ExGrev Unforward"}</dd>
          </div>
          <div className="detail-description">
            <dt>Description</dt>
            <dd>{grievance.description}</dd>
          </div>
          {grievance.resolution_remark && (
            <div className="detail-description">
              <dt>Proposed resolution</dt>
              <dd>{grievance.resolution_remark}</dd>
            </div>
          )}
          {isResolutionPending && (
            <div className="detail-description">
              <dt>Resolution status</dt>
              <dd>Awaiting student confirmation</dd>
            </div>
          )}
        </dl>
        <GrievanceTimeline events={grievance.grievance_events || []} />
        <SupportingDocuments documents={grievance.supporting_documents || []} />
        {!isViewing && (
          <form
            className="admin-dialog-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit({ faculty, notes, dueDate, priority });
            }}
          >
            {isForwarding && (
              <>
                <label className="form-field">
                  <span>Forward to eligible teaching staff or Examination Cell</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setFaculty(null);
                      setUsers([]);
                      setSearchingUsers(true);
                      setUserSearchError("");
                    }}
                    placeholder="Search by name, email, or department"
                  />
                  <select
                    value={faculty?.account_identifier || ""}
                    onChange={(event) =>
                      setFaculty(
                        users.find(
                          (user) =>
                            user.account_identifier === event.target.value,
                        ) || null,
                      )
                    }
                    required
                    disabled={searchingUsers || users.length === 0}
                  >
                    <option value="">
                      {searchingUsers
                        ? "Searching staff…"
                        : users.length
                          ? "Choose a person"
                          : "No matching staff"}
                    </option>
                    {users.map((user) => (
                      <option
                        key={user.account_identifier}
                        value={user.account_identifier}
                      >
                        {user["Full Name"]} · {user["Ex Factor"]} ·{" "}
                        {user.email}
                      </option>
                    ))}
                  </select>
                  {userSearchError && (
                    <span role="alert" className="login-error">
                      {userSearchError}
                    </span>
                  )}
                </label>
                <label className="form-field">
                  <span>Due date (set by Examination Cell)</span>
                  <CalendarDatePicker
                    value={dueDate}
                    min={getTodayDateValue()}
                    onChange={setDueDate}
                  />
                </label>
                <label className="form-field">
                  <span>Priority</span>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    {["low", "medium", "high", "urgent"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="form-field">
              <span>
                {isForwarding
                  ? "Instructions (optional)"
                  : isRemark
                    ? "Remark for the student"
                    : "Proposed resolution"}
              </span>
              <textarea
                rows="4"
                required={!isForwarding}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={
                  isForwarding
                    ? "Explain what should be reviewed."
                    : isRemark
                      ? "Share an update or request more information."
                      : "Describe the resolution for the student's confirmation."
                }
              />
            </label>
            <div className="admin-dialog-footer">
              <button
                type="button"
                className="admin-cancel-button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className={`admin-confirm-button ${isSubmittingRemark ? "is-resolve" : "is-forward"}`}
                type="submit"
                disabled={isForwarding && (!faculty || searchingUsers)}
              >
                {isForwarding
                  ? "Forward grievance"
                  : isRemark
                    ? "Send remark"
                    : "Propose resolution"}
              </button>
            </div>
          </form>
        )}
        {isViewing && (
          <div className="admin-dialog-footer">
            <button
              type="button"
              className="admin-cancel-button"
              onClick={onClose}
            >
              Close
            </button>
            {isTeachingStaff &&
              grievance.status !== "Resolved" &&
              !isResolutionPending && (
                <button
                  type="button"
                  className="admin-confirm-button"
                  onClick={() => onChooseAction("remark")}
                >
                  Add remark
                </button>
              )}
            {!isTeachingStaff &&
              grievance.status !== "Resolved" &&
              !isResolutionPending && (
                <>
                  <button
                    type="button"
                    className="admin-confirm-button is-forward"
                    onClick={() => onChooseAction("forward")}
                  >
                    {grievance.status === "New" ? "Forward to" : "Reassign"}
                  </button>
                  <button
                    type="button"
                    className="admin-confirm-button"
                    onClick={() => onChooseAction("remark")}
                  >
                    Send remark
                  </button>
                  <button
                    type="button"
                    className="admin-confirm-button is-resolve"
                    onClick={() => onChooseAction("resolve")}
                  >
                    Resolve
                  </button>
                </>
              )}
            {isResolutionPending && (
              <p className="resolution-pending-notice">
                Waiting for the student to confirm the proposed resolution.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default CaseActionDialog;
