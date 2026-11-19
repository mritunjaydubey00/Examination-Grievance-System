import { useEffect, useState } from "react";
import {
  deleteContent,
  listAllContent,
  saveContent,
  uploadContentAttachment,
} from "../services/contentService.js";

function ContentManager({ type, canEdit = false }) {
  const isGuideline = type === "guideline";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setItems(await listAllContent(type));
    } catch (loadError) {
      setError(loadError.message || "Could not load content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [type]);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setContent("");
    setFile(null);
    setFormOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setTitle(item.title);
    setContent(item.content);
    setFile(null);
    setFormOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const attachmentUrl = await uploadContentAttachment({ type, file });
      await saveContent({
        type,
        id: editing?.id,
        title,
        content,
        attachmentUrl: attachmentUrl || editing?.attachment_url || null,
        isActive: editing?.is_active ?? true,
      });
      setFormOpen(false);
      await refresh();
    } catch (saveError) {
      setError(saveError.message || "Could not save content.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleItem(item) {
    setBusy(true);
    setError("");
    try {
      await saveContent({
        type,
        id: item.id,
        title: item.title,
        content: item.content,
        attachmentUrl: item.attachment_url,
        isActive: !item.is_active,
      });
      await refresh();
    } catch (toggleError) {
      setError(toggleError.message || "Could not update content.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteContent({ type, id: item.id });
      await refresh();
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete content.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="portal-placeholder-page">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Portal</p>
          <h3>{isGuideline ? "Guidelines" : "Notice Board"}</h3>
          <p>{isGuideline ? "Guidance and reference material." : "Important announcements."}</p>
        </div>
        {canEdit && (
          <button type="button" className="portal-add-button" onClick={openCreate}>
            Add {isGuideline ? "guideline" : "notice"}
          </button>
        )}
      </div>
      {loading ? (
        <p role="status">Loading…</p>
      ) : error ? (
        <p role="alert" className="login-error">{error}</p>
      ) : items.filter((item) => canEdit || item.is_active).length === 0 ? (
        <div className="portal-info-card">
          <p>{isGuideline ? "No guidelines yet" : "No notices yet"}</p>
        </div>
      ) : (
        <div className="portal-info-card">
          {items.filter((item) => canEdit || item.is_active).map((item) => (
            <article key={item.id} className="student-grievance interactive-card">
              <h4>{item.title}</h4>
              <p>{item.content}</p>
              {item.attachment_url && (
                <a href={item.attachment_url} target="_blank" rel="noreferrer">View attachment</a>
              )}
              {canEdit && (
                <div className="admin-actions-cell">
                  <button type="button" className="admin-action-button" onClick={() => openEdit(item)}>Edit</button>
                  <button type="button" className="admin-action-button" disabled={busy} onClick={() => toggleItem(item)}>
                    {item.is_active ? "Hide" : "Show"}
                  </button>
                  <button type="button" className="admin-action-button" disabled={busy} onClick={() => handleDelete(item)}>Delete</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {formOpen && (
        <dialog open className="student-grievance-dialog">
          <form className="grievance-form" onSubmit={handleSubmit}>
            <h3>{editing ? "Edit" : "Add"} {isGuideline ? "guideline" : "notice"}</h3>
            <label className="form-field">
              <span>Title</span>
              <input required maxLength="200" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="form-field">
              <span>Content</span>
              <textarea required minLength="1" maxLength="10000" rows="6" value={content} onChange={(event) => setContent(event.target.value)} />
            </label>
            <label className="form-field">
              <span>Optional PDF/image attachment</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
            {error && <p role="alert" className="login-error">{error}</p>}
            <div className="form-footer">
              <button type="button" className="thread-action-secondary" onClick={() => setFormOpen(false)} disabled={busy}>Cancel</button>
              <button type="submit" className="submit-button" disabled={busy || !title.trim() || !content.trim()}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </section>
  );
}

export default ContentManager;
