import { BookOpen, ClipboardList, Plus, UserRound } from "lucide-react";

const dashboardStats = [
  { label: "Open grievances", value: "08" },
  { label: "Awaiting review", value: "03" },
  { label: "Resolved this month", value: "12" },
];

export function DashboardPage({ roleLabel }) {
  return (
    <section className="portal-placeholder">
      <div className="portal-page-heading">
        <h2>Welcome to your dashboard</h2>
        <p>Here is a quick overview of your {roleLabel.toLowerCase()} portal.</p>
        <p>Sample overview · demo data</p>
      </div>
      <div className="portal-stats-grid">
        {dashboardStats.map((stat) => (
          <article className="portal-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
      <article className="portal-welcome-card">
        <h3>Grievance support, all in one place</h3>
        <p>
          Use the navigation menu to review grievance updates, find portal
          guidelines, and stay informed with notices.
        </p>
      </article>
    </section>
  );
}

export function ComingSoonPage({ title, role }) {
  const examCell = role === "examcell";
  const isGuideline = title === "Guidelines";
  const Icon = isGuideline ? BookOpen : title === "Profile" ? UserRound : ClipboardList;
  const addLabel = isGuideline ? "Add Guideline" : "Add Notice";

  return (
    <section className="portal-placeholder">
      <div className="portal-page-heading">
        <h2>{title}</h2>
        <p>
          {title === "Profile"
            ? "Your account details and preferences."
            : `${title} and updates for your portal.`}
        </p>
      </div>
      <div className="portal-coming-soon-card">
        <span className="portal-coming-soon-icon">
          <Icon aria-hidden="true" size={24} />
        </span>
        <h3>Coming soon</h3>
        <p>
          This section is being prepared. Check back here for {title.toLowerCase()}.
        </p>
        {examCell && title !== "Profile" && (
          <>
            {/* Replace this UI-only action with a create form when integrated. */}
            <button
              className="portal-add-button"
              onClick={() => console.log(`${addLabel} UI placeholder`)}
              type="button"
            >
              <Plus aria-hidden="true" size={17} />
              {addLabel}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
