import { useEffect, useState } from "react";
import {
  authenticateUser,
  signInWithGoogle,
} from "../services/userService.js";
import LoginIntro from "../components/LogIn/LoginIntro.jsx";
import LoginForm from "../components/LogIn/LoginForm.jsx";

function getOAuthError() {
  const parameters = new URLSearchParams(
    window.location.hash.slice(1) || window.location.search.slice(1),
  );
  const error = parameters.get("error");
  if (!error) return "";

  const description = parameters.get("error_description")?.toLowerCase() ?? "";
  const errorCode = parameters.get("error_code")?.toLowerCase() ?? "";
  if (
    errorCode.includes("provider") ||
    description.includes("unsupported provider") ||
    description.includes("provider is not enabled")
  ) {
    return "Google sign-in is not enabled for this Supabase project. Enable the Google provider and configure its client ID and secret in Supabase Auth.";
  }
  if (
    description.includes("approved") ||
    description.includes("signups not allowed") ||
    description.includes("database error saving new user") ||
    errorCode === "signup_disabled"
  ) {
    return "Supabase rejected this Google account. Check that the signed-in Google email exactly matches a row in public.users and that its Ex Factor is valid; confirm the approved-users migration is applied.";
  }
  if (error === "access_denied") {
    return "Google sign-in was cancelled or rejected. If you did not cancel, check that the signed-in Google email is listed in public.users with a valid Ex Factor.";
  }
  if (
    description.includes("redirect_uri_mismatch") ||
    description.includes("redirect uri")
  ) {
    return "Google rejected the redirect URL. Add the Supabase callback URL to the Google OAuth client's authorized redirect URIs and add this app URL to Supabase's allowed redirect URLs.";
  }
  return "Google sign-in could not be completed. Check the Google provider credentials and redirect URL settings in Supabase, then try again.";
}

function LogIn({ onLogin, authError = "" }) {
  const [error, setError] = useState(() => getOAuthError() || authError);
  const [busy, setBusy] = useState(false);

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
    <main className="login-page">
      <LoginIntro />
      <LoginForm
        onSubmit={handleLogin}
        onGoogleSignIn={handleGoogleSignIn}
        error={error}
        busy={busy}
      />
    </main>
  );
}

export default LogIn;
