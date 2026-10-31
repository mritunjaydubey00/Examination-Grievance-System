import { useState } from "react";
import "./PortalNavigation.css";

const grievanceLinks = {
  student: ["Add New", "Your Grievances"],
  faculty: ["Active Grievances", "Resolved Grievances"],
  "exam-cell": ["Active Grievances", "Resolved Grievances"],
};

function PortalSidePanel({ role, activePage, onNavigate, onLogout }) {
  const [grievancesExpanded, setGrievancesExpanded] = useState(false);
  const links = grievanceLinks[role];

  return (
    <aside className="portal-sidebar" aria-label="Portal navigation">
      <nav>
        <button
          type="button"
          className={`portal-nav-link${activePage === "Dashboard" ? " is-active" : ""}`}
          onClick={() => onNavigate("Dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={`portal-nav-link${links.includes(activePage) ? " is-active" : ""}`}
          aria-expanded={grievancesExpanded}
          onClick={() => setGrievancesExpanded((expanded) => !expanded)}
        >
          <span>Grievances</span>
          <span className="portal-nav-chevron" aria-hidden="true">
            {grievancesExpanded ? "−" : "+"}
          </span>
        </button>
        {grievancesExpanded && (
          <div className="portal-subnav">
            {links.map((link) => (
              <button
                type="button"
                key={link}
                className={`portal-nav-link portal-subnav-link${activePage === link ? " is-active" : ""}`}
                onClick={() => onNavigate(link)}
              >
                {link}
              </button>
            ))}
          </div>
        )}
        {["Guidelines", "Profile", "Notice Board"].map((item) => (
          <button
            type="button"
            key={item}
            className={`portal-nav-link${activePage === item ? " is-active" : ""}`}
            onClick={() => onNavigate(item)}
          >
            {item}
          </button>
        ))}
        <button type="button" className="portal-nav-link" onClick={onLogout}>
          Logout
        </button>
      </nav>
    </aside>
  );
}

function PortalDashboard({ role, metrics, canEditContent }) {
  const audienceLabel =
    role === "student"
      ? "Your grievance overview"
      : role === "faculty"
        ? "Grievances received from the Examination Cell"
        : "Overall grievance overview";

  return (
    <section className="portal-dashboard" aria-label="Dashboard">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h3>{audienceLabel}</h3>
        </div>
      </div>
      <section className="admin-stats portal-stats" aria-label={audienceLabel}>
        {metrics.map((metric) => (
          <article
            className={`admin-stat admin-stat-${metric.tone}`}
            key={metric.label}
          >
            <span className="admin-stat-indicator" aria-hidden="true" />
            <div>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
            </div>
          </article>
        ))}
      </section>
      <div className="portal-dashboard-sections">
        <section className="portal-info-card" aria-labelledby="dashboard-notices">
          <div className="portal-card-heading">
            <div>
              <p className="eyebrow">Updates</p>
              <h3 id="dashboard-notices">Notice Board</h3>
            </div>
            {canEditContent && (
              <button type="button" className="portal-add-button" disabled>
                Add notice
              </button>
            )}
          </div>
          <ul className="portal-placeholder-list">
            {/* TODO: Replace notice placeholders with Notice Board content. */}
            <li>Examination grievance portal is open for submissions.</li>
            <li>Check your portal regularly for grievance updates.</li>
          </ul>
        </section>
        <section className="portal-info-card" aria-labelledby="dashboard-guidelines">
          <div className="portal-card-heading">
            <div>
              <p className="eyebrow">Reference</p>
              <h3 id="dashboard-guidelines">Guidelines</h3>
            </div>
            {canEditContent && (
              <button type="button" className="portal-add-button" disabled>
                Add guideline
              </button>
            )}
          </div>
          <ul className="portal-placeholder-list">
            {/* TODO: Replace guideline placeholders with published guidelines. */}
            <li>Provide clear details and relevant examination information.</li>
            <li>Attach supporting documents where applicable.</li>
          </ul>
        </section>
      </div>
    </section>
  );
}

function PortalPlaceholderPage({ page, canEditContent }) {
  const isGuidelines = page === "Guidelines";
  const isNoticeBoard = page === "Notice Board";
  const description =
    page === "Profile"
      ? "Your account information will be available here."
      : isGuidelines
        ? "Guidance and reference material will be listed here."
        : "Important portal announcements will be listed here.";

  return (
    <section className="portal-placeholder-page">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Portal</p>
          <h3>{page}</h3>
          <p>{description}</p>
        </div>
        {canEditContent && (isGuidelines || isNoticeBoard) && (
          <button type="button" className="portal-add-button" disabled>
            Add {isGuidelines ? "guideline" : "notice"}
          </button>
        )}
      </div>
      <div className="portal-info-card">
        <p className="portal-placeholder-message">
          Content will appear here when it is available.
        </p>
      </div>
    </section>
  );
}

export { PortalDashboard, PortalPlaceholderPage, PortalSidePanel };
