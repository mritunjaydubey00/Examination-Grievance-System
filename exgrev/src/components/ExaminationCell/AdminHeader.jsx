import AccountSecurityActions from "../AccountSecurityActions.jsx";

function AdminHeader({ session, onLogout, onChangePassword }) {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">Examination cell</p>
        <h2>Control panel</h2>
        <p className="admin-header-description">
          Review student cases, coordinate faculty evaluations, and manage
          official resolutions.
        </p>
      </div>
      <div className="admin-header-actions">
        <div className="admin-identity">
          <span className="admin-identity-mark" aria-hidden="true">
            EC
          </span>
          <span>
            <strong>{session.name || "Examination Cell Admin"}</strong>
            <small>{session.department || "Examination administration"}</small>
          </span>
        </div>
        <AccountSecurityActions onChangePassword={onChangePassword} />
        <button type="button" className="logout-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

export default AdminHeader;
