import LoginAccountTypes from "./LoginAccountTypes.jsx";

function LoginForm({ onSubmit, error, busy }) {
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

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="login-submit-button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <LoginAccountTypes />
    </section>
  );
}

export default LoginForm;
