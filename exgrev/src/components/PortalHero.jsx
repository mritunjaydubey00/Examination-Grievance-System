import "./PortalHero.css";
import ThemeToggle from "./ThemeToggle.jsx";

function PortalHero({
  eyebrow,
  title,
  context,
  session,
  onLogout,
  onBack,
}) {
  return (
    <header className="portal-hero">
      <div className="portal-hero-copy">
        {onBack && (
          <button type="button" className="portal-hero-back" onClick={onBack}>
            Back to grievances
          </button>
        )}
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {context && <p className="portal-hero-context">{context}</p>}
      </div>
      <div className="portal-hero-actions">
        <ThemeToggle />
        <div className="portal-hero-session">
          <span className="status-dot" />
          Session active{" "}
          <strong>{session.uptimeSeconds ?? 0}s</strong>
        </div>
        <button type="button" className="logout-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

export default PortalHero;
