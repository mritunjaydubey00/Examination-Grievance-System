import {
  ArrowRight,
  Bell,
  BookOpen,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  deletePortalContent,
  listPortalContent,
  savePortalContent,
  setPortalContentPublished,
  subscribeToPortalContent,
} from "../services/portalContentService.js";

const dashboardStats = [
  { label: "Open grievances", value: "08" },
  { label: "Awaiting review", value: "03" },
  { label: "Resolved this month", value: "12" },
];

export function DashboardPage({ roleLabel, basePath }) {
  const [notices, setNotices] = useState([]);
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    async function refresh() {
      const request = ++latestRequest;
      try {
        const [noticeItems, guidelineItems] = await Promise.all([
          listPortalContent("notice", { limit: 3 }),
          listPortalContent("guideline", { limit: 3 }),
        ]);
        if (!active || request !== latestRequest) return;
        setNotices(noticeItems || []);
        setGuidelines(guidelineItems || []);
        setError("");
      } catch (loadError) {
        if (active && request === latestRequest) {
          setError(
            loadError.message || "Could not load notices and guidelines.",
          );
        }
      } finally {
        if (active && request === latestRequest) setLoading(false);
      }
    }

    refresh();
    const unsubscribe = subscribeToPortalContent(
      "dashboard-portal-content",
      refresh,
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <section className="portal-placeholder">
      <div className="portal-page-heading">
        <h2>Welcome to your dashboard</h2>
        <p>Here is a quick overview of your {roleLabel.toLowerCase()} portal.</p>
        <p>Sample overview · demo data</p>
      </div>
      <div className="portal-stats-grid">
        {dashboardStats.map((stat) => (
          <article className="portal-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <div className="portal-dashboard-content-grid">
        <DashboardContentCard
          title="Notice Board"
          description="Read the latest updates from the Examination Cell."
          emptyMessage="There are no published notices yet."
          items={notices}
          loading={loading}
          error={error}
          icon={Bell}
          to={`${basePath}/notices`}
        />
        <DashboardContentCard
          title="Guidelines"
          description="Review the guidance available for using the portal."
          emptyMessage="There are no published guidelines yet."
          items={guidelines}
          loading={loading}
          error={error}
          icon={BookOpen}
          to={`${basePath}/guidelines`}
        />
      </div>
    </section>
  );
}

function DashboardContentCard({
  title,
  description,
  emptyMessage,
  items,
  loading,
  error,
  icon: Icon,
  to,
}) {
  return (
    <article className="portal-content-card">
      <div className="portal-content-card-heading">
        <span className="portal-content-icon">
          <Icon aria-hidden="true" size={19} />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {loading ? (
        <p className="portal-empty-state" role="status">
          Loading…
        </p>
      ) : error ? (
        <p className="portal-content-error" role="alert">
          {error}
        </p>
      ) : items.length ? (
        <ul className="portal-dashboard-item-list">
          {items.slice(0, 2).map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="portal-empty-state">{emptyMessage}</p>
      )}
      <Link className="portal-inline-link" to={to}>
        View {title.toLowerCase()}
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </article>
  );
}

export function PortalContentPage({ title, contentType }) {
  const isGuideline = contentType === "guideline";
  const Icon = isGuideline ? BookOpen : Bell;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    async function refresh() {
      const request = ++latestRequest;
      try {
        const content = await listPortalContent(contentType);
        if (!active || request !== latestRequest) return;
        setItems(content || []);
        setError("");
      } catch (loadError) {
        if (active && request === latestRequest) {
          setError(
            loadError.message ||
              `Could not load ${isGuideline ? "guidelines" : "notices"}.`,
          );
        }
      } finally {
        if (active && request === latestRequest) setLoading(false);
      }
    }

    refresh();
    const unsubscribe = subscribeToPortalContent(
      `portal-content-page-${contentType}`,
      refresh,
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [contentType, isGuideline]);

  return (
    <section className="portal-placeholder">
      <div className="portal-page-heading">
        <h2>{title}</h2>
        <p>
          {isGuideline
            ? "Guidance for using the ExGrev portal."
            : "Updates for students and staff."}
        </p>
      </div>
      <div className="portal-content-list">
        {loading ? (
          <p className="portal-content-card portal-content-message" role="status">
            Loading {title.toLowerCase()}…
          </p>
        ) : error ? (
          <p className="portal-content-error" role="alert">
            {error}
          </p>
        ) : items.length ? (
          items.map((item) => <PublishedContentCard item={item} key={item.id} />)
        ) : (
          <article className="portal-content-card portal-content-empty">
            <span className="portal-coming-soon-icon">
              <Icon aria-hidden="true" size={24} />
            </span>
            <h3>No {isGuideline ? "guidelines" : "notices"} published yet</h3>
            <p>
              Published {isGuideline ? "guidelines" : "notices"} will appear
              here when they are available.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}

export function ContentManagementPage() {
  return (
    <section className="portal-placeholder">
      <div className="portal-page-heading">
        <h2>Content Management</h2>
        <p>
          A dedicated Examination Cell workspace for managing notices and
          guidelines.
        </p>
      </div>
      <div className="portal-management-grid">
        <ManagementSection
          contentType="notice"
          title="Notice Board"
          description="Publish updates for students and staff to read."
          icon={Bell}
        />
        <ManagementSection
          contentType="guideline"
          title="Guidelines"
          description="Publish guidance that is shared across all portals."
          icon={BookOpen}
        />
      </div>
      <p className="portal-management-note">
        Published content will appear on the Notice Board and Guidelines pages
        for all portal users.
      </p>
    </section>
  );
}

function PublishedContentCard({ item }) {
  return (
    <article className="portal-content-card portal-published-item">
      <div className="portal-published-item-heading">
        <h3>{item.title}</h3>
        <time dateTime={item.created_at}>
          {new Date(item.created_at).toLocaleDateString()}
        </time>
      </div>
      <p>{item.body}</p>
    </article>
  );
}

function ManagementSection({ contentType, title, description, icon: Icon }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    async function refresh() {
      const request = ++latestRequest;
      try {
        const content = await listPortalContent(contentType, {
          includeUnpublished: true,
        });
        if (!active || request !== latestRequest) return;
        setItems(content || []);
        setError("");
      } catch (loadError) {
        if (active && request === latestRequest) {
          setError(
            loadError.message || `Could not load ${title.toLowerCase()}.`,
          );
        }
      } finally {
        if (active && request === latestRequest) setLoading(false);
      }
    }

    refresh();
    const unsubscribe = subscribeToPortalContent(
      `portal-content-management-${contentType}`,
      refresh,
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [contentType, title]);

  function resetForm() {
    setEditingItem(null);
    setDraftTitle("");
    setDraftBody("");
  }

  function beginEdit(item) {
    setEditingItem(item);
    setDraftTitle(item.title);
    setDraftBody(item.body);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const savedItem = await savePortalContent({
        id: editingItem?.id,
        contentType,
        title: draftTitle,
        body: draftBody,
      });
      setItems((current) =>
        [savedItem, ...current.filter((item) => item.id !== savedItem.id)].sort(
          (left, right) =>
            new Date(right.created_at).getTime() -
            new Date(left.created_at).getTime(),
        ),
      );
      setMessage(
        editingItem
          ? `${title} updated successfully.`
          : `${title} published successfully.`,
      );
      resetForm();
    } catch (saveError) {
      setError(saveError.message || `Could not save ${title.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle(item) {
    setError("");
    setMessage("");
    setBusyId(item.id);
    try {
      const updatedItem = await setPortalContentPublished(
        item.id,
        !item.is_published,
      );
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === updatedItem.id ? updatedItem : currentItem,
        ),
      );
      setMessage(
        updatedItem.is_published
          ? `${title} published for all users.`
          : `${title} unpublished.`,
      );
    } catch (updateError) {
      setError(updateError.message || `Could not update ${title.toLowerCase()}.`);
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) {
      return;
    }

    setError("");
    setMessage("");
    setBusyId(item.id);
    try {
      await deletePortalContent(item.id);
      setItems((current) => current.filter(({ id }) => id !== item.id));
      if (editingItem?.id === item.id) resetForm();
      setMessage(`${title} deleted.`);
    } catch (deleteError) {
      setError(deleteError.message || `Could not delete ${title.toLowerCase()}.`);
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="portal-management-section">
      <div className="portal-management-section-heading">
        <span className="portal-content-icon">
          <Icon aria-hidden="true" size={19} />
        </span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <form className="portal-content-form" onSubmit={handleSubmit}>
        <label>
          Title
          <input
            maxLength={180}
            minLength={3}
            onChange={(event) => setDraftTitle(event.target.value)}
            required
            value={draftTitle}
          />
        </label>
        <label>
          Content
          <textarea
            maxLength={10000}
            onChange={(event) => setDraftBody(event.target.value)}
            required
            rows={5}
            value={draftBody}
          />
        </label>
        <div className="portal-form-actions">
          <button
            className="portal-add-button"
            disabled={saving || Boolean(busyId)}
            type="submit"
          >
            {editingItem ? (
              <Pencil aria-hidden="true" size={16} />
            ) : (
              <Plus aria-hidden="true" size={17} />
            )}
            {saving
              ? "Saving…"
              : editingItem
                ? "Save changes"
                : `Publish ${contentType}`}
          </button>
          {editingItem && (
            <button
              className="portal-secondary-button"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {error && (
        <p className="portal-content-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="portal-content-success" role="status">
          {message}
        </p>
      )}
      <div className="portal-management-items">
        <h4>Published and draft {title.toLowerCase()}</h4>
        {loading ? (
          <p role="status">Loading…</p>
        ) : items.length ? (
          items.map((item) => (
            <article className="portal-management-item" key={item.id}>
              <div className="portal-management-item-heading">
                <h5>{item.title}</h5>
                <span
                  className={`portal-publish-status${item.is_published ? " is-published" : ""}`}
                >
                  {item.is_published ? "Published" : "Draft"}
                </span>
              </div>
              <p>{item.body}</p>
              <div className="portal-management-item-actions">
                <button
                  className="portal-secondary-button"
                  disabled={Boolean(busyId) || saving}
                  onClick={() => beginEdit(item)}
                  type="button"
                >
                  <Pencil aria-hidden="true" size={15} />
                  Edit
                </button>
                <button
                  className="portal-secondary-button"
                  disabled={Boolean(busyId) || saving}
                  onClick={() => handlePublishToggle(item)}
                  type="button"
                >
                  {item.is_published ? "Unpublish" : "Publish"}
                </button>
                <button
                  className="portal-secondary-button portal-delete-button"
                  disabled={Boolean(busyId) || saving}
                  onClick={() => handleDelete(item)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={15} />
                  Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="portal-empty-state">No {title.toLowerCase()} yet.</p>
        )}
      </div>
    </section>
  );
}

export function ComingSoonPage({ title }) {
  const Icon = title === "Profile" ? UserRound : ClipboardList;

  return (
    <section className="portal-placeholder">
      <div className="portal-page-heading">
        <h2>{title}</h2>
        <p>
          {title === "Profile"
            ? "Your account details and preferences."
            : `${title} for your portal.`}
        </p>
      </div>
      <div className="portal-coming-soon-card">
        <span className="portal-coming-soon-icon">
          <Icon aria-hidden="true" size={24} />
        </span>
        <h3>Coming soon</h3>
        <p>
          This section is being prepared. Check back here for{" "}
          {title.toLowerCase()}.
        </p>
      </div>
    </section>
  );
}
