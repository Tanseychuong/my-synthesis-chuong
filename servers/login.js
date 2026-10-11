/* login.js - the login page */

renderLayout("login");
if (getSession() !== null) location.href = "dashboard.html";     // already logged in

function handleLogin(event) {
  event.preventDefault();                     // stop the browser from reloading the page
  const form = event.target.elements;

  const error = loginUser(form.username.value, form.password.value);
  if (error !== "") {
    showMessage(error, "error");
    return;
  }
  location.href = "dashboard.html";
}
