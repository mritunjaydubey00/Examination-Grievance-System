import StudentGrievance from "./StudentGrievance.jsx";

function GrievanceHistory({
  grievances,
  loading = false,
  onOpenThread,
}) {
  return (
    <section
      className="grievance-panel student-history"
      aria-labelledby="history-title"
    >
      <div className="panel-intro">
        <p className="eyebrow">Updates</p>
        <h3 id="history-title">My grievances</h3>
        <p>Check a status or open a thread for details.</p>
      </div>
      {loading ? (
        <div className="grievance-history-skeletons" role="status" aria-label="Loading grievances">
          {[0, 1, 2].map((item) => (
            <div className="grievance-history-skeleton" key={item}>
              <span className="skeleton-loader grievance-skeleton-id" />
              <span className="skeleton-loader grievance-skeleton-title" />
              <span className="skeleton-loader grievance-skeleton-meta" />
              <span className="skeleton-loader grievance-skeleton-status" />
            </div>
          ))}
        </div>
      ) : grievances.length ? (
        grievances.map((grievance) => (
          <StudentGrievance
            key={grievance.id}
            grievance={grievance}
            onOpenThread={onOpenThread}
          />
        ))
      ) : (
        <p>No grievances submitted yet.</p>
      )}
    </section>
  );
}

export default GrievanceHistory;
