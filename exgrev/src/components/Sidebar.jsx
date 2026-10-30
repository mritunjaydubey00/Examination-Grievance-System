import { useState } from "react";
import { ChevronDown, GraduationCap } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

function Sidebar({ menuItems, profile, roleLabel, isOpen, onClose, onLogout }) {
  const location = useLocation();
  const hasActiveChild = (item) =>
    item.children?.some((child) => location.pathname === child.path);
  const [expanded, setExpanded] = useState(() =>
    menuItems.some(hasActiveChild),
  );
  const displayName =
    profile.name || profile.fullName || profile.email || "Portal user";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function renderItem(item) {
    const Icon = item.icon;
    if (item.action === "logout") {
      return (
        <button
          className="portal-nav-link portal-logout-link"
          key={item.label}
          type="button"
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          <Icon aria-hidden="true" size={18} />
          <span>{item.label}</span>
        </button>
      );
    }

    if (item.children) {
      const activeChild = hasActiveChild(item);
      return (
        <li className="portal-nav-group" key={item.label}>
          <button
            type="button"
            className={`portal-nav-link portal-nav-toggle${activeChild ? " is-active" : ""}`}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{item.label}</span>
            <ChevronDown
              className={`portal-chevron${expanded ? " is-expanded" : ""}`}
              aria-hidden="true"
              size={16}
            />
          </button>
          <div
            className={`portal-submenu${expanded ? " is-expanded" : ""}`}
            aria-hidden={!expanded}
          >
            <ul>
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <li key={child.path}>
                    <NavLink
                      className={({ isActive }) =>
                        `portal-nav-link portal-submenu-link${isActive ? " is-active" : ""}`
                      }
                      to={child.path}
                      onClick={onClose}
                      tabIndex={expanded ? 0 : -1}
                    >
                      <ChildIcon aria-hidden="true" size={17} />
                      <span>{child.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </li>
      );
    }

    return (
      <li key={item.path}>
        <NavLink
          className={({ isActive }) =>
            `portal-nav-link${isActive ? " is-active" : ""}`
          }
          end
          to={item.path}
          onClick={onClose}
        >
          <Icon aria-hidden="true" size={18} />
          <span>{item.label}</span>
        </NavLink>
      </li>
    );
  }

  return (
    <>
      {isOpen && (
        <button
          aria-label="Close navigation menu"
          className="portal-backdrop"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        className={`portal-sidebar${isOpen ? " is-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="portal-brand">
          <span className="portal-brand-icon">
            <GraduationCap aria-hidden="true" size={23} />
          </span>
          <span>
            <strong>ExGrev</strong>
            <small>Grievance Portal</small>
          </span>
        </div>
        <div className="portal-user-card">
          <span className="portal-user-avatar">{initials}</span>
          <span className="portal-user-details">
            <strong>{displayName}</strong>
            <small>{roleLabel}</small>
          </span>
        </div>
        <nav className="portal-navigation">
          <p className="portal-nav-caption">MENU</p>
          <ul>
            {menuItems
              .filter((item) => item.action !== "logout")
              .map(renderItem)}
          </ul>
        </nav>
        <div className="portal-sidebar-footer">
          {menuItems.filter((item) => item.action === "logout").map(renderItem)}
          <p>ExGrev · Student support</p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
