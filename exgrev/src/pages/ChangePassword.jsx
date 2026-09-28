import { useState } from "react";
import { changePassword } from "../services/userService.js";

function ChangePassword({ onComplete }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      setSaving(false);
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      setSaving(false);
      return;
    }

    try {
      const profile = await changePassword(password);
      if (!profile) throw new Error("Could not load your account profile.");
      onComplete(profile);
    } catch (changeError) {
      setError(changeError.message || "Could not update your password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-panel">
      <p className="eyebrow">First sign-in</p>
      <h2>Create your password</h2>
      <p className="auth-description">
        Choose a personal password before continuing to the student portal.
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>New password</span>
          <input name="newPassword" type="password" autoComplete="new-password" minLength="8" required />
        </label>
        <label className="form-field">
          <span>Confirm new password</span>
          <input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" required />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="submit-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save password"}
        </button>
      </form>
    </main>
  );
}

export default ChangePassword;
