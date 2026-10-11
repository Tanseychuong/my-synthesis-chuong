/* ==========================================================================
   auth.js - register, log in and log out.

   IMPORTANT: this login is for convenience, not for real security.
   Everything is kept in this browser's localStorage, and anyone who can open the
   browser's developer tools can read it. A real login needs a server.
   We never save the password itself. We save a "scrambled" version of it.
   ========================================================================== */

function getUsers() {
  return readJson(USERS_KEY, {});
}

// Gives back the key of the logged-in user, or null if nobody is logged in.
function getSession() {
  const key = localStorage.getItem(SESSION_KEY);
  const users = getUsers();
  if (key !== null && users[key]) return key;
  return null;
}

// The name to show for a user, written the way they typed it when they registered
function displayName(key) {
  const users = getUsers();
  if (users[key]) return users[key].username;
  return key;
}

// Every private page calls this first. No login? Go to the login page.
function requireLogin() {
  const key = getSession();
  if (key === null) {
    location.href = "login.html";
    return null;
  }
  return key;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.href = "login.html";
}

// Turn a password into a scrambled string of digits.
// The same password always gives the same result, so we can compare at login.
// This is simple on purpose, so it is easy to understand. It is not strong security.
function scramble(password) {
  let total = 0;
  for (let i = 0; i < password.length; i++) {
    total = (total * 31 + password.charCodeAt(i)) % 1000000007;
  }
  return String(total);
}

// Create an account. Gives back an error message, or "" when it worked.
function registerUser(username, password, confirm) {
  username = username.trim();

  if (username.length < 3 || username.length > 30) return "Username must be 3 to 30 characters.";
  if (username.indexOf(" ") !== -1) return "Username cannot contain spaces.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirm) return "The two passwords do not match.";

  const users = getUsers();
  const key = userKey(username);
  if (users[key]) return "That username is already taken in this browser.";

  users[key] = { username: username, password: scramble(key + ":" + password) };
  const worked = writeJson(USERS_KEY, users);
  if (!worked) return "The account could not be saved in this browser.";

  localStorage.setItem(SESSION_KEY, key);     // log the new user in straight away
  return "";
}

// Log in. Gives back an error message, or "" when it worked.
function loginUser(username, password) {
  const key = userKey(username);
  const users = getUsers();
  const user = users[key];

  // One message for both problems, so it does not reveal which usernames exist
  if (!user || user.password !== scramble(key + ":" + password)) {
    return "Wrong username or password.";
  }

  localStorage.setItem(SESSION_KEY, key);
  return "";
}
