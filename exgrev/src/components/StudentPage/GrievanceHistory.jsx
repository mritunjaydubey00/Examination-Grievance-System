import StudentGrievance from "./StudentGrievance.jsx";

function GrievanceHistory({
  grievances,
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
      {grievances.length ? (
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
