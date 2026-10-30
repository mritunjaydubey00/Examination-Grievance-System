import { useEffect, useState } from "react";
import {
  authenticateUser,
  signInWithGoogle,
} from "../services/userService.js";
import LoginIntro from "../components/LogIn/LoginIntro.jsx";
import LoginForm from "../components/LogIn/LoginForm.jsx";
import ForgotPassword from "./ForgotPassword.jsx";

function getOAuthError() {
  const parameters = new URLSearchParams(
    window.location.hash.slice(1) || window.location.search.slice(1),
  );
  const error = parameters.get("error");
  if (!error) return "";

  const description = parameters.get("error_description")?.toLowerCase() ?? "";
  if (
    parameters.get("error_code") === "otp_expired" ||
    description.includes("expired")
  ) {
    return "This password recovery link is invalid or has expired. Request a new one.";
  }
  if (
    description.includes("approved") ||
    description.includes("signups not allowed") ||
    parameters.get("error_code") === "signup_disabled"
  ) {
    return "This Google account is not approved for ExGrev. Contact your administrator.";
  }
  if (error === "access_denied") {
    return "Google sign-in was cancelled or this account is not approved for ExGrev.";
  }
  return "Google sign-in could not be completed. Please try again.";
}

function LogIn({ onLogin, authError = "", notice = "" }) {
  const [error, setError] = useState(() => getOAuthError() || authError);
  const [busy, setBusy] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const parameters = new URLSearchParams(
      window.location.hash.slice(1) || window.location.search.slice(1),
    );
    if (parameters.has("error")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await authenticateUser(
        formData.get("identifier"),
        formData.get("password"),
      );
      if (!result.user) {
        setError(result.error);
        return;
      }

      onLogin(result.user);
    } catch {
      setError("Could not reach the login service. Please try again later.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setBusy(true);
    try {
      const { error: signInError } = await signInWithGoogle();
      if (signInError) {
        setError(signInError);
        setBusy(false);
      }
    } catch {
      setError("Could not reach the login service. Please try again later.");
      setBusy(false);
    }
  }

  return (
    <>
      <header className="auth-page-header">
        <span className="auth-page-brand">ExGrev</span>
      </header>
      <main className="login-page">
        <LoginIntro />
        <div className="login-content">
          {showForgotPassword ? (
            <ForgotPassword onBack={() => setShowForgotPassword(false)} />
          ) : (
            <LoginForm
              onSubmit={handleLogin}
              onGoogleSignIn={handleGoogleSignIn}
              onForgotPassword={() => {
                setError("");
                setShowForgotPassword(true);
              }}
              error={error}
              notice={notice}
              busy={busy}
            />
          )}
        </div>
      </main>
    </>
  );
}

export default LogIn;
