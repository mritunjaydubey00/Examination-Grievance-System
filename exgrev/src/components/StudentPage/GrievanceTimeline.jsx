function GrievanceTimeline({ events }) {
  return (
    <ol className="grievance-timeline">
      {[...events]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((event) => (
          <li key={event.id}>
            <strong>{event.event_type.replaceAll("_", " ")}</strong>
            <small>{new Date(event.created_at).toLocaleString()}</small>
            {event.details?.assigned_name && (
              <p>Assigned to {event.details.assigned_name}</p>
            )}
            {event.details?.remark && (
              <p>Resolution: {event.details.remark}</p>
            )}
            {event.details?.note && <p>{event.details.note}</p>}
          </li>
        ))}
    </ol>
  );
}

export default GrievanceTimeline;
