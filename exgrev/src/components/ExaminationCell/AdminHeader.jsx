import PortalHero from "../PortalHero.jsx";

function AdminHeader({ session }) {
  return (
    <PortalHero
      eyebrow="Examination cell"
      title={`Welcome, ${session.name || "Examination Cell"}`}
      context={session.department || "Examination administration"}
      session={session}
    />
  );
}

export default AdminHeader;
