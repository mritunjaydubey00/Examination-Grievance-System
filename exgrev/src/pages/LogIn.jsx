import { useState } from "react";
import { authenticateUser } from "../services/userService.js";

function LogIn({ onLogin }) {
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    let result;
    try {
      result = await authenticateUser(
        formData.get("username"),
        formData.get("password"),
      );
    } catch {
      setError("Could not reach the login service. Please try again later.");
      return;
    }

    if (!result.user) {
      setError(result.error);
      return;
    }

    setError("");
    onLogin(result.user);
  }

  return (
    <main className="login-page">
      <header className="login-intro">
        <p className="eyebrow">Examination grievance system</p>
        <h2>Sign in to your portal</h2>
        <p>Use your institutional account to continue.</p>
      </header>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-heading">
          <h3 id="login-title">Welcome back</h3>
          <p>Enter the User ID and password assigned to your account.</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="userId">User ID</label>
            <input
              type="text"
              id="userId"
              name="username"
              placeholder="Enter your User ID"
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-submit-button">
            Sign in
          </button>
        </form>

        <p className="login-account-types">
          Student <span aria-hidden="true">·</span> Examination Cell{" "}
          <span aria-hidden="true">·</span> Teaching staff
        </p>
      </section>
    </main>
  );
}

export default LogIn;
