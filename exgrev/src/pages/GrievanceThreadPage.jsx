import { useCallback, useEffect, useState } from "react";
import {
  addGrievanceRemark,
  getGrievanceThread,
} from "../services/grievanceService.js";
import { supabase } from "../lib/supabase.js";
import ToastNotice from "../components/ToastNotice.jsx";
import "./GrievanceThread.css";

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
  if (eventType === "resolved") return "Resolution";
  if (eventType === "status_changed") return "Status Update";
  return "Case Update";
}

function getEventMessage(event) {
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

function GrievanceThreadPage({ grievanceId, session, onBack, onLogout }) {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");

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
    setSaving(true);
    try {
      await addGrievanceRemark({ grievanceId, notes: remark });
      setRemark("");
      setNoticeType("success");
      setNotice("Remark posted to the other grievance participants.");
      await refresh();
    } catch (error) {
      setNoticeType("error");
      setNotice(error.message || "Could not post your remark.");
    } finally {
      setSaving(false);
    }
  }

  const grievance = thread?.grievance;
  const isStudent = session.role === "student";
  const canPostRemark =
    grievance?.status !== "Resolved" &&
    (!grievance?.resolution_pending || isStudent);

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
        <button type="button" className="logout-button" onClick={onLogout}>
          Log out
        </button>
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
              {grievance.resolution_pending
                ? "Awaiting student confirmation"
                : grievance.status}
            </span>
          </section>

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

          {canPostRemark && (
            <form className="thread-reply-form" onSubmit={handleSubmitRemark}>
              <label htmlFor="thread-remark">Add a remark</label>
              <textarea
                id="thread-remark"
                rows="4"
                maxLength="5000"
                required
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                placeholder="Write an update for the other case participants."
              />
              <button
                type="submit"
                className="admin-confirm-button is-forward"
                disabled={saving || !remark.trim()}
              >
                {saving ? "Posting…" : "Post remark"}
              </button>
            </form>
          )}
        </>
      ) : null}
      <ToastNotice
        message={notice}
        type={noticeType}
        onDismiss={() => setNotice("")}
      />
    </main>
  );
}

export default GrievanceThreadPage;
