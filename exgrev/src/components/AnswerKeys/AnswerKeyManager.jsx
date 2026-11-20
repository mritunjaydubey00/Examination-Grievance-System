import { useEffect, useState } from "react";
import { BRANCH_OPTIONS } from "../../data/Branch-Mapping.js";
import {
  listAnswerKeysForStaff,
  saveAnswerKey,
  updateAnswerKey,
} from "../../services/answerKeyService.js";

function AnswerKeyManager({ session }) {
  const [answerKeys, setAnswerKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    subjectCode: "",
    subjectName: "",
    admissionYear: "",
    branchCode: "",
    semester: "",
    title: "",
    driveUrl: "",
  });

  async function refresh() {
    setLoading(true);
    try {
      setAnswerKeys(await listAnswerKeysForStaff());
    } catch (error) {
      setMessage(error.message || "Could not load answer keys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      subjectCode: "",
      subjectName: "",
      admissionYear: "",
      branchCode: "",
      semester: "",
      title: "",
      driveUrl: "",
    });
  }

  function beginEdit(answerKey) {
    setEditingId(answerKey.id);
    setForm({
      subjectCode: answerKey.subject_code,
      subjectName: answerKey.subject_name,
      admissionYear: String(answerKey.admission_year),
      branchCode: answerKey.branch_code,
      semester: answerKey.semester,
      title: answerKey.title,
      driveUrl: answerKey.drive_url,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const branch = BRANCH_OPTIONS.find(
      (option) => option.code === form.branchCode,
    );
    if (!branch) {
      setMessage("Select a valid branch.");
      setBusy(false);
      return;
    }

    try {
      if (editingId) {
        await updateAnswerKey(editingId, {
          subject_code: form.subjectCode.trim().toUpperCase(),
          subject_name: form.subjectName.trim(),
          admission_year: Number(form.admissionYear),
          branch_code: branch.code,
          branch_name: branch.name,
          semester: form.semester.trim(),
          title: form.title.trim(),
          drive_url: form.driveUrl,
        });
        setMessage("Answer key updated.");
      } else {
        await saveAnswerKey({
          subjectCode: form.subjectCode,
          subjectName: form.subjectName,
          admissionYear: form.admissionYear,
          branchCode: branch.code,
          branchName: branch.name,
          department: session.department,
          semester: form.semester,
          title: form.title,
          driveUrl: form.driveUrl,
          uploadedBy: session.userId,
          isPublished: true,
        });
        setMessage("Answer key published.");
      }
      resetForm();
      await refresh();
    } catch (error) {
      setMessage(error.message || "Could not save the answer key.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(answerKey) {
    setBusy(true);
    setMessage("");
    try {
      await updateAnswerKey(answerKey.id, {
        is_published: !answerKey.is_published,
      });
      setMessage(answerKey.is_published ? "Answer key hidden." : "Answer key published.");
      await refresh();
    } catch (error) {
      setMessage(error.message || "Could not change publication status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="answer-key-section" aria-labelledby="answer-key-manager-title">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Major semester exams</p>
          <h3 id="answer-key-manager-title">Answer key management</h3>
          <p>Publish subject answer-key links for the correct branch and admission year.</p>
        </div>
      </div>

      <form className="answer-key-form" onSubmit={handleSubmit}>
        <label>
          Subject code
          <input name="subjectCode" value={form.subjectCode} onChange={updateField} required />
        </label>
        <label>
          Subject name
          <input name="subjectName" value={form.subjectName} onChange={updateField} required />
        </label>
        <label>
          Admission year
          <input
            name="admissionYear"
            type="number"
            min="2000"
            max="2100"
            value={form.admissionYear}
            onChange={updateField}
            required
          />
        </label>
        <label>
          Branch
          <select name="branchCode" value={form.branchCode} onChange={updateField} required>
            <option value="">Select branch</option>
            {BRANCH_OPTIONS.map((branch) => (
              <option key={branch.code} value={branch.code}>
                {branch.code} - {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Semester
          <input name="semester" value={form.semester} onChange={updateField} placeholder="Semester 5" required />
        </label>
        <label>
          Card title
          <input name="title" value={form.title} onChange={updateField} required />
        </label>
        <label className="answer-key-form-wide">
          Google Drive link
          <input
            name="driveUrl"
            type="url"
            value={form.driveUrl}
            onChange={updateField}
            placeholder="https://drive.google.com/..."
            required
          />
        </label>
        {message && <p className="answer-key-message answer-key-form-wide" role="status">{message}</p>}
        <div className="answer-key-form-actions answer-key-form-wide">
          {editingId && (
            <button type="button" className="portal-secondary-button" onClick={resetForm} disabled={busy}>
              Cancel
            </button>
          )}
          <button type="submit" className="submit-button" disabled={busy}>
            {busy ? "Saving..." : editingId ? "Save changes" : "Publish answer key"}
          </button>
        </div>
      </form>

      <div className="answer-key-grid" aria-live="polite">
        {loading ? (
          <p>Loading answer keys...</p>
        ) : answerKeys.length === 0 ? (
          <p className="answer-key-empty">No answer keys have been uploaded.</p>
        ) : answerKeys.map((answerKey) => (
          <article className="answer-key-card" key={answerKey.id}>
            <div>
              <p className="eyebrow">{answerKey.subject_code} / {answerKey.admission_year}</p>
              <h4>{answerKey.title}</h4>
              <p>{answerKey.subject_name}</p>
              <p>{answerKey.branch_name} / {answerKey.semester}</p>
              <span className={answerKey.is_published ? "answer-key-status published" : "answer-key-status"}>
                {answerKey.is_published ? "Published" : "Hidden"}
              </span>
            </div>
            <div className="answer-key-card-actions">
              <a href={answerKey.drive_url} target="_blank" rel="noopener noreferrer">
                Open Drive link
              </a>
              <button type="button" onClick={() => beginEdit(answerKey)} disabled={busy}>Edit</button>
              <button type="button" onClick={() => togglePublished(answerKey)} disabled={busy}>
                {answerKey.is_published ? "Hide" : "Publish"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AnswerKeyManager;
