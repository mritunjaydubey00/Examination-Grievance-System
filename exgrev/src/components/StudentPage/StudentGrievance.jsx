import { useEffect, useState } from "react";
import { confirmGrievanceResolution } from "../../services/grievanceService.js";
import {
  getGrievanceStatusLabel,
  isAutoResolved,
  isResolutionWindowOpen,
} from "../../lib/grievanceStatus.js";
import GrievanceTimeline from "./GrievanceTimeline.jsx";
import SupportingDocuments from "./SupportingDocuments.jsx";

function StudentGrievance({
  grievance,
  onOpenThread,
  onRefresh,
  onSubmitNewGrievance,
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const windowOpen = isResolutionWindowOpen(grievance, now);
  const autoResolved = isAutoResolved(grievance, now);
  const expiresAt = Date.parse(grievance.window_expires_at || "");
  const secondsLeft = windowOpen
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;
  const countdown = [
    Math.floor(secondsLeft / 3600),
    Math.floor((secondsLeft % 3600) / 60),
    secondsLeft % 60,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  useEffect(() => {
    if (!grievance.window_expires_at || !grievance.resolution_pending) {
      return undefined;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [grievance.resolution_pending, grievance.window_expires_at]);

  async function handleConfirmResolution() {
    setConfirming(true);
    setConfirmationError("");
    try {
      await confirmGrievanceResolution(grievance.id);
      await onRefresh();
    } catch (error) {
      setConfirmationError(
        error.message || "Could not confirm the proposed resolution.",
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <article className="student-grievance student-history-card">
      <div className="student-grievance-heading">
        <div>
          <strong>{grievance.grievance_code || "ID pending"}</strong>
          <h4>{grievance.subject}</h4>
        </div>
        <span
          className={`admin-status admin-status-${grievance.status.toLowerCase().replaceAll(" ", "-")}`}
        >
          {getGrievanceStatusLabel(grievance, "student")}
        </span>
      </div>
      <p>
        {grievance.problem_category} · {grievance.problem_type}
      </p>
      <button
        type="button"
        className="thread-open-button"
        onClick={() => onOpenThread(grievance)}
      >
        Open grievance thread
      </button>
      {windowOpen && (
        <div className="student-resolution-confirmation">
          <p>
            Respond within 48 hours. Time remaining:{" "}
            <strong aria-live="polite">{countdown}</strong>
          </p>
          {grievance.resolution_remark && (
            <p>{grievance.resolution_remark}</p>
          )}
          <div className="student-resolution-actions">
            <button
              type="button"
              className="admin-confirm-button is-resolve"
              disabled={confirming}
              onClick={handleConfirmResolution}
            >
              {confirming ? "Accepting…" : "Accept Resolution"}
            </button>
            <button
              type="button"
              className="admin-confirm-button is-forward"
              onClick={() => onOpenThread(grievance)}
            >
              Add Remark / Continue
            </button>
          </div>
          {confirmationError && (
            <p role="alert" className="grievance-message">
              {confirmationError}
            </p>
          )}
        </div>
      )}
      {autoResolved && (
        <div className="student-resolution-confirmation" role="status">
          <p>
            The 48-hour response window has ended. If you are still not
            satisfied, please submit a new grievance.
          </p>
          <button
            type="button"
            className="admin-confirm-button is-forward"
            onClick={onSubmitNewGrievance}
          >
            Submit New Grievance
          </button>
        </div>
      )}
      <GrievanceTimeline events={grievance.grievance_events || []} />
      <SupportingDocuments documents={grievance.supporting_documents || []} />
    </article>
  );
}

export default StudentGrievance;
