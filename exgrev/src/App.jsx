import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LogIn from "./pages/LogIn.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import ExaminationCell from "./pages/examinationCell.jsx";
import StudentPage from "./pages/StudentPage.jsx";
import TeachingStaffPage from "./pages/TeachingStaffPage.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import { examCellMenu, facultyMenu, studentMenu } from "./config/menuConfig.js";
import {
  ComingSoonPage,
  ContentManagementPage,
  DashboardPage,
  PortalContentPage,
} from "./pages/PortalPages.jsx";
import { supabase } from "./lib/supabase.js";
import { getAuthenticatedProfile, signOut } from "./services/userService.js";

const roleDetails = {
  student: { basePath: "/student", label: "Student", menu: studentMenu },
  faculty: { basePath: "/faculty", label: "Faculty", menu: facultyMenu },
  examcell: { basePath: "/examcell", label: "Exam Cell", menu: examCellMenu },
};

function App() {
  const [profile, setProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");
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
          const userProfile = await getAuthenticatedProfile();
          if (active) {
            setProfile(userProfile);
            setLoggedInAt(Date.now());
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
    setAuthError("");
    sessionStorage.setItem("exgrev.profile", JSON.stringify(userProfile));
    setProfile(userProfile);
    setLoggedInAt(Date.now());
  }

  async function handleLogout() {
    await signOut();
  }

  const roleKey = [
    "examination cell",
    "exam cell",
    "admin",
    "exam cell admin",
  ].includes(normalizedRole)
    ? "examcell"
    : ["teaching staff", "teaching", "faculty"].includes(normalizedRole)
      ? "faculty"
      : normalizedRole === "student"
        ? "student"
        : null;
  const role = roleKey ? roleDetails[roleKey] : null;

  return (
    <>
      {(!authChecked || !profile || profile.mustChangePassword) && (
        <h1 className="app-wordmark">ExGrev</h1>
      )}
      {!authChecked ? (
        <p className="auth-loading">Checking your session…</p>
      ) : !profile ? (
        <LogIn onLogin={handleLogin} authError={authError} />
      ) : profile.mustChangePassword ? (
        <ChangePassword
          onComplete={(updatedProfile) => setProfile(updatedProfile)}
        />
      ) : role ? (
        <Routes>
          <Route
            element={
              <DashboardLayout
                menuItems={role.menu}
                profile={profile}
                roleLabel={role.label}
                onLogout={handleLogout}
              />
            }
          >
            <Route
              path={role.basePath}
              element={
                <Navigate to={`${role.basePath}/dashboard`} replace />
              }
            />
            <Route
              path={`${role.basePath}/dashboard`}
              element={
                <DashboardPage roleLabel={role.label} basePath={role.basePath} />
              }
            />
            <Route
              path={`${role.basePath}/guidelines`}
              element={
                <PortalContentPage
                  contentType="guideline"
                  title="Guidelines"
                />
              }
            />
            <Route
              path={`${role.basePath}/profile`}
              element={<ComingSoonPage title="Profile" />}
            />
            <Route
              path={`${role.basePath}/notices`}
              element={
                <PortalContentPage contentType="notice" title="Notice Board" />
              }
            />
            {roleKey === "examcell" && (
              <Route
                path="/examcell/content-management"
                element={<ContentManagementPage />}
              />
            )}
            {roleKey === "student" ? (
              <>
                <Route
                  path="/student/grievances/new"
                  element={
                    <StudentPage
                      session={{ ...profile, uptimeSeconds }}
                      onLogout={handleLogout}
                      embedded
                      view="new"
                    />
                  }
                />
                <Route
                  path="/student/grievances/mine"
                  element={
                    <StudentPage
                      session={{ ...profile, uptimeSeconds }}
                      onLogout={handleLogout}
                      embedded
                      view="mine"
                    />
                  }
                />
              </>
            ) : roleKey === "faculty" ? (
              <>
                <Route
                  path="/faculty/grievances/active"
                  element={
                    <TeachingStaffPage
                      session={profile}
                      onLogout={handleLogout}
                      embedded
                      view="active"
                    />
                  }
                />
                <Route
                  path="/faculty/grievances/resolved"
                  element={
                    <TeachingStaffPage
                      session={profile}
                      onLogout={handleLogout}
                      embedded
                      view="resolved"
                    />
                  }
                />
              </>
            ) : (
              <>
                <Route
                  path="/examcell/grievances/active"
                  element={
                    <ExaminationCell
                      session={{ ...profile, uptimeSeconds }}
                      onLogout={handleLogout}
                      embedded
                      view="active"
                    />
                  }
                />
                <Route
                  path="/examcell/grievances/resolved"
                  element={
                    <ExaminationCell
                      session={{ ...profile, uptimeSeconds }}
                      onLogout={handleLogout}
                      embedded
                      view="resolved"
                    />
                  }
                />
              </>
            )}
            <Route
              path="*"
              element={
                <Navigate to={`${role.basePath}/dashboard`} replace />
              }
            />
          </Route>
        </Routes>
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
