import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

function App() {
  return (
    <>
      <h1>ExGrev</h1>
      <div className="bg bg-primary text-white p-3 m-3 rounded">
        <h3>Welcome, User !</h3>
        <div className="d-flex flex-column gap-2">
          <p>Submit Your Grievances Here</p>
          <form>
            <label for="subject" className="form-label">
              Subject
            </label>
            <input
              type="text"
              className="form-control"
              id="subject"
              placeholder="Enter the subject of your grievance"
            />
          </form>
        </div>
      </div>
    </>
  );
}

export default App;
