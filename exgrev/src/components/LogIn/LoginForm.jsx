import LoginAccountTypes from "./LoginAccountTypes.jsx";
import GoogleLoginButton from "./GoogleLoginButton.jsx";

const GOOGLE_LOGIN_DISABLED = true;

function LoginForm({
  onSubmit,
  onGoogleSignIn,
  onForgotPassword,
  error,
  notice,
  busy,
}) {
  return (
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-panel-heading">
        <h3 id="login-title">Welcome back</h3>
        <p>Enter the User ID or email address and password assigned to your account.</p>
      </div>

      <form className="login-form" onSubmit={onSubmit}>
        <div className="login-field">
          <label htmlFor="identifier">User ID or email</label>
          <input
            type="text"
            id="identifier"
            name="identifier"
            placeholder="Enter your User ID or email"
            autoComplete="username"
            required
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="button"
          className="text-button forgot-password-button"
          onClick={onForgotPassword}
          disabled={busy}
        >
          Forgot password?
        </button>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="login-submit-button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {notice && (
        <p className="auth-success login-notice" role="status">
          {notice}
        </p>
      )}
      <div className="login-divider" aria-hidden="true">
        <span>or</span>
      </div>
      <GoogleLoginButton
        onClick={onGoogleSignIn}
        disabled={GOOGLE_LOGIN_DISABLED || busy}
        available={!GOOGLE_LOGIN_DISABLED}
        busy={busy && !GOOGLE_LOGIN_DISABLED}
      />
      <LoginAccountTypes />
    </section>
  );
}

export default LoginForm;
