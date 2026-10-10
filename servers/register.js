/* register.js - the register page */

renderLayout("register");
if (getSession()) location.href = "dashboard.html";     // already logged in

async function handleRegister(event) {
  event.preventDefault();
  const f = event.target.elements;

  const error = await registerUser(f.username.value, f.password.value, f.confirm.value);
  if (error) {
    showMessage(error, "error");
    return;
  }
  flash("Account created. Add your first course to get started.", "success");
  location.href = "dashboard.html";
}
