function GrievanceTimeline({ events }) {
  return (
    <ol className="grievance-timeline">
      {[...events]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((event) => {
          const labels = {
            resolution_proposed: "Resolution proposed",
            student_confirmed_resolution: "Resolution confirmed by student",
            remark_added: "Examination Cell remark",
          };
          return (
            <li key={event.id}>
              <strong>
                {labels[event.event_type] ||
                  event.event_type.replaceAll("_", " ")}
              </strong>
              <small>{new Date(event.created_at).toLocaleString()}</small>
              {event.details?.assigned_name && (
                <p>Assigned to {event.details.assigned_name}</p>
              )}
              {event.details?.remark && (
                <p>
                  {event.event_type === "resolution_proposed"
                    ? "Proposed resolution"
                    : event.event_type === "remark_added"
                      ? "Remark"
                      : "Resolution"}
                  : {event.details.remark}
                </p>
              )}
              {event.details?.note && <p>{event.details.note}</p>}
            </li>
          );
        })}
    </ol>
  );
}

export default GrievanceTimeline;
