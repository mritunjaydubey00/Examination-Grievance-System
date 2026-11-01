import { useEffect, useState } from "react";
import {
  getUserProfile,
  updateOwnUserProfile,
} from "../services/userService.js";

const editableFields = [
  { key: "Full Name", label: "Full name" },
  { key: "Department", label: "Department" },
  { key: "Branch", label: "Branch" },
  { key: "Phone Number", label: "Phone number" },
];

const readOnlyFields = [
  { key: "User ID", label: "User ID" },
  { key: "email", label: "Email" },
  { key: "Ex Factor", label: "Account type" },
  { key: "account_identifier", label: "Account identifier" },
];

function UserProfileSection({ session, onChangePassword, onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getUserProfile(session.userId)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setForm(toFormValues(result));
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Could not load your profile.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.userId]);

  function startEditing() {
    setForm(toFormValues(profile));
    setError("");
    setMessage("");
    setEditing(true);
  }

  function cancelEditing() {
    setForm(toFormValues(profile));
    setError("");
    setEditing(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateOwnUserProfile(session.userId, form);
      setProfile(updated);
      setForm(toFormValues(updated));
      setEditing(false);
      onProfileUpdated?.({
        ...session,
        name: updated["Full Name"],
        department: updated.Department,
        branch: updated.Branch,
      });
      setMessage("Profile updated.");
    } catch (saveError) {
      setError(saveError.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="portal-placeholder-page user-profile-page">
      <div className="portal-section-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h3>Profile</h3>
          <p>View and update your own account details.</p>
        </div>
        {!editing && (
          <div className="profile-actions">
            <button
              type="button"
              className="profile-secondary-button"
              onClick={onChangePassword}
            >
              Change password
            </button>
            <button
              type="button"
              className="portal-add-button"
              onClick={startEditing}
              disabled={loading || !profile}
            >
              Edit profile
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="profile-message profile-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="profile-message" role="status">
          {message}
        </p>
      )}
      {loading ? (
        <div className="portal-info-card">
          <p className="portal-placeholder-message">Loading your profile…</p>
        </div>
      ) : profile ? (
        editing ? (
          <form
            className="portal-info-card user-profile-grid"
            onSubmit={handleSubmit}
          >
            {editableFields.map(({ key, label }) => (
              <label className="profile-field" key={key}>
                <span>{label}</span>
                <input
                  type="text"
                  value={form[key]}
                  maxLength="160"
                  required={key === "Full Name" || key === "Phone Number"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </label>
            ))}
            {readOnlyFields.map(({ key, label }) => (
              <div className="profile-field" key={key}>
                <span>{label}</span>
                <strong>{profile[key] || "Not provided"}</strong>
              </div>
            ))}
            <div className="profile-actions profile-form-actions">
              <button
                type="button"
                className="profile-secondary-button"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="portal-add-button profile-save-button"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="portal-info-card user-profile-grid">
            {editableFields.map(({ key, label }) => (
              <div className="profile-field" key={key}>
                <span>{label}</span>
                <strong>{profile[key] || "Not provided"}</strong>
              </div>
            ))}
            {readOnlyFields.map(({ key, label }) => (
              <div className="profile-field" key={key}>
                <span>{label}</span>
                <strong>{profile[key] || "Not provided"}</strong>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

function toFormValues(profile) {
  return Object.fromEntries(
    editableFields.map(({ key }) => [key, String(profile?.[key] || "")]),
  );
}

export default UserProfileSection;
