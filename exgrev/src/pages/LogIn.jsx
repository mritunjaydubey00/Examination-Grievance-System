import { useState } from "react";
import { authenticateUser } from "../services/userService.js";

function LogIn({ onLogin }) {
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await authenticateUser(
      formData.get("username"),
      formData.get("password"),
    );

    if (!result.user) {
      setError(result.error);
      return;
    }

    setError("");
    onLogin(result.user);
  }

  return (
    <>
      <div className="bg bg-primary text-white p-3 m-3 rounded">
        <h4>Login</h4>
        <div className="d-flex flex-column gap-2">
          <form className="row m-3" onSubmit={handleLogin}>
            <label htmlFor="userId" className="col-sm-2 col-form-label ">
              User ID
            </label>
            <div className="col-sm-10">
              <input
                type="text"
                className="form-control"
                id="userId"
                name="username"
                placeholder="Enter your user ID"
                autoComplete="username"
                required
              />
            </div>
            <label htmlFor="password" className="col-sm-2 col-form-label">
              Password
            </label>
            <div className="col-sm-10">
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="text-warning mb-0">{error}</p>}
            <button
              type="submit"
              className="btn btn-success w-25 m-3 align-self-center"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default LogIn;
