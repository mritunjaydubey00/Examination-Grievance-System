const metrics = [
  { key: "total", label: "Total received", tone: "teal" },
  { key: "pending", label: "Pending review", tone: "amber" },
  { key: "forwarded", label: "Forwarded to faculty", tone: "blue" },
  { key: "resolved", label: "Resolved cases", tone: "green" },
];

function AdminStats({ grievances, audience = "examination-cell" }) {
  const isTeachingStaff = audience === "teaching-staff";
  const displayedMetrics = isTeachingStaff
    ? [
        { key: "total", label: "Assigned cases", tone: "teal" },
        { key: "pending", label: "Awaiting review", tone: "amber" },
        { key: "forwarded", label: "In progress", tone: "blue" },
        { key: "resolved", label: "Resolved", tone: "green" },
      ]
    : metrics;

  const counts = {
    total: grievances.length,
    pending: grievances.filter((item) => item.status === "New").length,
    forwarded: grievances.filter((item) => item.status === "In Progress")
      .length,
    resolved: grievances.filter((item) => item.status === "Resolved").length,
  };

  return (
    <section className="admin-stats" aria-label="Grievance overview">
      {displayedMetrics.map((metric) => (
        <article
          className={`admin-stat admin-stat-${metric.tone}`}
          key={metric.key}
        >
          <span className="admin-stat-indicator" aria-hidden="true" />
          <div>
            <p>{metric.label}</p>
            <strong>{counts[metric.key]}</strong>
          </div>
        </article>
      ))}
    </section>
  );
}

export default AdminStats;
