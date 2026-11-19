import { useMemo, useState } from "react";
import {
  getStudentCourseMaterials,
  getStudentMajorExamOverview,
} from "../services/majorExamService.js";
import "./MajorExamMaterials.css";

function determineStudentProfile(session) {
  return {
    id: session?.userId || "demo-student",
    name: session?.name || "Demo Student",
    department: session?.department || "Computer Science & Engineering",
    branch: session?.branch || "Computer Engineering",
    studyYear: session?.studyYear || "2nd Year",
    role: session?.role || "student",
  };
}

export default function MajorExamStudentView({ session }) {
  const profile = useMemo(() => determineStudentProfile(session), [session]);
  const overview = useMemo(
    () => getStudentMajorExamOverview(profile),
    [profile],
  );
  const courseMaterials = useMemo(
    () => getStudentCourseMaterials(profile),
    [profile],
  );
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  return (
    <section className="major-exam-page" aria-label="Question Papers and Answer Keys">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Academic Materials</p>
          <h3>Question Papers &amp; Answer Keys</h3>
        </div>
      </div>

      <div className="major-exam-panel">
        <div className="major-exam-summary">
          <div>
            <p className="eyebrow">Examination cycle</p>
            <strong>{overview.cycle.name}</strong>
          </div>
          <div>
            <p className="eyebrow">Academic session</p>
            <strong>{overview.cycle.academicSession}</strong>
          </div>
          <div>
            <p className="eyebrow">Semester</p>
            <strong>{overview.cycle.semester}</strong>
          </div>
          <div>
            <p className="eyebrow">Department</p>
            <strong>{profile.department}</strong>
          </div>
          <div>
            <p className="eyebrow">Branch</p>
            <strong>{profile.branch}</strong>
          </div>
          <div>
            <p className="eyebrow">Eligibility</p>
            <strong>{overview.eligible ? "Eligible" : "Pending"}</strong>
          </div>
        </div>

        {!overview.eligible ? (
          <div className="major-exam-status-block major-exam-status-pending">
            <h4>Material access is still pending.</h4>
            <p>
              Your Major Examination materials will become available after all
              your applicable Major Examinations have been completed and the
              examination cell publishes the materials.
            </p>
            <div className="major-exam-progress-grid">
              <div>
                <span>Total applicable examination sessions</span>
                <strong>{overview.totalApplicableSessions}</strong>
              </div>
              <div>
                <span>Completed examination sessions</span>
                <strong>{overview.completedCount}</strong>
              </div>
              <div>
                <span>Remaining examination sessions</span>
                <strong>{overview.pendingCount}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="major-exam-status-block major-exam-status-ready">
            <h4>Your Major Examination Materials Are Available</h4>
            <p>
              The question papers and answer keys below are restricted to your
              verified academic profile and course registrations.
            </p>
          </div>
        )}

        {overview.eligible && courseMaterials.length === 0 && (
          <div className="major-exam-empty-state">
            No published materials are available for your current academic
            profile.
          </div>
        )}

        {overview.eligible && courseMaterials.length > 0 && (
          <div className="major-exam-course-grid">
            {courseMaterials.map((course) => (
              <article key={course.courseId} className="major-exam-course-card">
                <div className="major-exam-card-header">
                  <div>
                    <p className="eyebrow">{course.department}</p>
                    <h4>{course.courseName}</h4>
                  </div>
                  <span className="major-exam-course-badge">{course.courseId}</span>
                </div>
                <ul className="major-exam-meta-list">
                  <li>Branch: {course.branch}</li>
                  <li>Study year: {course.studyYear}</li>
                  <li>Semester: {course.semester}</li>
                  <li>Examination date: {course.examinationDate}</li>
                  <li>Examination type: {course.examinationType}</li>
                </ul>

                <div className="major-exam-material-groups">
                  {course.questionPapers.length > 0 && (
                    <div className="major-exam-material-group">
                      <h5>Question Paper</h5>
                      {course.questionPapers.map((material) => (
                        <button
                          key={material.id}
                          type="button"
                          className="major-exam-button"
                          onClick={() => setSelectedMaterial(material)}
                        >
                          {material.materialType === "question-paper"
                            ? `Question Paper — ${material.setLabel}`
                            : "Question Paper"}
                        </button>
                      ))}
                    </div>
                  )}

                  {course.answerKeys.length > 0 && (
                    <div className="major-exam-material-group">
                      <h5>Answer Key</h5>
                      {course.answerKeys.map((material) => (
                        <button
                          key={material.id}
                          type="button"
                          className="major-exam-button secondary"
                          onClick={() => setSelectedMaterial(material)}
                        >
                          {material.materialType === "answer-key"
                            ? `Answer Key — ${material.setLabel}`
                            : "Answer Key"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedMaterial && (
        <div
          className="major-exam-modal-backdrop"
          onClick={() => setSelectedMaterial(null)}
          role="presentation"
        >
          <div
            className="major-exam-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={selectedMaterial.filename}
          >
            <div className="major-exam-modal-header">
              <div>
                <p className="eyebrow">Secure preview</p>
                <h4>{selectedMaterial.filename}</h4>
              </div>
              <button
                type="button"
                className="major-exam-close-button"
                onClick={() => setSelectedMaterial(null)}
              >
                Close
              </button>
            </div>
            <div className="major-exam-viewer-placeholder">
              <strong>Authorized material preview</strong>
              <p>
                This file is restricted to the signed-in student and is validated
                server-side before it can be served.
              </p>
              <p>
                Material type: {selectedMaterial.materialType.replace("-", " ")}
              </p>
              <p>Course: {selectedMaterial.courseName}</p>
              <p>Drive file: {selectedMaterial.driveFileId}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
