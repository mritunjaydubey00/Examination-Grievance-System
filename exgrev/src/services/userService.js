import users from "../data/users.js";

// Keep the UI independent of where users are stored.
export async function authenticateUser(username, password) {
  const user = users.find(
    (candidate) =>
      candidate.username === username && candidate.password === password,
  );

  if (!user) {
    return null;
  }

  const { password: _password, ...safeUser } = user;
  return safeUser;
}
