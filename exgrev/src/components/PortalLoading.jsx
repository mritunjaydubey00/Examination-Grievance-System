import "./PortalLoading.css";

function PortalLoading({ label = "Loading your page" }) {
  return (
    <div className="portal-loading" role="status" aria-live="polite">
      <div className="portal-loading-content">
        <div className="portal-loading-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <strong className="portal-loading-brand">ExGrev</strong>
        <span className="portal-loading-label">{label}</span>
      </div>
    </div>
  );
}

export default PortalLoading;
