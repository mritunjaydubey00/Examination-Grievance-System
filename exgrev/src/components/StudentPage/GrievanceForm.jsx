import { useEffect, useState } from "react";
import {
  categoryOptions,
  otherCategoryValue,
  problemTypeOptions,
} from "../../data/tagOptions.js";
import DropDown from "./DropDown.jsx";

function GrievanceForm({
  selectedCategory,
  onCategoryChange,
  selectedProblem,
  onProblemChange,
  busy,
  message,
  resetVersion,
  onSubmit,
}) {
  const problemOptions = problemTypeOptions[selectedCategory] || [];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [otherText, setOtherText] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const requiresOtherText =
    selectedCategory === otherCategoryValue ||
    selectedProblem === otherCategoryValue;

  useEffect(() => {
    setTitle("");
    setDescription("");
    setOtherText("");
    setValidationErrors({});
    setTouched({});
    setSubmitted(false);
  }, [resetVersion]);

  function validate(
    next = {},
    category = selectedCategory,
    subCategory = selectedProblem,
  ) {
    const values = {
      title: next.title ?? title,
      description: next.description ?? description,
      otherText: next.otherText ?? otherText,
    };
    const errors = {};
    if (values.title.trim().length < 5) {
      errors.title = "Enter a problem title with at least 5 non-space characters.";
    }
    if (values.title.trim().length > 200) {
      errors.title = "The problem title cannot exceed 200 characters.";
    }
    if (values.description.trim().length < 20) {
      errors.description = "Enter a description with at least 20 non-space characters.";
    }
    if (values.description.trim().length > 10000) {
      errors.description = "The description cannot exceed 10,000 characters.";
    }
    if (
      (category === otherCategoryValue || subCategory === otherCategoryValue) &&
      !values.otherText.trim()
    ) {
      errors.otherText = "Please specify the other category or sub-category.";
    }
    return errors;
  }

  function updateField(field, value, setter) {
    setter(value);
    if (submitted || touched[field]) {
      setValidationErrors(
        validate({
          [field]: value,
          ...(field === "title" ? {} : { title }),
          ...(field === "description" ? {} : { description }),
          ...(field === "otherText" ? {} : { otherText }),
        }),
      );
    }
  }

  function handleCategorySelect(category) {
    setOtherText("");
    onCategoryChange(category);
    if (submitted || touched.otherText) {
      setValidationErrors(validate({ otherText: "" }, category, ""));
    }
  }

  function handleProblemSelect(problem) {
    setOtherText("");
    onProblemChange(problem);
    if (submitted || touched.otherText) {
      setValidationErrors(
        validate({ otherText: "" }, selectedCategory, problem),
      );
    }
  }

  function handleBlur(field) {
    setTouched((current) => ({ ...current, [field]: true }));
    setValidationErrors(validate());
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    const errors = validate();
    setValidationErrors(errors);
    if (Object.keys(errors).length || !selectedCategory || !selectedProblem) {
      return;
    }
    onSubmit(event);
  }

  const formIsValid =
    title.trim().length >= 5 &&
    title.trim().length <= 200 &&
    description.trim().length >= 20 &&
    description.trim().length <= 10000 &&
    selectedCategory &&
    selectedProblem &&
    (!requiresOtherText || Boolean(otherText.trim()));

  return (
    <section className="grievance-panel" aria-labelledby="grievance-title">
      <div className="panel-intro">
        <p className="eyebrow">New request</p>
        <h3 id="grievance-title">Add New Grievance</h3>
        <p>Tell us what happened and our examination team will review it.</p>
        <p className="resolution-window-note">
          If the Exam Cell marks your grievance resolved, you will have 48
          hours to accept the resolution or continue the grievance.
        </p>
      </div>
      <form className="grievance-form" onSubmit={handleFormSubmit} noValidate>
        <div className="form-grid">
          <DropDown
            label="Category *"
            options={categoryOptions}
            selectedOption={selectedCategory}
            onSelect={handleCategorySelect}
          />
          <DropDown
            label="Sub-category *"
            options={problemOptions}
            selectedOption={selectedProblem}
            onSelect={handleProblemSelect}
          />
        </div>
        <div className="form-field">
          <label htmlFor="subject">Problem Title</label>
          <input
            name="title"
            type="text"
            id="subject"
            required
            minLength="5"
            maxLength="200"
            value={title}
            onChange={(event) =>
              updateField("title", event.target.value, setTitle)
            }
            onBlur={() => handleBlur("title")}
            placeholder="e.g. Incorrect marks in final result"
          />
          {validationErrors.title && (
            <p className="form-validation-error" role="alert">
              {validationErrors.title}
            </p>
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
            onChange={(event) =>
              updateField("description", event.target.value, setDescription)
            }
            onBlur={() => handleBlur("description")}
            placeholder="Include the details that will help us investigate your grievance."
          />
          {validationErrors.description && (
            <p className="form-validation-error" role="alert">
              {validationErrors.description}
            </p>
          )}
        </div>
        {requiresOtherText && (
          <div className="form-field">
            <label htmlFor="other-text">Please specify</label>
            <input
              id="other-text"
              name="otherText"
              type="text"
              required
              maxLength="500"
              value={otherText}
              onChange={(event) =>
                updateField("otherText", event.target.value, setOtherText)
              }
              onBlur={() => handleBlur("otherText")}
            />
            {validationErrors.otherText && (
              <p className="form-validation-error" role="alert">
                {validationErrors.otherText}
              </p>
            )}
          </div>
        )}
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
            disabled={busy || !formIsValid}
          >
            {busy ? "Submitting…" : "Submit grievance"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default GrievanceForm;
