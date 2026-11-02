import { useEffect, useState } from "react";
import { getGrievanceStatusLabel } from "../../lib/grievanceStatus.js";

function StudentGrievance({ grievance, onOpenThread }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!grievance.window_expires_at || !grievance.resolution_pending) {
      return undefined;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [grievance.resolution_pending, grievance.window_expires_at]);

  return (
    <article
      className="student-grievance student-history-card"
      aria-label={`Grievance ${grievance.grievance_code || "ID pending"}`}
    >
      <div className="student-grievance-row">
        <span
          className={`admin-status admin-status-${grievance.status.toLowerCase().replaceAll(" ", "-")}`}
        >
          {getGrievanceStatusLabel(grievance, "student", now)}
        </span>
        <button
          type="button"
          className="thread-open-button"
          aria-label={`Open thread for grievance ${grievance.grievance_code || "ID pending"}`}
          onClick={() => onOpenThread(grievance)}
        >
          Open thread
        </button>
      </div>
    </article>
  );
}

export default StudentGrievance;
