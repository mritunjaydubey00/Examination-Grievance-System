import { useCallback, useEffect, useState } from "react";
import { categoryOptions, problemTypeOptions } from "../data/tagOptions.js";
import DropDown from "../components/StudentPage/DropDown.jsx";
import {
  createGrievance,
  getDocumentUrl,
  listStudentGrievances,
} from "../services/grievanceService.js";
import { supabase } from "../lib/supabase.js";

function StudentPage({ session, onLogout }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const [grievances, setGrievances] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const problemOptions = problemTypeOptions[selectedCategory] || [];
  const refresh = useCallback(async () => {
    try {
      setGrievances(await listStudentGrievances(session.userId));
    } catch (error) {
      setMessage(error.message || "Could not load your grievances.");
    }
  }, [session.userId]);
  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`student-grievances-${session.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grievances",
          filter: `student_user_id=eq.${session.userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grievance_events" },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, session.userId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createGrievance({
        userId: session.userId,
        subject: form.get("subject"),
        description: form.get("description"),
        category: selectedCategory,
        problemType: selectedProblem,
        files: form.getAll("documents").filter((file) => file.size > 0),
      });
      formElement.reset();
      setSelectedCategory("");
      setSelectedProblem("");
      setMessage("Grievance submitted successfully.");
      await refresh();
    } catch (error) {
      setMessage(error.message || "Could not submit your grievance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="student-page">
      <header className="student-header">
        <div>
          <p className="eyebrow">Student portal</p>
          <h2>Welcome, {session.name}</h2>
          <p className="student-context">
            {session.branch} <span>/</span> {session.department}
          </p>
        </div>
        <div className="student-header-actions">
          <div className="session-status">
            <span className="status-dot" />
            Session active <strong>{session.uptimeSeconds}s</strong>
          </div>
          <button type="button" className="logout-button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <section className="grievance-panel" aria-labelledby="grievance-title">
        <div className="panel-intro">
          <p className="eyebrow">New request</p>
          <h3 id="grievance-title">Submit a grievance</h3>
          <p>Tell us what happened and our examination team will review it.</p>
        </div>
        <form className="grievance-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <DropDown
              label="Select category"
              options={categoryOptions}
              selectedOption={selectedCategory}
              onSelect={setSelectedCategory}
            />
            <DropDown
              label="Select problem type"
              options={problemOptions}
              selectedOption={selectedProblem}
              onSelect={setSelectedProblem}
            />
          </div>
          <div className="form-field">
            <label htmlFor="subject">Subject</label>
            <input
              name="subject"
              type="text"
              id="subject"
              required
              maxLength="200"
              placeholder="e.g. Incorrect marks in final result"
            />
          </div>
          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              name="description"
              id="description"
              rows="5"
              required
              maxLength="10000"
              placeholder="Include the details that will help us investigate your grievance."
            />
          </div>
          <div className="form-field">
            <label htmlFor="documents">
              Supporting documents (multiple files allowed)
            </label>
            <input
              name="documents"
              type="file"
              id="documents"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />
          </div>
          {message && (
            <p role="status" className="grievance-message">
              {message}
            </p>
          )}
          <div className="form-footer">
            <p>Your submission will be linked to your student account.</p>
            <button
              type="submit"
              className="submit-button"
              disabled={busy || !selectedCategory || !selectedProblem}
            >
              {busy ? "Submitting…" : "Submit grievance"}
            </button>
          </div>
        </form>
      </section>
      <section
        className="grievance-panel student-history"
        aria-labelledby="history-title"
      >
        <div className="panel-intro">
          <p className="eyebrow">Updates</p>
          <h3 id="history-title">My grievances</h3>
          <p>
            Follow assignment, status, and resolution updates as they happen.
          </p>
        </div>
        {grievances.length ? (
          grievances.map((item) => (
            <article className="student-grievance" key={item.id}>
              <div className="student-grievance-heading">
                <div>
                  <strong>{item.grievance_number || item.id}</strong>
                  <h4>{item.subject}</h4>
                </div>
                <span
                  className={`admin-status admin-status-${item.status.toLowerCase().replaceAll(" ", "-")}`}
                >
                  {item.status}
                </span>
              </div>
              <p>
                {item.problem_category} · {item.problem_type}
              </p>
              <ol className="grievance-timeline">
                {[...(item.grievance_events || [])]
                  .sort(
                    (a, b) => new Date(a.created_at) - new Date(b.created_at),
                  )
                  .map((event) => (
                    <li key={event.id}>
                      <strong>{event.event_type.replaceAll("_", " ")}</strong>
                      <small>
                        {new Date(event.created_at).toLocaleString()}
                      </small>
                      {event.details?.assigned_name && (
                        <p>Assigned to {event.details.assigned_name}</p>
                      )}
                      {event.details?.remark && (
                        <p>Resolution: {event.details.remark}</p>
                      )}
                      {event.details?.note && <p>{event.details.note}</p>}
                    </li>
                  ))}
              </ol>
              {item.supporting_documents?.map((file) => (
                <button
                  className="document-link"
                  type="button"
                  key={file.path}
                  onClick={async () =>
                    window.open(
                      await getDocumentUrl(file.path),
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  {file.name}
                </button>
              ))}
            </article>
          ))
        ) : (
          <p>No grievances submitted yet.</p>
        )}
      </section>
    </main>
  );
}
export default StudentPage;
