import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { useEffect, useState } from "react";
import LogIn from "./pages/LogIn.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import StudentPage from "./pages/StudentPage.jsx";
import { supabase } from "./lib/supabase.js";
import { getAuthenticatedProfile, signOut } from "./services/userService.js";

function App() {
  const [profile, setProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedInAt, setLoggedInAt] = useState(null);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

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

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setProfile(null);
        setLoggedInAt(null);
        setAuthChecked(true);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loggedInAt) return undefined;
    const timer = window.setInterval(() => {
      setUptimeSeconds(Math.max(0, Math.floor((Date.now() - loggedInAt) / 1000)));
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
      <h1>ExGrev</h1>
      {!authChecked ? (
        <p className="auth-loading">Checking your session…</p>
      ) : !profile ? (
        <LogIn onLogin={handleLogin} />
      ) : profile.mustChangePassword ? (
        <ChangePassword onComplete={(updatedProfile) => setProfile(updatedProfile)} />
      ) : (
        <StudentPage
          session={{ ...profile, uptimeSeconds }}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}

export default App;
