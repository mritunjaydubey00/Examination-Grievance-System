import "./PortalHero.css";
import ThemeToggle from "./ThemeToggle.jsx";

function PortalHero({
  eyebrow,
  title,
  context,
  session,
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
      </div>
    </header>
  );
}

export default PortalHero;
