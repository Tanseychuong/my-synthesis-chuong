/* ==========================================================================
   ui.js - small tools every page uses: formatting, messages, header and footer.
   Loaded FIRST on every page.
   ========================================================================== */

const FLASH_KEY = "gradeTracker.flash";

// Round to 2 decimal places
function round2(number) {
  return Math.round(number * 100) / 100;
}

// 86.666666 -> "86.67%", and null -> a dash
function pct(number) {
  return number === null ? "–" : round2(number) + "%";
}

// 3 -> "3", 2.5 -> "2.5", null -> a dash
function num(number) {
  return number === null ? "–" : String(round2(number));
}

// Turns text from an input into a number. Empty text gives NaN (not a number).
function parseNumber(text) {
  if (String(text).trim() === "") return NaN;
  return Number(text);
}

// Makes user-typed text safe to put inside HTML
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ----- Messages -----

// Show a message at the top of the page (without redrawing, so typed text stays in the form)
function showMessage(text, type) {
  document.getElementById("message").innerHTML =
    `<div class="message ${type}" role="alert">${esc(text)}</div>`;
}

function clearMessage() {
  document.getElementById("message").innerHTML = "";
}

// A "flash" message survives a page change. Use it just before location.href = "...".
function flash(text, type) {
  sessionStorage.setItem(FLASH_KEY, JSON.stringify({ text: text, type: type }));
}

function showFlash() {
  const saved = sessionStorage.getItem(FLASH_KEY);
  if (!saved) return;
  sessionStorage.removeItem(FLASH_KEY);
  const message = JSON.parse(saved);
  showMessage(message.text, message.type);
}

// ----- Header and footer (the same on every page, so they are built here) -----

function navLink(page, activePage, href, label) {
  const current = page === activePage ? ' aria-current="page"' : "";
  return `<a href="${href}"${current}>${label}</a>`;
}

function renderLayout(activePage) {
  let links;
  if (typeof getSession === "function" && getSession()) {
    links =
      navLink("dashboard", activePage, "dashboard.html", "Dashboard") +
      navLink("gpa", activePage, "gpa.html", "GPA projection") +
      navLink("scale", activePage, "scale.html", "Grading scale") +
      `<span class="who">${esc(displayName(getSession()))}</span>
       <button type="button" class="link-button" onclick="logout()">Log out</button>`;
  } else {
    links =
      navLink("login", activePage, "login.html", "Log in") +
      navLink("register", activePage, "register.html", "Register");
  }

  document.getElementById("site-header").innerHTML =
    `<div class="inner">
       <h1><a href="dashboard.html">Grade Tracker</a></h1>
       <nav aria-label="Main">${links}</nav>
     </div>`;

  document.getElementById("site-footer").innerHTML =
    `<p>Your account and records are saved only in this browser, on this device.
        Clearing your browser data will delete them, so this is not a cloud backup.</p>
     <p>Grades and GPA shown here are estimates. They are not official results from your university.</p>`;
}
