import GrievanceTimeline from "./GrievanceTimeline.jsx";
import SupportingDocuments from "./SupportingDocuments.jsx";

function StudentGrievance({ grievance }) {
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
      <SupportingDocuments documents={grievance.supporting_documents || []} />
    </article>
  );
}

export default StudentGrievance;
