const SESSION_KEY = "exgrev.session";

export function createUserSession(user) {
  const session = {
    username: user.username,
    name: user.name,
    branch: user.branch,
    department: user.department,
    loggedInAt: new Date().toISOString(),
    uptimeSeconds: 0,
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getUserSession() {
  const storedSession = sessionStorage.getItem(SESSION_KEY);

  if (!storedSession) {
    return null;
  }

  const session = JSON.parse(storedSession);
  const uptimeSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(session.loggedInAt).getTime()) / 1000),
  );

  return { ...session, uptimeSeconds };
}

export function clearUserSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
