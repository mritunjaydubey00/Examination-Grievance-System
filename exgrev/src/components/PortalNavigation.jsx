import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase.js";
import { listInAppNotifications } from "../services/grievanceService.js";
import {
  deletePortalContent,
  listPortalContent,
  savePortalContent,
  setPortalContentActive,
} from "../services/portalContentService.js";
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
  onMetricClick,
  onAddGrievance,
  userId,
}) {
  const [dashboardNotices, setDashboardNotices] = useState([]);
  const [dashboardGuidelines, setDashboardGuidelines] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [contentError, setContentError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const audienceLabel =
    role === "student"
      ? "Your grievance overview"
      : role === "faculty"
        ? "Grievances received from the Examination Cell"
        : "Overall grievance overview";

  const loadDashboardContent = useCallback(async () => {
    try {
      const [notices, guidelines] = await Promise.all([
        listPortalContent("notices", { limit: 3 }),
        listPortalContent("guidelines", { limit: 3 }),
      ]);
      setDashboardNotices(notices);
      setDashboardGuidelines(guidelines);
      setContentError("");
    } catch (error) {
      setContentError(error.message || "Could not load notices and guidelines.");
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setNotifications(await listInAppNotifications(userId));
      setNotificationError("");
    } catch (error) {
      setNotificationError(error.message || "Could not load notifications.");
    }
  }, [userId]);

  useEffect(() => {
    loadDashboardContent();
    const channel = supabase
      .channel(`portal-content-${role}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notices" },
        loadDashboardContent,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guidelines" },
        loadDashboardContent,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardContent, role]);

  useEffect(() => {
    if (!userId) return undefined;
    loadNotifications();
    const channel = supabase
      .channel(`portal-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "in_app_notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        loadNotifications,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, userId]);

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
          </div>
          <PortalContentPreview
            items={dashboardNotices}
            error={contentError}
            empty="No notices yet."
          />
        </section>
        <section className="portal-info-card" aria-labelledby="dashboard-guidelines">
          <div className="portal-card-heading">
            <div>
              <p className="eyebrow">Reference</p>
              <h3 id="dashboard-guidelines">Guidelines</h3>
            </div>
          </div>
          <PortalContentPreview
            items={dashboardGuidelines}
            error={contentError}
            empty="No guidelines yet."
          />
        </section>
        <section className="portal-info-card" aria-labelledby="dashboard-notifications">
          <div className="portal-card-heading">
            <div>
              <p className="eyebrow">Updates</p>
              <h3 id="dashboard-notifications">Notifications</h3>
            </div>
          </div>
          {notificationError ? (
            <p className="portal-content-error" role="alert">
              {notificationError}
            </p>
          ) : notifications.length ? (
            <ul className="portal-notification-list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <strong>{notification.title}</strong>
                  <p>{notification.content}</p>
                  <time dateTime={notification.created_at}>
                    {new Date(notification.created_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="portal-placeholder-message">No notifications yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function PortalContentPreview({ items, error, empty }) {
  if (error) {
    return (
      <p className="portal-content-error" role="alert">
        {error}
      </p>
    );
  }
  if (!items.length) {
    return <p className="portal-placeholder-message">{empty}</p>;
  }
  return (
    <ul className="portal-placeholder-list">
      {items.map((item) => (
        <li key={item.id}>
          <strong>{item.title}</strong>
          <p>{item.content}</p>
          {item.attachment_signed_url && (
            <a href={item.attachment_signed_url} target="_blank" rel="noreferrer">
              {item.attachment_name || "View attachment"}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function getLocalDateTimeValue(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function PortalPlaceholderPage({ page, canEditContent, userId }) {
  const isGuidelines = page === "Guidelines";
  const isNoticeBoard = page === "Notice Board";
  const kind = isGuidelines ? "guidelines" : "notices";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await listPortalContent(kind, { includeInactive: canEditContent }),
      );
      setError("");
    } catch (loadError) {
      setError(loadError.message || `Could not load ${kind}.`);
    } finally {
      setLoading(false);
    }
  }, [canEditContent, kind]);

  useEffect(() => {
    if (isGuidelines || isNoticeBoard) refresh();
  }, [isGuidelines, isNoticeBoard, refresh]);

  if (!isGuidelines && !isNoticeBoard) return null;

  const localDateTimeValue = getLocalDateTimeValue(editingItem?.expires_at);

  function startEditing(item = null) {
    setEditingItem(item);
    setFormOpen(true);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const file = form.get("attachment");
    try {
      await savePortalContent({
        kind,
        id: editingItem?.id,
        userId,
        title: form.get("title"),
        content: form.get("content"),
        isActive: form.get("is_active") === "on",
        expiresAt: form.get("expires_at"),
        file: file?.size ? file : null,
      });
      setFormOpen(false);
      setEditingItem(null);
      await refresh();
    } catch (saveError) {
      setError(saveError.message || `Could not save ${kind}.`);
    } finally {
      setSaving(false);
    }
  }

  async function handleActiveToggle(item) {
    try {
      await setPortalContentActive(kind, item.id, !item.is_active);
      await refresh();
    } catch (changeError) {
      setError(changeError.message || "Could not update visibility.");
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) {
      return;
    }
    try {
      await deletePortalContent(kind, item);
      await refresh();
    } catch (deleteError) {
      setError(deleteError.message || `Could not delete ${kind}.`);
    }
  }

  return (
    <section className="portal-placeholder-page portal-content-page">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Portal</p>
          <h3>{page}</h3>
          <p>
            {isGuidelines
              ? "Published guidance for students and staff."
              : "Important examination and grievance announcements."}
          </p>
        </div>
        {canEditContent && (
          <button
            type="button"
            className="portal-add-button"
            onClick={() => startEditing()}
          >
            Add New
          </button>
        )}
      </div>
      {error && (
        <p className="portal-content-error" role="alert">
          {error}
        </p>
      )}
      {formOpen && (
        <form
          className="portal-info-card portal-content-form"
          onSubmit={handleSubmit}
        >
          <h4>
            {editingItem ? "Edit" : "Add"}{" "}
            {isGuidelines ? "guideline" : "notice"}
          </h4>
          <label>
            Title
            <input
              name="title"
              type="text"
              maxLength="200"
              required
              defaultValue={editingItem?.title || ""}
            />
          </label>
          <label>
            Content
            <textarea
              name="content"
              rows="5"
              required
              defaultValue={editingItem?.content || ""}
            />
          </label>
          {isNoticeBoard && (
            <label>
              Expiration (optional)
              <input
                name="expires_at"
                type="datetime-local"
                defaultValue={localDateTimeValue}
              />
            </label>
          )}
          <label>
            Attachment (optional PDF or image)
            <input
              name="attachment"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
            />
            {editingItem?.attachment_signed_url && (
              <a
                href={editingItem.attachment_signed_url}
                target="_blank"
                rel="noreferrer"
              >
                Current attachment: {editingItem.attachment_name || "View"}
              </a>
            )}
          </label>
          <label className="portal-content-active-toggle">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={editingItem?.is_active ?? true}
            />
            Visible to students and faculty
          </label>
          <div className="profile-actions">
            <button
              type="button"
              className="profile-secondary-button"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="portal-add-button"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <p className="portal-placeholder-message" role="status">
          Loading {kind}…
        </p>
      ) : items.length ? (
        <div className="portal-content-items">
          {items.map((item) => (
            <article className="portal-info-card" key={item.id}>
              <div className="portal-content-item-heading">
                <div>
                  <h4>{item.title}</h4>
                  <small>{new Date(item.created_at).toLocaleString()}</small>
                </div>
                {!item.is_active && (
                  <span className="portal-content-hidden">Hidden</span>
                )}
              </div>
              <p>{item.content}</p>
              {item.attachment_signed_url && (
                <a
                  href={item.attachment_signed_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.attachment_name || "View attachment"}
                </a>
              )}
              {canEditContent && (
                <div className="profile-actions">
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={() => startEditing(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={() => handleActiveToggle(item)}
                  >
                    {item.is_active ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={() => handleDelete(item)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className="portal-info-card">
          <p className="portal-placeholder-message">
            No {isGuidelines ? "guidelines" : "notices"} yet.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export { PortalDashboard, PortalPlaceholderPage, PortalSidePanel };
