import PortalHero from "../PortalHero.jsx";

function TeachingStaffHeader({ session, onLogout }) {
  return (
    <PortalHero
      eyebrow="Teaching staff portal"
      title={`Welcome, ${session.name || "Teaching staff"}`}
      context={[session.branch, session.department].filter(Boolean).join("  /  ")}
      session={session}
      onLogout={onLogout}
    />
  );
}

export default TeachingStaffHeader;
