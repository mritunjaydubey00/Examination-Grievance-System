function GrievanceTimeline({ events }) {
  return (
    <ol className="grievance-timeline">
      {[...events]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((event) => {
          const labels = {
            submitted: "Grievance submitted",
            forwarded: "Assignment",
            reassigned: "Reassignment",
            resolution_proposed: "Resolution proposed",
            student_confirmed_resolution: "Resolution confirmed by student",
            remark_added: "Remark",
          };
          return (
            <li key={event.id}>
              <strong>
                {labels[event.event_type] ||
                  event.event_type.replaceAll("_", " ")}
              </strong>
              <small>{new Date(event.created_at).toLocaleString()}</small>
              {event.actor_display_name && (
                <small>By {event.actor_display_name}</small>
              )}
              {(event.details?.remark || event.details?.note) && (
                <p>
                  {event.event_type === "resolution_proposed"
                    ? "Proposed resolution"
                    : event.event_type === "remark_added"
                      ? "Remark"
                      : event.event_type === "forwarded" ||
                          event.event_type === "reassigned"
                        ? "Assignment remark"
                        : "Resolution"}
                  : {event.details.remark || event.details.note}
                </p>
              )}
              {(event.details?.to_name || event.details?.assigned_name) && (
                <p>
                  Assigned to{" "}
                  {event.details.to_name || event.details.assigned_name}
                </p>
              )}
            </li>
          );
        })}
    </ol>
  );
}

export default GrievanceTimeline;
