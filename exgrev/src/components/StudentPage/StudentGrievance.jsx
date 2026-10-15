import { useState } from "react";
import { confirmGrievanceResolution } from "../../services/grievanceService.js";
import GrievanceTimeline from "./GrievanceTimeline.jsx";
import SupportingDocuments from "./SupportingDocuments.jsx";

function StudentGrievance({ grievance }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function handleConfirmResolution() {
    setConfirming(true);
    setConfirmationError("");
    try {
      await confirmGrievanceResolution(grievance.id);
      setConfirmed(true);
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
          {grievance.status}
        </span>
      </div>
      <p>
        {grievance.problem_category} · {grievance.problem_type}
      </p>
      <GrievanceTimeline events={grievance.grievance_events || []} />
      {grievance.resolution_pending && !confirmed && (
        <div className="student-resolution-confirmation">
          <p>
            The Examination Cell has proposed a resolution. Confirm below if
            your grievance has been resolved.
          </p>
          <button
            type="button"
            className="admin-confirm-button is-resolve"
            disabled={confirming}
            onClick={handleConfirmResolution}
          >
            {confirming ? "Confirming…" : "Confirm resolution"}
          </button>
          {confirmationError && (
            <p role="alert" className="grievance-message">
              {confirmationError}
            </p>
          )}
        </div>
      )}
      <SupportingDocuments documents={grievance.supporting_documents || []} />
    </article>
  );
}

export default StudentGrievance;
