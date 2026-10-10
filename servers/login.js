/* login.js - the login page */

renderLayout("login");
if (getSession()) location.href = "dashboard.html";     // already logged in

async function handleLogin(event) {
  event.preventDefault();
  const f = event.target.elements;

  const error = await loginUser(f.username.value, f.password.value);
  if (error) {
    showMessage(error, "error");
    return;
  }
  location.href = "dashboard.html";
}
