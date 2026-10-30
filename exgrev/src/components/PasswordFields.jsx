function PasswordFields({ requireCurrentPassword = false }) {
  return (
    <>
      {requireCurrentPassword && (
        <label className="form-field">
          <span>Current password</span>
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
      )}
      <label className="form-field">
        <span>New password</span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength="12"
          required
        />
      </label>
      <label className="form-field">
        <span>Confirm new password</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength="12"
          required
        />
      </label>
    </>
  );
}

export default PasswordFields;
