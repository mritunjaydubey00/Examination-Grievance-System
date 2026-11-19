import { useMemo, useState } from "react";
import {
  DEFAULT_MAJOR_EXAM_CYCLE_ID,
  MAJOR_EXAM_CYCLES,
} from "../data/majorExamData.js";
import {
  listExamCellMaterialInventory,
  setExaminationSessionStatus,
  toggleMaterialPublication,
} from "../services/majorExamService.js";
import "./MajorExamMaterials.css";

export default function MajorExamMaterialAdmin() {
  const [cycleId, setCycleId] = useState(DEFAULT_MAJOR_EXAM_CYCLE_ID);
  const [materials, setMaterials] = useState(() => listExamCellMaterialInventory(cycleId));
  const cycle = useMemo(
    () =>
      MAJOR_EXAM_CYCLES.find((entry) => entry.id === cycleId) ||
      MAJOR_EXAM_CYCLES[0],
    [cycleId],
  );

  const refresh = () => setMaterials(listExamCellMaterialInventory(cycleId));

  const publishedCount = materials.filter(
    (material) => material.publicationStatus === "published",
  ).length;
  const unmappedCount = materials.filter((material) => !material.mapped).length;
  const pendingCount = materials.filter(
    (material) => material.publicationStatus !== "published",
  ).length;

  return (
    <section className="major-exam-page admin-materials-page" aria-label="Major Examination Materials Dashboard">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Administrative dashboard</p>
          <h3>Major Examination Materials</h3>
        </div>
        <label className="major-exam-cycle-picker">
          <span>Examination cycle</span>
          <select
            value={cycleId}
            onChange={(event) => {
              setCycleId(event.target.value);
              setMaterials(listExamCellMaterialInventory(event.target.value));
            }}
          >
            {MAJOR_EXAM_CYCLES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="major-exam-summary">
        <div>
          <p className="eyebrow">Active cycle</p>
          <strong>{cycle.name}</strong>
        </div>
        <div>
          <p className="eyebrow">Published materials</p>
          <strong>{publishedCount}</strong>
        </div>
        <div>
          <p className="eyebrow">Pending publication</p>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <p className="eyebrow">Unmapped files</p>
          <strong>{unmappedCount}</strong>
        </div>
      </div>

      <div className="major-exam-table-wrap">
        <table className="major-exam-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Material</th>
              <th>Department</th>
              <th>Branch</th>
              <th>Session Status</th>
              <th>Publication</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td>
                  <strong>{material.course?.courseName || material.courseName}</strong>
                  <div className="major-exam-secondary-label">{material.courseCode}</div>
                </td>
                <td>
                  <span>{material.materialType === "question-paper" ? "Question Paper" : "Answer Key"}</span>
                  <div className="major-exam-secondary-label">{material.setLabel}</div>
                </td>
                <td>{material.department}</td>
                <td>{material.branch}</td>
                <td>
                  <select
                    value={material.session?.status || "scheduled"}
                    onChange={(event) => {
                      const result = setExaminationSessionStatus(
                        material.session?.id,
                        event.target.value,
                      );
                      if (result.success) {
                        refresh();
                      }
                    }}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rescheduled">Rescheduled</option>
                  </select>
                </td>
                <td>
                  <span className={`major-exam-publish state-${material.publicationStatus}`}>
                    {material.publicationStatus}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="major-exam-button secondary"
                    onClick={() => {
                      const nextStatus =
                        material.publicationStatus === "published"
                          ? "unpublished"
                          : "published";
                      const result = toggleMaterialPublication(material.id, nextStatus);
                      if (result.success) {
                        refresh();
                      }
                    }}
                  >
                    {material.publicationStatus === "published"
                      ? "Unpublish"
                      : "Publish"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
