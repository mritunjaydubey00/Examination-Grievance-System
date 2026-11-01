import { useCallback, useEffect, useRef, useState } from "react";
import {
  addGrievanceRemarkWithAttachments,
  getThreadAttachmentUrl,
  getGrievanceThread,
} from "../services/grievanceService.js";
import { supabase } from "../lib/supabase.js";
import ToastNotice from "../components/ToastNotice.jsx";
import {
  getGrievanceStatusLabel,
  isResolutionWindowOpen,
} from "../lib/grievanceStatus.js";
import "./GrievanceThread.css";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ATTACHMENT_TYPE_BY_EXTENSION = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function ThreadEventAttachments({ attachments }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadLinks() {
    setLoading(true);
    setError("");
    try {
      const signedLinks = await Promise.all(
        attachments.map(async (attachment) => ({
          ...attachment,
          url: await getThreadAttachmentUrl(attachment.path),
        })),
      );
      setLinks(signedLinks);
    } catch (loadError) {
      setError(loadError.message || "Could not load remark attachments.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details
      className="thread-attachments"
      onToggle={(event) => {
        if (event.currentTarget.open && links.length === 0 && !loading) {
          loadLinks();
        }
      }}
    >
      <summary>
        Attachments ({attachments.length})
      </summary>
      {loading && <p className="thread-attachment-message">Loading files…</p>}
      {error && (
        <div className="thread-attachment-message thread-error" role="status">
          <span>{error}</span>
          <button type="button" onClick={loadLinks}>Try again</button>
        </div>
      )}
      {links.length > 0 && (
        <ul className="thread-attachment-list">
          {links.map((attachment) => (
            <li key={attachment.path}>
              <a href={attachment.url} target="_blank" rel="noreferrer">
                {attachment.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function getEventCategory(eventType) {
  if (eventType === "forwarded" || eventType === "reassigned") {
    return "Assignment";
  }
  if (eventType === "remark_added") return "Remark";
  if (eventType === "resolution_proposed") return "Resolution Proposal";
  if (eventType === "submitted") return "Submission";
  if (eventType === "student_confirmed_resolution") {
    return "Resolution Confirmed";
  }
  if (eventType === "resolved_awaiting_response") {
    return "Resolved, awaiting student response";
  }
  if (eventType === "student_accepted_resolution") {
    return "Resolution accepted";
  }
  if (eventType === "student_continued") return "Grievance continued";
  if (eventType === "auto_resolved") return "Auto-resolved";
  if (eventType === "status_changed") return "Status changed";
  if (eventType === "resolved") return "Resolution";
  return "Case Update";
}

function getEventMessage(event) {
  if (event.message) return event.message;
  if (event.event_type === "forwarded" || event.event_type === "reassigned") {
    return event.details?.remark || event.details?.note || "";
  }
  if (event.event_type === "remark_added" ||
    event.event_type === "resolution_proposed" ||
    event.event_type === "student_confirmed_resolution") {
    return event.details?.remark || "";
  }
  if (event.details?.status) return `Status changed to ${event.details.status}`;
  return event.details?.remark || event.details?.note || "";
}

function GrievanceThreadPage({
  grievanceId,
  session,
  onBack,
  onLogout,
}) {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [remark, setRemark] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [now, setNow] = useState(() => Date.now());
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const replyDialog = useRef(null);
  const threadEndMarker = useRef(null);
  const [atThreadEnd, setAtThreadEnd] = useState(false);
  const [footerClearance, setFooterClearance] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setThread(await getGrievanceThread(grievanceId));
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Could not load this grievance thread.");
    } finally {
      setLoading(false);
    }
  }, [grievanceId]);

  useEffect(() => {
    if (!thread?.grievance?.resolution_pending) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [thread?.grievance?.resolution_pending, thread?.grievance?.window_expires_at]);

  useEffect(() => {
    if (replyDialogOpen && replyDialog.current && !replyDialog.current.open) {
      replyDialog.current.showModal();
    }
  }, [replyDialogOpen]);

  useEffect(() => {
    let active = true;
    getGrievanceThread(grievanceId)
      .then((result) => {
        if (active) {
          setThread(result);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error.message || "Could not load this grievance thread.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const channel = supabase
      .channel(`grievance-thread-${grievanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grievances",
          filter: `id=eq.${grievanceId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grievance_events",
          filter: `grievance_id=eq.${grievanceId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [grievanceId, refresh]);

  async function handleSubmitRemark(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    try {
      await addGrievanceRemarkWithAttachments({
        grievanceId,
        userId: session.userId,
        notes: remark,
        files: attachments,
      });
      setRemark("");
      setAttachments([]);
      formElement.reset();
      replyDialog.current?.close();
      setNoticeType("success");
      setNotice(
        attachments.length
          ? "Remark and attachments posted to the other grievance participants."
          : "Remark posted to the other grievance participants.",
      );
      await refresh();
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not post your remark.");
    } finally {
      setSaving(false);
    }
  }

  function handleAttachmentSelection(event) {
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    const accepted = [];
    const rejected = [];

    for (const file of selected) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const contentType =
        (ALLOWED_ATTACHMENT_TYPES.has(file.type) && file.type) ||
        ATTACHMENT_TYPE_BY_EXTENSION[extension] ||
        "";
      if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
        rejected.push(`${file.name}: unsupported file type`);
      } else if (file.size > MAX_ATTACHMENT_SIZE) {
        rejected.push(`${file.name}: exceeds 10 MB`);
      } else {
        accepted.push(file);
      }
    }

    if (accepted.length) {
      setAttachments((current) => [...current, ...accepted]);
    }
    if (rejected.length) {
      setNoticeType("error");
      setNotice(`Some files were not added: ${rejected.join("; ")}.`);
    }
  }

  const grievance = thread?.grievance;
  const isStudent = session.role === "student";
  const responseWindowOpen = isResolutionWindowOpen(grievance, now);
  const canPostRemark = Boolean(
    grievance &&
      (grievance.status !== "Resolved" || (isStudent && responseWindowOpen)),
  );
  const secondsLeft = responseWindowOpen
    ? Math.max(
        0,
        Math.ceil((Date.parse(grievance.window_expires_at) - now) / 1000),
      )
    : 0;
  const countdown = [
    Math.floor(secondsLeft / 3600),
    Math.floor((secondsLeft % 3600) / 60),
    secondsLeft % 60,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  useEffect(() => {
    const marker = threadEndMarker.current;
    if (!marker || !canPostRemark) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setAtThreadEnd(entry.isIntersecting),
      { rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [canPostRemark, thread?.events.length]);

  useEffect(() => {
    const footer = document.querySelector(".app-footer");
    if (!footer || !canPostRemark) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      setFooterClearance(
        entry.isIntersecting
          ? Math.ceil(entry.target.getBoundingClientRect().height) + 16
          : 0,
      );
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [canPostRemark]);

  return (
    <main className="student-page examination-cell-page grievance-thread-page">
      <header className="thread-page-header">
        <div>
          <button
            type="button"
            className="thread-back-button"
            onClick={onBack}
          >
            Back to grievances
          </button>
          <p className="eyebrow">Case history</p>
          <h1>Grievance thread</h1>
        </div>
        <div className="thread-header-actions">
          <button type="button" className="logout-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      {loading ? (
        <p className="thread-state">Loading grievance thread…</p>
      ) : loadError ? (
        <p className="thread-state thread-error" role="alert">
          {loadError}
        </p>
      ) : grievance ? (
        <>
          <section className="thread-case-summary">
            <div>
              <p className="eyebrow">
                {grievance.grievance_code || "Grievance"}
              </p>
              <h2>{grievance.subject}</h2>
              <p>
                {grievance.problem_category} · {grievance.problem_type}
              </p>
            </div>
            <span className="admin-status">
              {getGrievanceStatusLabel(
                grievance,
                isStudent ? "student" : "staff",
              )}
            </span>
          </section>

          {responseWindowOpen && (
            <p className="thread-window-countdown" aria-live="polite">
              {isStudent
                ? "Time remaining to accept or continue:"
                : "Student response window:"}{" "}
              <strong>{countdown}</strong>
            </p>
          )}
          {isStudent &&
            grievance.resolution_pending &&
            !responseWindowOpen && (
              <p className="thread-window-countdown" role="status">
                The 48-hour response window has ended. If you are still not
                satisfied, please submit a new grievance.
              </p>
            )}

          {grievance.resolution_remark && (
            <section className="thread-resolution-summary">
              <strong>Proposed resolution</strong>
              <p>{grievance.resolution_remark}</p>
            </section>
          )}

          <section className="thread-events" aria-label="Grievance events">
            <div className="thread-section-heading">
              <h2>Event history</h2>
              <span>{thread.events.length} events</span>
            </div>
            {thread.events.length ? (
              <ol className="thread-event-list">
                {thread.events.map((event) => {
                  const category = getEventCategory(event.event_type);
                  const message = getEventMessage(event);
                  const recipients = event.recipients || [];
                  return (
                    <li className="thread-event" key={event.id}>
                      <div className="thread-event-heading">
                        <span className="thread-event-category">{category}</span>
                        <time dateTime={event.created_at}>
                          {new Date(event.created_at).toLocaleString()}
                        </time>
                      </div>
                      <p className="thread-event-sender">
                        <strong>From</strong>{" "}
                        {event.actor_display_name || event.actor_user_id}
                      </p>
                      {event.actor_role && (
                        <p className="thread-event-sender">
                          <strong>Role</strong>{" "}
                          {event.actor_role.replaceAll("_", " ")}
                        </p>
                      )}
                      {event.event_type === "forwarded" ||
                      event.event_type === "reassigned" ? (
                        <p className="thread-event-assignment">
                          <strong>Assigned by</strong>{" "}
                          {event.actor_display_name || event.actor_user_id}
                          <span aria-hidden="true"> · </span>
                          <strong>Passed to</strong>{" "}
                          {event.details?.to_name ||
                            event.details?.assigned_name ||
                            recipients.map((recipient) =>
                              recipient.recipient_display_name,
                            ).join(", ") ||
                            "Unknown recipient"}
                        </p>
                      ) : null}
                      {(event.details?.priority || event.details?.due_date) && (
                        <p className="thread-event-assignment">
                          {event.details.priority &&
                            `Priority: ${event.details.priority}`}
                          {event.details.priority && event.details.due_date
                            ? " · "
                            : ""}
                          {event.details.due_date &&
                            `Due date: ${event.details.due_date}`}
                        </p>
                      )}
                      {message && (
                        <p className="thread-event-message">{message}</p>
                      )}
                      {event.details?.attachments?.length > 0 && (
                        <ThreadEventAttachments
                          attachments={event.details.attachments}
                        />
                      )}
                      {recipients.length ? (
                        <p className="thread-event-recipients">
                          <strong>Sent to</strong>{" "}
                          {recipients
                            .map((recipient) => recipient.recipient_display_name)
                            .join(", ")}
                        </p>
                      ) : (
                        <p className="thread-event-recipients thread-muted">
                          {event.recipients_recorded
                            ? "No other recipients for this event."
                            : "Recipients not recorded for this historical event."}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="thread-state">No events have been recorded yet.</p>
            )}
          </section>

        </>
      ) : null}
      <div ref={threadEndMarker} className="thread-end-marker" aria-hidden="true" />
      {canPostRemark && (
        <>
          <button
            type="button"
            className={`admin-confirm-button is-forward thread-post-remark-button${atThreadEnd ? " is-at-thread-end" : ""}`}
            style={{ "--footer-clearance": `${footerClearance}px` }}
            onClick={() => setReplyDialogOpen(true)}
          >
            Post remark
          </button>
          <dialog
            ref={replyDialog}
            className="thread-reply-dialog"
            aria-labelledby="thread-reply-title"
            onClose={() => setReplyDialogOpen(false)}
          >
            <form className="thread-reply-form" onSubmit={handleSubmitRemark}>
              <div className="thread-reply-heading">
                <h2 id="thread-reply-title">
                  {isStudent && responseWindowOpen
                    ? "Add a remark to continue this grievance"
                    : "Add a remark"}
                </h2>
                <button
                  type="button"
                  className="thread-reply-close"
                  onClick={() => replyDialog.current?.close()}
                  aria-label="Close remark dialog"
                >
                  ×
                </button>
              </div>
              {replyDialogOpen && noticeType === "error" && notice && (
                <p className="thread-error" role="alert">
                  {notice}
                </p>
              )}
              <label htmlFor="thread-remark" className="visually-hidden">
                Remark
              </label>
              <textarea
                id="thread-remark"
                rows="4"
                maxLength="5000"
                required
                disabled={saving}
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                placeholder="Write an update for the other case participants."
              />
              <label htmlFor="thread-attachments">
                Attach files <span className="thread-muted">(optional)</span>
              </label>
              <input
                id="thread-attachments"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleAttachmentSelection}
                disabled={saving}
              />
              <p className="thread-muted">
                PDF, PNG, JPG, DOC, or DOCX; up to 10 MB per file.
              </p>
              {attachments.length > 0 && (
                <ul className="thread-selected-attachments">
                  {attachments.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}-${index}`}>
                      <span>
                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((current) =>
                            current.filter((_, fileIndex) => fileIndex !== index),
                          )
                        }
                        disabled={saving}
                        aria-label={`Remove ${file.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="submit"
                className="admin-confirm-button is-forward"
                disabled={saving || !remark.trim()}
              >
                {saving ? "Posting…" : "Post remark"}
              </button>
            </form>
          </dialog>
        </>
      )}
      {!replyDialogOpen && (
        <ToastNotice
          message={notice}
          type={noticeType}
          onDismiss={() => setNotice("")}
        />
      )}
    </main>
  );
}

export default GrievanceThreadPage;
