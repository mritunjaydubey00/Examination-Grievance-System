import PortalHero from "../PortalHero.jsx";

function StudentHeader({ session, onLogout }) {
  return (
    <PortalHero
      eyebrow="Student portal"
      title={`Welcome, ${session.name || "Student"}`}
      context={[session.branch, session.department].filter(Boolean).join("  /  ")}
      session={session}
      onLogout={onLogout}
    />
  );
}

export default StudentHeader;
