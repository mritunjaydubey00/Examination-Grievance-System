import { useState } from "react";
import { authenticateUser } from "../services/userService.js";
import LoginIntro from "../components/LogIn/LoginIntro.jsx";
import LoginForm from "../components/LogIn/LoginForm.jsx";

function LogIn({ onLogin }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  return (
    <main className="login-page">
      <LoginIntro />
      <LoginForm onSubmit={handleLogin} error={error} busy={busy} />
    </main>
  );
}

export default LogIn;
