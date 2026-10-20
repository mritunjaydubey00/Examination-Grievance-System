function TeachingStaffTable({ grievances, onOpenGrievance, onOpenThread }) {
  return (
    <section className="admin-case-panel">
      <div className="admin-case-heading">
        <div>
          <p className="eyebrow">Faculty review</p>
          <h3>Cases assigned to you</h3>
        </div>
        <span className="admin-case-count">{grievances.length} cases</span>
      </div>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Grievance ID</th>
              <th>Student</th>
              <th>Subject</th>
              <th>Created</th>
              <th>Category</th>
              <th>Problem type</th>
              <th>Status</th>
              <th aria-label="Actions" />
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
                    <strong>{grievance.student_name}</strong>
                    <small>{grievance.student_user_id}</small>
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
                      onClick={() => onOpenGrievance(grievance)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="admin-empty-state" colSpan="8">
                  <strong>No assigned cases to display.</strong>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TeachingStaffTable;
