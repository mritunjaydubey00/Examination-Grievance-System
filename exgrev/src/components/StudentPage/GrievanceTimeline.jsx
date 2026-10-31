function GrievanceTimeline({ events }) {
  return (
    <ol className="grievance-timeline">
      {[...events]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((event) => {
          const eventMessage =
            event.message || event.details?.remark || event.details?.note;
          const labels = {
            submitted: "Grievance submitted",
            forwarded: "Assignment",
            reassigned: "Reassignment",
            resolution_proposed: "Resolution proposed",
            student_confirmed_resolution: "Resolution confirmed by student",
            resolved_awaiting_response: "Resolved, awaiting student response",
            student_accepted_resolution: "Resolution accepted by student",
            student_continued: "Student continued the grievance",
            auto_resolved: "Auto-resolved after 48 hours",
            status_changed: "Status changed",
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
              {event.actor_role && (
                <small>Role: {event.actor_role.replaceAll("_", " ")}</small>
              )}
              {eventMessage && (
                <p>{eventMessage}</p>
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
