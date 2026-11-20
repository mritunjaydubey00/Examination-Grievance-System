import { useEffect, useState } from "react";
import { BRANCH_OPTIONS } from "../../data/Branch-Mapping.js";
import { DEPARTMENT_BRANCHES } from "../../data/Department-Branches.js";
import {
  listAnswerKeysForStaff,
  saveAnswerKey,
  updateAnswerKey,
} from "../../services/answerKeyService.js";

const YEAR_LEVELS = [
  { value: 1, label: "1st year" },
  { value: 2, label: "2nd year" },
  { value: 3, label: "3rd year" },
  { value: 4, label: "4th year" },
];

function getAcademicYearStartYear(date = new Date()) {
  return date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
}

function getAdmissionYearForLevel(yearLevel, academicYearStart) {
  if (yearLevel.startsWith("cohort:")) {
    const admissionYear = Number(yearLevel.slice("cohort:".length));
    return Number.isInteger(admissionYear) ? admissionYear : null;
  }

  const level = Number(yearLevel);
  return Number.isInteger(level) && level >= 1 && level <= YEAR_LEVELS.length
    ? academicYearStart - level + 1
    : null;
}

function getYearLevelForAdmissionYear(admissionYear, academicYearStart) {
  const level = academicYearStart - admissionYear + 1;
  return level >= 1 && level <= YEAR_LEVELS.length
    ? String(level)
    : `cohort:${admissionYear}`;
}

function normalizeBranchName(name) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[().]/g, "")
    .replace(/\s+/g, " ");
  if (
    normalized ===
    "information technology artificial intelligence and robotics"
  ) {
    return "artificial intelligence and robotics";
  }
  if (normalized === "internet of things iot") return "internet of things";
  return normalized;
}

function getFeedBranchesForDepartment(department) {
  const departmentKey = Object.keys(DEPARTMENT_BRANCHES).find(
    (option) =>
      option.trim().toLowerCase() ===
      String(department || "").trim().toLowerCase(),
  );
  return departmentKey ? DEPARTMENT_BRANCHES[departmentKey] : [];
}

function getBranchOptionsForDepartment(department) {
  return getFeedBranchesForDepartment(department).flatMap((branchName) =>
    BRANCH_OPTIONS.filter(
      (option) =>
        normalizeBranchName(option.name) === normalizeBranchName(branchName),
    ),
  );
}

function AnswerKeyManager({ session }) {
  const academicYearStart = getAcademicYearStartYear();
  const isTeachingStaff = session.role === "teaching staff";
  const department = String(session.department || "").trim();
  const [answerKeys, setAnswerKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    subjectCode: "",
    subjectName: "",
    department: isTeachingStaff ? department : "",
    yearLevel: "",
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
    if (event.target.name === "department") {
      setForm((current) => ({
        ...current,
        department: event.target.value,
        branchCode: "",
      }));
      return;
    }

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
      department: isTeachingStaff ? department : "",
      yearLevel: "",
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
      department: answerKey.department || "",
      yearLevel: getYearLevelForAdmissionYear(
        answerKey.admission_year,
        academicYearStart,
      ),
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

    const selectedDepartment = String(form.department || "").trim();
    if (!selectedDepartment) {
      setMessage("Select a department.");
      setBusy(false);
      return;
    }
    if (
      isTeachingStaff &&
      selectedDepartment.toLowerCase() !== department.toLowerCase()
    ) {
      setMessage("You can only manage answer keys for your assigned department.");
      setBusy(false);
      return;
    }

    const admissionYear = getAdmissionYearForLevel(
      form.yearLevel,
      academicYearStart,
    );
    if (!admissionYear) {
      setMessage("Select a valid student year.");
      setBusy(false);
      return;
    }

    if (isTeachingStaff && !department) {
      setMessage("Your account has no department assigned. Contact the administrator.");
      setBusy(false);
      return;
    }

    const branch = getBranchOptionsForDepartment(selectedDepartment).find(
      (option) => option.code === form.branchCode,
    );
    if (!branch) {
      setMessage("Select a valid branch for the chosen department.");
      setBusy(false);
      return;
    }

    try {
      if (editingId) {
        await updateAnswerKey(editingId, {
          subject_code: form.subjectCode.trim().toUpperCase(),
          subject_name: form.subjectName.trim(),
          admission_year: admissionYear,
          branch_code: branch.code,
          branch_name: branch.name,
          department: selectedDepartment,
          semester: form.semester.trim(),
          title: form.title.trim(),
          drive_url: form.driveUrl,
        });
        setMessage("Answer key updated.");
      } else {
        await saveAnswerKey({
          subjectCode: form.subjectCode,
          subjectName: form.subjectName,
          admissionYear,
          branchCode: branch.code,
          branchName: branch.name,
          department: selectedDepartment,
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

  const departmentOptions = Object.keys(DEPARTMENT_BRANCHES);
  const availableBranches = getBranchOptionsForDepartment(form.department);

  return (
    <section className="answer-key-section" aria-labelledby="answer-key-manager-title">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Major semester exams</p>
          <h3 id="answer-key-manager-title">Answer key management</h3>
          <p>
            {isTeachingStaff
              ? department
                ? `Showing and publishing answer keys for ${department} only.`
                : "A department must be assigned before you can manage answer keys."
              : "View and manage answer keys across all departments."}
          </p>
        </div>
      </div>

      {isTeachingStaff && !department ? (
        <p className="answer-key-message error" role="alert">
          No department is assigned to your account. Contact the administrator to request access.
        </p>
      ) : (
        <form className="answer-key-form" onSubmit={handleSubmit}>
          <div className="answer-key-form-heading answer-key-form-wide">
            <h4>{editingId ? "Edit answer key" : "Publish an answer key"}</h4>
            <p>
              {editingId
                ? "Update the subject details and link for this answer key."
                : "Add the subject details and a Google Drive link for students."}
            </p>
          </div>
          <label>
            Subject code
            <input name="subjectCode" value={form.subjectCode} onChange={updateField} required />
          </label>
          <label>
            Subject name
            <input name="subjectName" value={form.subjectName} onChange={updateField} required />
          </label>
          <label>
            Department
            <select
              name="department"
              value={form.department}
              onChange={updateField}
              disabled={isTeachingStaff}
              required
            >
              <option value="">Select department</option>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Student year
            <select
              name="yearLevel"
              value={form.yearLevel}
              onChange={updateField}
              required
            >
              <option value="">Select year</option>
              {YEAR_LEVELS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              {form.yearLevel.startsWith("cohort:") && (
                <option value={form.yearLevel}>
                  Existing cohort — admission year{" "}
                  {form.yearLevel.slice("cohort:".length)}
                </option>
              )}
            </select>
            {form.yearLevel && (
              <small className="answer-key-year-hint">
                Admission cohort:{" "}
                {getAdmissionYearForLevel(form.yearLevel, academicYearStart)}
              </small>
            )}
          </label>
          <label>
            Branch
            <select
              name="branchCode"
              value={form.branchCode}
              onChange={updateField}
              disabled={!form.department || availableBranches.length === 0}
              required
            >
              <option value="">
                {form.department ? "Select branch" : "Select department first"}
              </option>
              {availableBranches.map((branch) => (
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
            <button
              type="submit"
              className="submit-button"
              disabled={busy}
            >
              {busy ? "Saving..." : editingId ? "Save changes" : "Publish answer key"}
            </button>
          </div>
        </form>
      )}

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
              {(session.role === "examination cell" ||
                answerKey.uploaded_by === session.userId) && (
                <>
                  <button type="button" onClick={() => beginEdit(answerKey)} disabled={busy}>Edit</button>
                  <button type="button" onClick={() => togglePublished(answerKey)} disabled={busy}>
                    {answerKey.is_published ? "Hide" : "Publish"}
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AnswerKeyManager;
