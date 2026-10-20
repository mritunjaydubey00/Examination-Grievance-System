import { useEffect, useState } from "react";
import GrievanceTimeline from "../StudentPage/GrievanceTimeline.jsx";
import SupportingDocuments from "../StudentPage/SupportingDocuments.jsx";

function TeachingStaffCaseDialog({
  grievance,
  mode,
  onClose,
  onAddRemark,
  onSubmitRemark,
}) {
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!grievance) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [grievance, onClose]);

  if (!grievance || !mode) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmitRemark(remark);
    } catch (submitError) {
      setError(submitError.message || "Could not send the remark.");
    } finally {
      setSaving(false);
    }
  }

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
        aria-labelledby="teaching-case-dialog-title"
      >
        <button
          type="button"
          className="admin-dialog-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <p className="eyebrow">Assigned grievance</p>
        <h3 id="teaching-case-dialog-title">
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
            <dd>{grievance.student_department}</dd>
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
          {grievance.resolution_pending && (
            <div className="detail-description">
              <dt>Resolution status</dt>
              <dd>Awaiting student confirmation</dd>
            </div>
          )}
        </dl>

        <GrievanceTimeline events={grievance.grievance_events || []} />
        <SupportingDocuments documents={grievance.supporting_documents || []} />

        {mode === "remark" ? (
          <form className="admin-dialog-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Remark for the student</span>
              <textarea
                rows="4"
                required
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                placeholder="Share an update or request more information."
              />
            </label>
            {error && (
              <p role="alert" className="login-error">
                {error}
              </p>
            )}
            <div className="admin-dialog-footer">
              <button
                type="button"
                className="admin-cancel-button"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-confirm-button is-forward"
                disabled={saving || !remark.trim()}
              >
                {saving ? "Sending…" : "Send remark"}
              </button>
            </div>
          </form>
        ) : (
          <div className="admin-dialog-footer">
            <button
              type="button"
              className="admin-cancel-button"
              onClick={onClose}
            >
              Close
            </button>
            {grievance.status !== "Resolved" &&
              !grievance.resolution_pending && (
                <button
                  type="button"
                  className="admin-confirm-button is-forward"
                  onClick={onAddRemark}
                >
                  Add remark
                </button>
              )}
            {grievance.resolution_pending && (
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

export default TeachingStaffCaseDialog;
