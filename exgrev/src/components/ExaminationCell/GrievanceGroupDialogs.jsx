function GrievanceGroupCreateDialog({
  grievances,
  name,
  masterId,
  saving,
  onNameChange,
  onMasterChange,
  onClose,
  onSubmit,
}) {
  return (
    <div className="admin-dialog-backdrop dialog-overlay">
      <section
        className="admin-dialog dialog-content grievance-group-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
      >
        <h3 id="create-group-title">Group similar grievances</h3>
        <form
          className="admin-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="form-field">
            <span>Group name</span>
            <input
              type="text"
              maxLength="120"
              required
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Master grievance</span>
            <select
              value={masterId}
              onChange={(event) => onMasterChange(event.target.value)}
              required
            >
              {grievances.map((grievance) => (
                <option key={grievance.id} value={grievance.id}>
                  {grievance.grievance_code || "ID pending"} ·{" "}
                  {grievance.title || grievance.subject}
                </option>
              ))}
            </select>
          </label>
          <p>
            {grievances.length} open grievances will be grouped. Only one
            grievance can belong to an active group at a time, and all selected
            cases must have the same category and sub-category.
          </p>
          <div className="admin-dialog-footer">
            <button
              type="button"
              className="admin-cancel-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-confirm-button is-forward"
              disabled={saving || !name.trim()}
            >
              {saving ? "Creating…" : "Create group"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function GrievanceGroupForwardDialog({
  group,
  members,
  master,
  selectedIds,
  saving,
  onToggle,
  onClose,
  onConfirm,
}) {
  return (
    <div className="admin-dialog-backdrop dialog-overlay">
      <section
        className="admin-dialog dialog-content grievance-group-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-group-title"
      >
        <h3 id="forward-group-title">
          Forward this same solution to the other grievances?
        </h3>
        <p>
          The solution from {master.grievance_code || "the master grievance"}{" "}
          will be copied to the selected cases, each with a separate 48-hour
          student response window. This action cannot be repeated.
        </p>
        <section className="thread-resolution-summary">
          <strong>Solution preview</strong>
          <p>{master.resolution_remark}</p>
          {master.resolution_attachments?.length > 0 && (
            <ul>
              {master.resolution_attachments.map((attachment) => (
                <li key={attachment.path}>{attachment.name}</li>
              ))}
            </ul>
          )}
        </section>
        <fieldset className="group-member-checklist">
          <legend>
            Select grievances in “{group.name}” ({members.length})
          </legend>
          {members.map((member) => (
            <label key={member.id}>
              <input
                type="checkbox"
                checked={selectedIds.includes(member.id)}
                onChange={() => onToggle(member.id)}
              />
              <span>
                {member.grievance_code || "ID pending"} ·{" "}
                {member.title || member.subject}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="admin-dialog-footer">
          <button
            type="button"
            className="admin-cancel-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-confirm-button is-forward"
            onClick={onConfirm}
            disabled={saving || selectedIds.length === 0}
          >
            {saving ? "Forwarding…" : `Forward to ${selectedIds.length} cases`}
          </button>
        </div>
      </section>
    </div>
  );
}

export { GrievanceGroupCreateDialog, GrievanceGroupForwardDialog };
