import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./PortalNavigation.css";

const grievanceLinks = {
  student: ["Add New", "Your Grievances"],
  faculty: ["All Grievances", "Active Grievances", "Resolved Grievances"],
  "exam-cell": [
    "All Grievances",
    "Active Grievances",
    "Resolved Grievances",
  ],
};

function PortalSidePanel({
  role,
  activePage,
  onNavigate,
  onLogout,
  mobileMenuTarget,
}) {
  const [grievancesExpanded, setGrievancesExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarRef = useRef(null);
  const mobileNavigationRef = useRef(null);
  const menuButtonRef = useRef(null);
  const links = grievanceLinks[role];

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    function closeMenuOnOutsideClick(event) {
      if (
        !sidebarRef.current?.contains(event.target) &&
        !mobileNavigationRef.current?.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function closeMenuOnEscape(event) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [mobileMenuOpen]);

  function renderNavigation() {
    return (
      <>
        <button
          type="button"
          className={`portal-nav-link${activePage === "Dashboard" ? " is-active" : ""}`}
          onClick={() => navigateTo("Dashboard")}
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
                onClick={() => navigateTo(link)}
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
            onClick={() => navigateTo(item)}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          className="portal-nav-link"
          onClick={() => {
            setMobileMenuOpen(false);
            onLogout();
          }}
        >
          Logout
        </button>
      </>
    );
  }

  function navigateTo(page) {
    onNavigate(page);
    setMobileMenuOpen(false);
    if (window.matchMedia("(max-width: 680px)").matches) {
      menuButtonRef.current?.focus();
    }
  }

  return (
    <>
      <aside
        ref={sidebarRef}
        className="portal-sidebar"
        aria-label="Portal navigation"
      >
        <nav>{renderNavigation()}</nav>
      </aside>
      {mobileMenuTarget &&
        createPortal(
          <div
            ref={mobileNavigationRef}
            className={`portal-mobile-navigation${mobileMenuOpen ? " is-open" : ""}`}
          >
            <button
              ref={menuButtonRef}
              type="button"
              className="portal-mobile-menu-toggle"
              aria-expanded={mobileMenuOpen}
              aria-controls="portal-navigation-menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <span className="portal-mobile-menu-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              Menu
            </button>
            <nav id="portal-navigation-menu">{renderNavigation()}</nav>
          </div>,
          mobileMenuTarget,
        )}
    </>
  );
}

function PortalDashboard({
  role,
  metrics,
  canEditContent,
  onMetricClick,
  onAddGrievance,
}) {
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
        {role === "student" && onAddGrievance && (
          <button
            type="button"
            className="portal-dashboard-action"
            onClick={onAddGrievance}
          >
            + Submit a grievance
          </button>
        )}
      </div>
      <section className="admin-stats portal-stats" aria-label={audienceLabel}>
        {metrics.map((metric) =>
          onMetricClick ? (
            <button
              type="button"
              className={`admin-stat admin-stat-${metric.tone} portal-stat-button`}
              key={metric.label}
              onClick={() => onMetricClick(metric.key)}
            >
              <span className="admin-stat-indicator" aria-hidden="true" />
              <div>
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
              </div>
            </button>
          ) : (
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
          ),
        )}
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
            <li>
              After the Exam Cell marks a grievance resolved, respond within 48
              hours to accept or continue it.
            </li>
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
        {isGuidelines && (
          <p className="resolution-window-note">
            If the Exam Cell marks a grievance resolved, the student has 48
            hours to accept the resolution or continue the grievance.
          </p>
        )}
      </div>
    </section>
  );
}

export { PortalDashboard, PortalPlaceholderPage, PortalSidePanel };
