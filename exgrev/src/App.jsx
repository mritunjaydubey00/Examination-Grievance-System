import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { useEffect, useState } from "react";
import LogIn from "./pages/LogIn.jsx";
import StudentPage from "./pages/StudentPage.jsx";
import {
  clearUserSession,
  getUserSession,
} from "./logic/LogIn/loggedInUser.js";

function App() {
  const [session, setSession] = useState(() => getUserSession());
  const loggedInAt = session?.loggedInAt;

  useEffect(() => {
    if (!loggedInAt) {
      return undefined;
    }

    const updateUptime = () => setSession(getUserSession());
    const intervalId = window.setInterval(updateUptime, 1000);

    return () => window.clearInterval(intervalId);
  }, [loggedInAt]);

  function handleLogout() {
    clearUserSession();
    setSession(null);
  }

  return (
    <>
      <h1>ExGrev</h1>
      {session ? (
        <StudentPage session={session} onLogout={handleLogout} />
      ) : (
        <LogIn onLogin={setSession} />
      )}
    </>
  );
}

export default App;
