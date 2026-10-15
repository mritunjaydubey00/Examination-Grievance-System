import { categoryOptions, problemTypeOptions } from "../../data/tagOptions.js";
import DropDown from "./DropDown.jsx";

function GrievanceForm({
  selectedCategory,
  onCategoryChange,
  selectedProblem,
  onProblemChange,
  busy,
  message,
  onSubmit,
}) {
  const problemOptions = problemTypeOptions[selectedCategory] || [];

  return (
    <section className="grievance-panel" aria-labelledby="grievance-title">
      <div className="panel-intro">
        <p className="eyebrow">New request</p>
        <h3 id="grievance-title">Submit a grievance</h3>
        <p>Tell us what happened and our examination team will review it.</p>
      </div>
      <form className="grievance-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <DropDown
            label="Select category"
            options={categoryOptions}
            selectedOption={selectedCategory}
            onSelect={onCategoryChange}
          />
          <DropDown
            label="Select problem type"
            options={problemOptions}
            selectedOption={selectedProblem}
            onSelect={onProblemChange}
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
  );
}

export default GrievanceForm;
