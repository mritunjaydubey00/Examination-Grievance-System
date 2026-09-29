import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { useEffect, useState } from "react";
import LogIn from "./pages/LogIn.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import ExaminationCell from "./pages/examinationCell.jsx";
import StudentPage from "./pages/StudentPage.jsx";
import TeachingStaffPage from "./pages/TeachingStaffPage.jsx";
import { supabase } from "./lib/supabase.js";
import { getAuthenticatedProfile, signOut } from "./services/userService.js";

function App() {
  const [profile, setProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedInAt, setLoggedInAt] = useState(null);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const normalizedRole = String(profile?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const userProfile = await getAuthenticatedProfile();
        if (active) {
          setProfile(userProfile);
          setLoggedInAt(Date.now());
        }
      }
      if (active) setAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setProfile(null);
          setLoggedInAt(null);
          setAuthChecked(true);
        }
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loggedInAt) return undefined;
    const timer = window.setInterval(() => {
      setUptimeSeconds(
        Math.max(0, Math.floor((Date.now() - loggedInAt) / 1000)),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loggedInAt]);

  function handleLogin(userProfile) {
    sessionStorage.setItem("exgrev.profile", JSON.stringify(userProfile));
    setProfile(userProfile);
    setLoggedInAt(Date.now());
  }

  async function handleLogout() {
    await signOut();
  }

  return (
    <>
      <h1 className="app-wordmark">ExGrev</h1>
      {!authChecked ? (
        <p className="auth-loading">Checking your session…</p>
      ) : !profile ? (
        <LogIn onLogin={handleLogin} />
      ) : profile.mustChangePassword ? (
        <ChangePassword
          onComplete={(updatedProfile) => setProfile(updatedProfile)}
        />
      ) : [
          "examination cell",
          "exam cell",
          "admin",
          "exam cell admin",
        ].includes(normalizedRole) ? (
        <ExaminationCell
          session={{ ...profile, uptimeSeconds }}
          onLogout={handleLogout}
        />
      ) : ["teaching staff", "teaching", "faculty"].includes(normalizedRole) ? (
        <TeachingStaffPage session={profile} onLogout={handleLogout} />
      ) : normalizedRole === "student" ? (
        <StudentPage
          session={{ ...profile, uptimeSeconds }}
          onLogout={handleLogout}
        />
      ) : (
        <main className="auth-panel" role="alert">
          <h2>Account type not recognized</h2>
          <p className="auth-description">
            Your account must have an Ex Factor of Student, Examination Cell, or
            Teaching staff.
          </p>
          <button
            type="button"
            className="submit-button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </main>
      )}
    </>
  );
}

export default App;
