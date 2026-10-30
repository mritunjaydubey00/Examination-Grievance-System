function LoginIntro() {
  return (
    <header className="login-intro">
      <p className="eyebrow">Examination grievance portal</p>
      <h2>A clearer path to resolving examination concerns.</h2>
      <p className="login-intro-description">
        A trusted space to raise an examination grievance, follow its progress,
        and stay informed at every step.
      </p>
      <div className="login-feature-list">
        <article className="login-feature">
          <span className="login-feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3 20 6v5.5c0 5-3.3 8.3-8 10.5-4.7-2.2-8-5.5-8-10.5V6l8-3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="m8.5 12 2.2 2.2 4.8-4.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            <strong>Account-based access</strong>
            <small>Your grievance portal is linked to your institute account.</small>
          </span>
        </article>
        <article className="login-feature">
          <span className="login-feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 5h14v14H5zM8 9h8M8 12h8M8 15h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            <strong>Clear case updates</strong>
            <small>Keep track of your grievance and its latest activity.</small>
          </span>
        </article>
        <article className="login-feature">
          <span className="login-feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12h15m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            <strong>Support when you need it</strong>
            <small>Connect with the appropriate institute staff.</small>
          </span>
        </article>
      </div>
      <p className="login-institute">
        Madhav Institute of Technology and Science
        <span>Gwalior</span>
      </p>
    </header>
  );
}

export default LoginIntro;
