/* ==========================================================================
   auth.js - register, log in, log out.

   IMPORTANT: this is a login for convenience, not for security.
   Everything lives in this browser's localStorage, so anyone who can open this
   browser's developer tools can read it. A real login needs a server.
   We never store the password itself, only a salted SHA-256 hash of it.
   ========================================================================== */

function getUsers() {
  return readJson(USERS_KEY, {});
}

// The key of the logged-in account, or null
function getSession() {
  try {
    const key = localStorage.getItem(SESSION_KEY);
    return key && getUsers()[key] ? key : null;
  } catch (error) {
    return null;
  }
}

function displayName(key) {
  const user = getUsers()[key];
  return user ? user.username : key;
}

// Call at the top of every page that needs a login.
// Returns the account key, or sends the visitor to the login page.
function requireLogin() {
  const key = getSession();
  if (!key) {
    location.href = "login.html";
    return null;
  }
  return key;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.href = "login.html";
}

// ----- Password hashing (uses the browser's built-in crypto) -----

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function makeSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(salt + password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
}

function cryptoAvailable() {
  return window.crypto && window.crypto.subtle;
}

// ----- Register and log in. Each returns an error message, or "" when it worked. -----

async function registerUser(username, password, confirm) {
  username = username.trim();

  if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) {
    return "Username must be 3 to 30 characters: letters, numbers, dots, dashes or underscores.";
  }
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirm) return "The two passwords do not match.";
  if (!cryptoAvailable()) return "This page must be opened from localhost, https or a local file to create accounts.";

  const users = getUsers();
  const key = userKey(username);
  if (users[key]) return "That username is already taken in this browser.";

  const salt = makeSalt();
  users[key] = { username: username, salt: salt, hash: await hashPassword(password, salt) };
  if (!writeJson(USERS_KEY, users)) return "The account could not be saved in this browser.";

  localStorage.setItem(SESSION_KEY, key);     // log the new user in straight away
  return "";
}

async function loginUser(username, password) {
  if (!cryptoAvailable()) return "This page must be opened from localhost, https or a local file to log in.";

  const key = userKey(username);
  const user = getUsers()[key];

  // The same message for "no such user" and "wrong password", so it does not reveal which names exist
  if (!user || (await hashPassword(password, user.salt)) !== user.hash) {
    return "Wrong username or password.";
  }

  localStorage.setItem(SESSION_KEY, key);
  return "";
}
