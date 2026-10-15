function StudentHeader({ session, onLogout }) {
  return (
    <header className="student-header">
      <div>
        <p className="eyebrow">Student portal</p>
        <h2>Welcome, {session.name}</h2>
        <p className="student-context">
          {session.branch} <span>/</span> {session.department}
        </p>
      </div>
      <div className="student-header-actions">
        <div className="session-status">
          <span className="status-dot" />
          Session active <strong>{session.uptimeSeconds}s</strong>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

export default StudentHeader;
