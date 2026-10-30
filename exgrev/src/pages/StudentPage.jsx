import { useCallback, useEffect, useState } from "react";
import {
  createGrievance,
  listStudentGrievances,
} from "../services/grievanceService.js";
import { supabase } from "../lib/supabase.js";
import StudentHeader from "../components/StudentPage/StudentHeader.jsx";
import GrievanceForm from "../components/StudentPage/GrievanceForm.jsx";
import GrievanceHistory from "../components/StudentPage/GrievanceHistory.jsx";
import GrievanceThreadPage from "./GrievanceThreadPage.jsx";

function StudentPage({ session, onLogout, embedded = false, view = "all" }) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProblem, setSelectedProblem] = useState("");
  const [grievances, setGrievances] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [threadGrievanceId, setThreadGrievanceId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setGrievances(await listStudentGrievances(session.userId));
    } catch (error) {
      setMessage(error.message || "Could not load your grievances.");
    }
  }, [session.userId]);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`student-grievances-${session.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "grievances",
          filter: `student_user_id=eq.${session.userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grievance_events" },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, session.userId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await createGrievance({
        userId: session.userId,
        subject: form.get("subject"),
        description: form.get("description"),
        category: selectedCategory,
        problemType: selectedProblem,
        files: form.getAll("documents").filter((file) => file.size > 0),
      });
      formElement.reset();
      setSelectedCategory("");
      setSelectedProblem("");
      setMessage("Grievance submitted successfully.");
      await refresh();
    } catch (error) {
      setMessage(error.message || "Could not submit your grievance.");
    } finally {
      setBusy(false);
    }
  }

  if (threadGrievanceId) {
    return (
      <GrievanceThreadPage
        grievanceId={threadGrievanceId}
        session={session}
        onBack={() => setThreadGrievanceId(null)}
        onLogout={onLogout}
      />
    );
  }

  return (
    <main className={`student-page${embedded ? " embedded" : ""}`}>
      {!embedded && <StudentHeader session={session} onLogout={onLogout} />}
      {view !== "mine" && (
        <GrievanceForm
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedProblem={selectedProblem}
          onProblemChange={setSelectedProblem}
          busy={busy}
          message={message}
          onSubmit={handleSubmit}
        />
      )}
      {view !== "new" && (
        <GrievanceHistory
          grievances={grievances}
          onOpenThread={(grievance) => setThreadGrievanceId(grievance.id)}
        />
      )}
    </main>
  );
}

export default StudentPage;
