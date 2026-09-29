const statusLabels = {
  Submitted: "Submitted",
  "Under Progress": "Forwarded",
  Resolved: "Resolved",
};

function GrievanceTable({ grievances, onAction }) {
  return (
    <section className="admin-case-panel" aria-labelledby="admin-cases-title">
      <div className="admin-case-heading">
        <div>
          <p className="eyebrow">Case management</p>
          <h3 id="admin-cases-title">All grievances</h3>
        </div>
        <span className="admin-case-count" aria-live="polite">
          {grievances.length} {grievances.length === 1 ? "case" : "cases"}
        </span>
      </div>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col">Student</th>
              <th scope="col">Category & subject</th>
              <th scope="col">Status & assignment</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {grievances.length ? (
              grievances.map((grievance) => (
                <tr key={grievance.id}>
                  <td>
                    <strong className="admin-case-id">{grievance.id}</strong>
                    <small>{grievance.createdAt}</small>
                  </td>
                  <td>
                    <strong>{grievance.studentName}</strong>
                    <small>
                      {grievance.studentId} · {grievance.branch}
                    </small>
                  </td>
                  <td>
                    <strong>{grievance.subject}</strong>
                    <small>{grievance.category}</small>
                  </td>
                  <td>
                    <span
                      className={`admin-status admin-status-${grievance.status === "Under Progress" ? "forwarded" : grievance.status.toLowerCase()}`}
                    >
                      {statusLabels[grievance.status] || grievance.status}
                    </span>
                    <small>
                      {grievance.assignedFaculty || "Awaiting review"}
                    </small>
                  </td>
                  <td className="admin-actions-cell">
                    {grievance.status === "Resolved" ? (
                      <span className="admin-closed-label">Closed</span>
                    ) : (
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-action-button admin-forward-button"
                          onClick={() => onAction(grievance, "forward")}
                        >
                          {grievance.status === "Under Progress"
                            ? "Reassign"
                            : "Forward"}
                        </button>
                        <button
                          type="button"
                          className="admin-action-button admin-resolve-button"
                          onClick={() => onAction(grievance, "resolve")}
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="admin-empty-state" colSpan="5">
                  <strong>No matching grievances</strong>
                  <span>Try changing the search or filters.</span>
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
