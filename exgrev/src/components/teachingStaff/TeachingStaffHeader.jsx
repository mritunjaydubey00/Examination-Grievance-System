function TeachingStaffHeader({ session, onLogout }) {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">Teaching staff portal</p>
        <h2>Assigned grievances</h2>
        <p className="admin-header-description">
          Review assigned cases and share updates with the student and
          Examination Cell.
        </p>
      </div>
      <div className="admin-header-actions">
        <div className="admin-identity">
          <span className="admin-identity-mark" aria-hidden="true">
            TS
          </span>
          <span>
            <strong>{session.name || "Teaching staff"}</strong>
            <small>{session.department || "Department not set"}</small>
          </span>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

export default TeachingStaffHeader;
