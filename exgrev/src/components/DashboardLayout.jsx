import { useState } from "react";
import { Menu } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import "./DashboardLayout.css";

function DashboardLayout({
  menuItems,
  profile,
  roleLabel,
  onLogout,
  pageTitle,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title =
    pageTitle ||
    menuItems
      .flatMap((item) => [item, ...(item.children || [])])
      .find((item) => item.path === location.pathname)?.label ||
    "Dashboard";

  return (
    <div className="portal-layout">
      <Sidebar
        menuItems={menuItems}
        profile={profile}
        roleLabel={roleLabel}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
      />
      <div className="portal-main">
        <header className="portal-topbar">
          <button
            aria-label="Open navigation menu"
            className="portal-menu-button"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" size={21} />
          </button>
          <h1>{title}</h1>
          <div className="portal-topbar-role">{roleLabel} portal</div>
        </header>
        <main className="portal-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
