import { useState } from "react";
import { requestPasswordReset } from "../services/userService.js";

function ForgotPassword({ onBack }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);

    const form = new FormData(event.currentTarget);
    try {
      await requestPasswordReset(form.get("email"));
      setMessage(
        "If an account exists for that email, a password reset link will be sent.",
      );
    } catch {
      setError(
        "We could not process the request right now. Check the email and try again later.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login-panel" aria-labelledby="forgot-password-title">
      <div className="login-panel-heading">
        <h3 id="forgot-password-title">Reset your password</h3>
        <p>Enter the email address associated with your ExGrev account.</p>
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-field">
          <label htmlFor="recovery-email">Email address</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength="254"
            required
          />
        </div>
        {message && (
          <p className="auth-success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="login-submit-button"
          disabled={busy}
        >
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <button
        type="button"
        className="text-button login-back-button"
        onClick={onBack}
        disabled={busy}
      >
        Back to sign in
      </button>
    </section>
  );
}

export default ForgotPassword;
