function AccountSecurityActions({ onChangePassword }) {
  return (
    <button
      type="button"
      className="account-security-button"
      onClick={onChangePassword}
    >
      Change password
    </button>
  );
}

export default AccountSecurityActions;
