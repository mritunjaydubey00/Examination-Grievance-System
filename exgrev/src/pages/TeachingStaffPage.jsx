function TeachingStaffPage({ session, onLogout }) {
  return (
    <main className="student-page teaching-staff-page">
      <header className="student-header">
        <div>
          <p className="eyebrow">Teaching staff portal</p>
          <h2>Welcome, {session.name}</h2>
          <p className="student-context">
            {session.department || "Examination grievance review"}
          </p>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>
          Log out
        </button>
      </header>
      <section className="grievance-panel" aria-labelledby="staff-cases-title">
        <div className="panel-intro">
          <p className="eyebrow">Faculty review</p>
          <h3 id="staff-cases-title">Assigned examination grievances</h3>
          <p>Cases assigned to you by the Examination Cell will appear here.</p>
        </div>
        <div className="admin-empty-state staff-empty-state">
          <strong>No assigned cases to display</strong>
          <span>
            New assignments will be available here when grievance records are
            connected.
          </span>
        </div>
      </section>
    </main>
  );
}

export default TeachingStaffPage;
