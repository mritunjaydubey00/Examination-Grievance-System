import { useState } from "react";
import { categoryOptions, problemTypeOptions } from "../data/tagOptions.js";
import DropDown from "../components/StudentPage/DropDown.jsx";

function StudentPage({ session, onLogout }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const problemOptions = problemTypeOptions[selectedCategory] || [];

  function handleCategorySelect(category) {
    setSelectedCategory(category);
    setSelectedProblem("");
  }

  return (
    <main className="student-page">
      <header className="student-header">
        <div>
          <p className="eyebrow">Student portal</p>
          <h2>Welcome, {session.name}</h2>
          <p className="student-context">
            {session.branch} <span aria-hidden="true">/</span>{" "}
            {session.department}
          </p>
        </div>
        <div className="student-header-actions">
          <div className="session-status">
            <span className="status-dot" aria-hidden="true" />
            <span>Session active</span>
            <strong>{session.uptimeSeconds}s</strong>
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

        <form className="grievance-form">
          <div className="form-grid">
            <DropDown
              label="Select category"
              options={categoryOptions}
              selectedOption={selectedCategory}
              onSelect={handleCategorySelect}
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
              type="text"
              id="subject"
              placeholder="e.g. Incorrect marks in final result"
            />
          </div>

          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows="5"
              placeholder="Include the details that will help us investigate your grievance."
            />
          </div>

          <div className="form-footer">
            <p>Your submission will be linked to your student account.</p>
            <button type="submit" className="submit-button">
              Submit grievance
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default StudentPage;
