import { useState } from "react";
import { categoryOptions, problemTypeOptions } from "../data/tagOptions.js";
import DropDown from "../components/StudentPage/DropDown.jsx";

function StudentPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const problemOptions = problemTypeOptions[selectedCategory] || [];

  function handleCategorySelect(category) {
    setSelectedCategory(category);
    setSelectedProblem("");
  }

  return (
    <>
      <div className="bg bg-primary text-white p-3 m-3 rounded">
        <h3>Welcome, User !</h3>
        <div className="d-flex flex-column gap-2">
          <p>Submit Your Grievances Here</p>
          <form>
            <div className="row g-3 mb-3">
              <DropDown
                label="Select Category"
                options={categoryOptions}
                selectedOption={selectedCategory}
                onSelect={handleCategorySelect}
              />
              <DropDown
                label="Select Problem Type"
                options={problemOptions}
                selectedOption={selectedProblem}
                onSelect={setSelectedProblem}
              />
            </div>
            <label htmlFor="subject" className="form-label">
              Subject
            </label>
            <input
              type="text"
              className="form-control"
              id="subject"
              placeholder="Enter the subject of your grievance"
            />
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              className="form-control"
              id="description"
              rows="3"
              placeholder="Enter the description of your grievance"
            ></textarea>
            <div className="d-flex justify-content-center mt-3">
              <section className="row">
                <div className="col-sm-6 d-flex justify-content-start">
                  <button type="submit" className="btn btn-success">
                    Submit Grievance
                  </button>
                </div>
              </section>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default StudentPage;
