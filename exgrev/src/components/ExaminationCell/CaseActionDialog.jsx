import { useEffect, useState } from "react";

const facultyOptions = [
  "Prof. Rajesh Verma",
  "Prof. Ananya Sen",
  "Dr. Meenakshi Sundaram",
];

function CaseActionDialog({ grievance, action, onClose, onSubmit }) {
  const [faculty, setFaculty] = useState(grievance?.assignedFaculty || "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!grievance || !action) return null;
  const isForwarding = action === "forward";

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ faculty, notes });
  }

  return (
    <div
      className="admin-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
      >
        <button
          type="button"
          className="admin-dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
        <p className="eyebrow">
          {isForwarding ? "Faculty assignment" : "Official decision"}
        </p>
        <h3 id="admin-dialog-title">
          {isForwarding ? "Forward case" : "Resolve grievance"}
        </h3>
        <div className="admin-dialog-summary">
          <strong>
            {grievance.id}: {grievance.title}
          </strong>
          <span>
            {grievance.studentName} · {grievance.studentId}
          </span>
          <span>{grievance.subject}</span>
        </div>
        <form className="admin-dialog-form" onSubmit={handleSubmit}>
          {isForwarding && (
            <label className="form-field">
              <span>Assign subject faculty</span>
              <select
                value={faculty}
                onChange={(event) => setFaculty(event.target.value)}
                required
              >
                <option value="">Select faculty member</option>
                {facultyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="form-field">
            <span>
              {isForwarding ? "Instructions for faculty" : "Resolution remarks"}
            </span>
            <textarea
              rows="4"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={
                isForwarding
                  ? "Explain what should be reviewed."
                  : "Record the official resolution."
              }
              required
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
              type="submit"
              className={`admin-confirm-button ${isForwarding ? "is-forward" : "is-resolve"}`}
            >
              {isForwarding ? "Forward case" : "Mark resolved"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CaseActionDialog;
