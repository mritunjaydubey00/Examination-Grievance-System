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

const RECOVERY_SESSION_KEY = "exgrev.passwordRecovery";

function App() {
  const [profile, setProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(
    () => sessionStorage.getItem(RECOVERY_SESSION_KEY) === "true",
  );
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [loggedInAt, setLoggedInAt] = useState(null);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const normalizedRole = String(profile?.role || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          if (sessionStorage.getItem(RECOVERY_SESSION_KEY) === "true") {
            if (active) setPasswordRecovery(true);
          } else {
            const userProfile = await getAuthenticatedProfile();
            if (active) {
              setProfile(userProfile);
              setLoggedInAt(Date.now());
            }
          }
        } else {
          const hadRecoveryRequest =
            sessionStorage.getItem(RECOVERY_SESSION_KEY) === "true";
          sessionStorage.removeItem(RECOVERY_SESSION_KEY);
          if (active) {
            setPasswordRecovery(false);
            if (hadRecoveryRequest) {
              setAuthError(
                "This password reset link is invalid or has expired. Request a new one.",
              );
            }
          }
        }
      } catch (error) {
        let signOutFailed = false;
        try {
          await signOut();
        } catch {
          signOutFailed = true;
        }
        if (active) {
          setAuthError(
            signOutFailed
              ? "Could not verify your ExGrev account or clear the session. Please try again."
              : error instanceof Error
                ? error.message
                : "Unable to verify your ExGrev account. Please try again.",
          );
        }
      } finally {
        if (active) setAuthChecked(true);
      }
    }
    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          sessionStorage.setItem(RECOVERY_SESSION_KEY, "true");
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
          setPasswordRecovery(true);
          setShowPasswordSettings(false);
          setProfile(null);
          setLoggedInAt(null);
          setAuthChecked(true);
          return;
        }
        if (event === "SIGNED_OUT" || !session) {
          sessionStorage.removeItem(RECOVERY_SESSION_KEY);
          setPasswordRecovery(false);
          setShowPasswordSettings(false);
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
    setAuthError("");
    setPasswordNotice("");
    setPasswordRecovery(false);
    sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    sessionStorage.setItem("exgrev.profile", JSON.stringify(userProfile));
    setProfile(userProfile);
    setLoggedInAt(Date.now());
  }

  async function handlePasswordRecoveryComplete() {
    try {
      await signOut();
      setPasswordNotice(
        "Your password has been reset. Sign in with your new password.",
      );
      setAuthError("");
    } catch {
      const message =
        "Your password was updated, but the recovery session could not be closed securely. Try again or close this browser session.";
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function handleLogout() {
    await signOut();
  }

  return (
    <div className={`app-shell${profile ? "" : " app-shell-auth"}`}>
      {profile && <h1 className="app-wordmark">ExGrev</h1>}
      {!authChecked ? (
        <p className="auth-loading">Checking your session…</p>
      ) : passwordRecovery ? (
        <ChangePassword
          mode="recovery"
          onComplete={handlePasswordRecoveryComplete}
        />
      ) : !profile ? (
        <LogIn
          onLogin={handleLogin}
          authError={authError}
          notice={passwordNotice}
        />
      ) : profile.mustChangePassword ? (
        <ChangePassword
          mode="initial"
          onComplete={(updatedProfile) => setProfile(updatedProfile)}
        />
      ) : showPasswordSettings ? (
        <ChangePassword
          mode="change"
          onCancel={() => setShowPasswordSettings(false)}
          onComplete={(updatedProfile) => {
            setProfile(updatedProfile);
            setShowPasswordSettings(false);
          }}
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
          onChangePassword={() => setShowPasswordSettings(true)}
        />
      ) : ["teaching staff", "teaching", "faculty"].includes(normalizedRole) ? (
        <TeachingStaffPage
          session={profile}
          onLogout={handleLogout}
          onChangePassword={() => setShowPasswordSettings(true)}
        />
      ) : normalizedRole === "student" ? (
        <StudentPage
          session={{ ...profile, uptimeSeconds }}
          onLogout={handleLogout}
          onChangePassword={() => setShowPasswordSettings(true)}
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
      <footer className="app-footer">
        <div className="app-footer-brand">
          <strong>ExGrev: Examination Grievance Portal</strong>
          <span>Madhav Institute of Technology and Science, Gwalior</span>
        </div>
        <p className="app-footer-credit">
          Developed by <strong>Mritunjay Dubey</strong> and{" "}
          <strong>Satwik Singhal</strong>
        </p>
      </footer>
    </div>
  );
}

export default App;
