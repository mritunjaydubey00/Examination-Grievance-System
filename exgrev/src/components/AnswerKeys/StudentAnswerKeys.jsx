import { useEffect, useState } from "react";
import { parseStudentRollNumber } from "../../lib/studentIdentity.js";
import { listAnswerKeysForStudent } from "../../services/answerKeyService.js";

function StudentAnswerKeys({ session }) {
  const [answerKeys, setAnswerKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const identity = parseStudentRollNumber(session.userId);

  useEffect(() => {
    if (!identity.branchCode || !identity.admissionYear) {
      setError("Your role number does not contain a recognised branch and admission year.");
      setLoading(false);
      return;
    }

    listAnswerKeysForStudent(identity)
      .then(setAnswerKeys)
      .catch((loadError) => setError(loadError.message || "Could not load answer keys."))
      .finally(() => setLoading(false));
  }, [session.userId]);

  return (
    <section className="answer-key-section" aria-labelledby="student-answer-key-title">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Major semester exams</p>
          <h3 id="student-answer-key-title">Answer keys</h3>
          {identity.branchName && identity.admissionYear && (
            <p>{identity.branchName} / Admission year {identity.admissionYear}</p>
          )}
        </div>
      </div>

      {loading && <p>Loading answer keys...</p>}
      {error && <p className="answer-key-message" role="alert">{error}</p>}
      {!loading && !error && answerKeys.length === 0 && (
        <p className="answer-key-empty">No published answer keys are available for your branch and admission year.</p>
      )}
      <div className="answer-key-grid">
        {answerKeys.map((answerKey) => (
          <article className="answer-key-card" key={answerKey.id}>
            <div>
              <p className="eyebrow">{answerKey.subject_code}</p>
              <h4>{answerKey.title}</h4>
              <p>{answerKey.subject_name}</p>
              <p>{answerKey.branch_name} / {answerKey.semester}</p>
            </div>
            <a href={answerKey.drive_url} target="_blank" rel="noopener noreferrer">
              Open answer key
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StudentAnswerKeys;
