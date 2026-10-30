import { useState } from "react";
import PasswordFields from "../components/PasswordFields.jsx";
import {
  changePassword,
  changeSignedInPassword,
  resetPassword,
} from "../services/userService.js";

const MIN_PASSWORD_LENGTH = 12;

function ChangePassword({ mode = "initial", onComplete, onCancel }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isRecovery = mode === "recovery";
  const isSignedInChange = mode === "change";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const password = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      setSaving(false);
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      setSaving(false);
      return;
    }
    if (isSignedInChange && password === currentPassword) {
      setError("Choose a new password that differs from your current one.");
      setSaving(false);
      return;
    }

    try {
      if (isRecovery) {
        await resetPassword(password);
        await onComplete();
        return;
      }

      const profile = isSignedInChange
        ? await changeSignedInPassword(currentPassword, password)
        : await changePassword(password);
      if (!profile) throw new Error("Could not load your account profile.");
      onComplete(profile);
    } catch (changeError) {
      const knownMessage = [
        "The current password is incorrect.",
        "Your session has expired. Sign in again to continue.",
        "This password reset link is invalid or has expired.",
        "Your password was updated, but the recovery session could not be closed securely. Try again or close this browser session.",
      ].find((message) => message === changeError.message);
      setError(
        knownMessage ||
          "Could not update your password. Choose a stronger password and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const title = isRecovery
    ? "Choose a new password"
    : isSignedInChange
      ? "Change your password"
      : "Create your password";
  const description = isRecovery
    ? "Set a new password to secure your ExGrev account."
    : isSignedInChange
      ? "Confirm your current password before choosing a new one."
      : "Choose a personal password before continuing to your portal.";

  return (
    <main className="auth-panel" aria-labelledby="password-title">
      <p className="eyebrow">
        {isRecovery ? "Password recovery" : isSignedInChange ? "Account security" : "First sign-in"}
      </p>
      <h2 id="password-title">{title}</h2>
      <p className="auth-description">{description}</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <PasswordFields requireCurrentPassword={isSignedInChange} />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="submit-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : isRecovery ? "Reset password" : "Save password"}
        </button>
      </form>
      {onCancel && (
        <button
          type="button"
          className="text-button password-cancel-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      )}
    </main>
  );
}

export default ChangePassword;
