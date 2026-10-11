/* register.js - the register page */

renderLayout("register");
if (getSession() !== null) location.href = "dashboard.html";     // already logged in

function handleRegister(event) {
  event.preventDefault();
  const form = event.target.elements;

  const error = registerUser(form.username.value, form.password.value, form.confirm.value);
  if (error !== "") {
    showMessage(error, "error");
    return;
  }
  flash("Account created. Add your first course to get started.", "success");
  location.href = "dashboard.html";
}
