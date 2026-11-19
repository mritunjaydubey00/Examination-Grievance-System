import { useEffect, useState } from "react";
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [otherText, setOtherText] = useState("");
  const [touched, setTouched] = useState({});
  const problemOptions = problemTypeOptions[selectedCategory] || [];
  const titleError = title.trim().length > 0 && title.trim().length < 5
    ? "Problem title must be at least 5 characters."
    : "";
  const descriptionError = description.trim().length > 0 && description.trim().length < 20
    ? "Description must be at least 20 characters."
    : "";
  const otherRequired = selectedCategory === "Any Other" || selectedProblem === "Any Other";
  const valid = title.trim().length >= 5 &&
    title.trim().length <= 200 &&
    description.trim().length >= 20 &&
    description.trim().length <= 10000 &&
    Boolean(selectedCategory) &&
    Boolean(selectedProblem) &&
    (!otherRequired || otherText.trim().length >= 3);

  useEffect(() => {
    if (!selectedCategory && !selectedProblem) {
      setTitle("");
      setDescription("");
      setOtherText("");
      setTouched({});
    }
  }, [selectedCategory, selectedProblem]);

  function handleCategoryChange(category) {
    setTouched((current) => ({ ...current, category: true }));
    setOtherText("");
    onCategoryChange(category);
  }

  return (
    <section className="grievance-panel" aria-labelledby="grievance-title">
      <div className="panel-intro">
        <p className="eyebrow">New request</p>
        <h3 id="grievance-title">Submit a grievance</h3>
        <p>Tell us what happened and our examination team will review it.</p>
        <p className="resolution-window-note">
          If the Exam Cell marks your grievance resolved, you will have 48
          hours to accept the resolution or continue the grievance.
        </p>
      </div>
      <form
        className="grievance-form"
        onSubmit={(event) => {
          setTouched({ title: true, description: true, category: true, problem: true, other: true });
          if (!valid) {
            event.preventDefault();
            return;
          }
          onSubmit(event);
        }}
      >
        <div className="form-grid">
          <DropDown
            label="Select category"
            options={categoryOptions}
            selectedOption={selectedCategory}
            onSelect={handleCategoryChange}
          />
          <DropDown
            label="Select problem type"
            options={problemOptions}
            selectedOption={selectedProblem}
            onSelect={onProblemChange}
          />
        </div>
        {otherRequired && (
          <div className="form-field">
            <label htmlFor="otherText">Please specify</label>
            <input
              name="other_text"
              type="text"
              id="otherText"
              required
              minLength="3"
              maxLength="500"
              value={otherText}
              onChange={(event) => setOtherText(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, other: true }))}
            />
            {touched.other && otherText.trim().length < 3 && (
              <span className="login-error" role="alert">Please specify the category or sub-category.</span>
            )}
          </div>
        )}
        <div className="form-field">
          <label htmlFor="subject">Problem title</label>
          <input
            name="title"
            type="text"
            id="subject"
            required
            minLength="5"
            maxLength="200"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, title: true }))}
            placeholder="e.g. Incorrect marks in final result"
          />
          {(touched.title || title.length > 0) && titleError && (
            <span className="login-error" role="alert">{titleError}</span>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea
            name="description"
            id="description"
            rows="5"
            required
            minLength="20"
            maxLength="10000"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, description: true }))}
            placeholder="Include the details that will help us investigate your grievance."
          />
          {(touched.description || description.length > 0) && descriptionError && (
            <span className="login-error" role="alert">{descriptionError}</span>
          )}
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
            disabled={busy || !valid}
          >
            {busy ? "Submitting…" : "Submit grievance"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default GrievanceForm;
