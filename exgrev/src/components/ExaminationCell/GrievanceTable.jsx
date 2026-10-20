function GrievanceTable({
  grievances,
  onAction,
  onOpenThread,
  audience = "examination-cell",
}) {
  const isTeachingStaff = audience === "teaching-staff";
  const heading = isTeachingStaff ? "Cases assigned to you" : "All grievances";
  const eyebrow = isTeachingStaff ? "Faculty review" : "Case management";
  const identifierHeading = isTeachingStaff ? "Student" : "Roll number";

  return (
    <section className="admin-case-panel">
      <div className="admin-case-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{heading}</h3>
        </div>
        <span className="admin-case-count">{grievances.length} cases</span>
      </div>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              {[
                "Grievance ID",
                identifierHeading,
                "Subject",
                "Created",
                "Category",
                "Problem type",
                "Status",
                "",
              ].map((heading) => (
                <th key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grievances.length ? (
              grievances.map((grievance) => (
                <tr key={grievance.id}>
                  <td>
                    <strong className="admin-case-id">
                      {grievance.grievance_code || "ID pending"}
                    </strong>
                  </td>
                  <td>
                    {isTeachingStaff && (
                      <strong>{grievance.student_name}</strong>
                    )}
                    {grievance.student_user_id}
                  </td>
                  <td>{grievance.subject}</td>
                  <td>{new Date(grievance.created_at).toLocaleString()}</td>
                  <td>{grievance.problem_category}</td>
                  <td>{grievance.problem_type}</td>
                  <td>
                    <span className="admin-status">
                      {grievance.resolution_pending
                        ? "Awaiting student confirmation"
                        : grievance.status}
                    </span>
                  </td>
                  <td className="admin-actions-cell">
                    <button
                      type="button"
                      className="admin-action-button admin-forward-button"
                      onClick={() => onOpenThread(grievance)}
                    >
                      Thread
                    </button>
                    <button
                      type="button"
                      className="admin-action-button admin-forward-button"
                      onClick={() => onAction(grievance, "view")}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="admin-empty-state" colSpan="8">
                  <strong>
                    {isTeachingStaff
                      ? "No assigned cases to display."
                      : "No matching grievances"}
                  </strong>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export default GrievanceTable;
