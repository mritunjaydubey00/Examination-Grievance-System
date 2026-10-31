import StudentGrievance from "./StudentGrievance.jsx";

function GrievanceHistory({
  grievances,
  onOpenThread,
  onRefresh,
  onSubmitNewGrievance,
}) {
  return (
    <section
      className="grievance-panel student-history"
      aria-labelledby="history-title"
    >
      <div className="panel-intro">
        <p className="eyebrow">Updates</p>
        <h3 id="history-title">My grievances</h3>
        <p>
          Follow assignment, status, and resolution updates as they happen.
        </p>
        <p className="resolution-window-note">
          When the Exam Cell marks a grievance resolved, you have 48 hours to
          accept the resolution or continue the grievance with a remark.
        </p>
      </div>
      {grievances.length ? (
        grievances.map((grievance) => (
          <StudentGrievance
            key={grievance.id}
            grievance={grievance}
            onOpenThread={onOpenThread}
            onRefresh={onRefresh}
            onSubmitNewGrievance={onSubmitNewGrievance}
          />
        ))
      ) : (
        <p>No grievances submitted yet.</p>
      )}
    </section>
  );
}

export default GrievanceHistory;
