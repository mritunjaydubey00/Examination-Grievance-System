import PortalHero from "../PortalHero.jsx";

function AdminHeader({ session, onLogout }) {
  return (
    <PortalHero
      eyebrow="Examination cell"
      title={`Welcome, ${session.name || "Examination Cell"}`}
      context={session.department || "Examination administration"}
      session={session}
      onLogout={onLogout}
    />
  );
}

export default AdminHeader;
