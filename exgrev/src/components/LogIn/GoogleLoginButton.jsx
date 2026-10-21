function GoogleLoginButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      className="google-login-button"
      onClick={onClick}
      disabled={disabled}
    >
      <svg
        className="google-login-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
        />
        <path
          fill="#34A853"
          d="M24 44c5.6 0 10.3-1.9 13.8-5.2l-6.6-5.1c-1.8 1.2-4.1 2-7.2 2-5.5 0-10.2-3.7-11.9-8.7H5.3v5.3A20.8 20.8 0 0 0 24 44Z"
        />
        <path
          fill="#FBBC05"
          d="M12.1 27a12.5 12.5 0 0 1 0-7.9v-5.3H5.3a20.8 20.8 0 0 0 0 18.5l6.8-5.3Z"
        />
        <path
          fill="#EA4335"
          d="M24 11.1c3.1 0 5.9 1.1 8.1 3.2l6-6A20 20 0 0 0 24 4 20.8 20.8 0 0 0 5.3 13.8l6.8 5.3c1.7-5 6.4-8 11.9-8Z"
        />
      </svg>
      {disabled ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
}

export default GoogleLoginButton;
