import { useEffect, useRef, useState } from "react";
import { listContent } from "../services/contentService.js";
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

const roleExtras = {
  student: ["Question Papers & Answer Keys"],
  faculty: [],
  "exam-cell": ["Question Papers & Answer Keys"],
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
  const extraLinks = roleExtras[role] || [];

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
        {extraLinks.map((item) => (
          <button
            type="button"
            key={item}
            className={`portal-nav-link${activePage === item ? " is-active" : ""}`}
            onClick={() => navigateTo(item)}
          >
            {item}
          </button>
        ))}
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
  const [notices, setNotices] = useState([]);
  const [guidelines, setGuidelines] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([listContent("notice"), listContent("guideline")])
      .then(([noticeRows, guidelineRows]) => {
        if (active) {
          setNotices(noticeRows.slice(0, 5));
          setGuidelines(guidelineRows.slice(0, 5));
        }
      })
      .finally(() => {
        if (active) setContentLoading(false);
      });
    return () => { active = false; };
  }, []);
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
              <span className="portal-add-button" aria-label="Manage notices from the Notice Board page">Manage</span>
            )}
          </div>
          {contentLoading ? (
            <p role="status">Loading notices…</p>
          ) : notices.length ? (
            <ul className="portal-placeholder-list">
              {notices.map((item) => <li key={item.id}><strong>{item.title}</strong><br />{item.content}</li>)}
            </ul>
          ) : (
            <p>No notices yet</p>
          )}
        </section>
        <section className="portal-info-card" aria-labelledby="dashboard-guidelines">
          <div className="portal-card-heading">
            <div>
              <p className="eyebrow">Reference</p>
              <h3 id="dashboard-guidelines">Guidelines</h3>
            </div>
            {canEditContent && (
              <span className="portal-add-button" aria-label="Manage guidelines from the Guidelines page">Manage</span>
            )}
          </div>
          {contentLoading ? (
            <p role="status">Loading guidelines…</p>
          ) : guidelines.length ? (
            <ul className="portal-placeholder-list">
              {guidelines.map((item) => <li key={item.id}><strong>{item.title}</strong><br />{item.content}</li>)}
            </ul>
          ) : (
            <p>No guidelines yet</p>
          )}
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
