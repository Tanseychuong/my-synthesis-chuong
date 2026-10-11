/* ==========================================================================
   ui.js - small helpers that every page uses.
   This file is loaded FIRST on every page.
   ========================================================================== */

const FLASH_KEY = "gradeTracker.flash";

// Round a number to 2 decimal places. 86.6666 becomes 86.67
function round2(number) {
  return Math.round(number * 100) / 100;
}

// Show a number as a percentage. 86.6666 becomes "86.67%". null (no value) becomes a dash.
function pct(number) {
  if (number === null) return "–";
  return round2(number) + "%";
}

// Show a number neatly. 3.0 becomes "3". null becomes a dash.
function num(number) {
  if (number === null) return "–";
  return String(round2(number));
}

// Turn the text from an input box into a number. Empty text gives NaN ("not a number").
function parseNumber(text) {
  if (String(text).trim() === "") return NaN;
  return Number(text);
}

// Make text typed by the user safe to put inside HTML.
// For example, "<b>" becomes "&lt;b&gt;" so the browser shows it as text, not as a tag.
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Look through a list for the item that has this id. Returns null if it is not there.
function findById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

// Make a new list that has everything except the item with this id.
function removeById(list, id) {
  const result = [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].id !== id) result.push(list[i]);
  }
  return result;
}

// ----- Messages shown at the top of the page -----

// "type" is "success" or "error". The message appears in the box with id="message".
function showMessage(text, type) {
  document.getElementById("message").innerHTML =
    '<div class="message ' + type + '" role="alert">' + esc(text) + "</div>";
}

function clearMessage() {
  document.getElementById("message").innerHTML = "";
}

// A "flash" message is remembered while we move to another page.
// Call flash(...) just before location.href = "..." and the next page shows it.
function flash(text, type) {
  sessionStorage.setItem(FLASH_KEY, JSON.stringify({ text: text, type: type }));
}

function showFlash() {
  const saved = sessionStorage.getItem(FLASH_KEY);
  if (saved === null) return;
  sessionStorage.removeItem(FLASH_KEY);
  const message = JSON.parse(saved);
  showMessage(message.text, message.type);
}

// ----- Header (menu) and footer, the same on every page -----

function navLink(page, activePage, href, label) {
  let current = "";
  if (page === activePage) current = ' aria-current="page"';
  return '<a href="' + href + '"' + current + ">" + label + "</a>";
}

function renderLayout(activePage) {
  const loggedIn = getSession();
  let links = "";

  if (loggedIn) {
    links = navLink("dashboard", activePage, "dashboard.html", "Dashboard") +
            navLink("gpa", activePage, "gpa.html", "GPA projection") +
            navLink("scale", activePage, "scale.html", "Grading scale") +
            '<span class="who">' + esc(displayName(loggedIn)) + "</span>" +
            '<button type="button" class="link-button" onclick="logout()">Log out</button>';
  } else {
    links = navLink("login", activePage, "login.html", "Log in") +
            navLink("register", activePage, "register.html", "Register");
  }

  document.getElementById("site-header").innerHTML =
    '<div class="inner">' +
      '<h1><a href="dashboard.html">Grade Tracker</a></h1>' +
      '<nav aria-label="Main">' + links + "</nav>" +
    "</div>";

  document.getElementById("site-footer").innerHTML =
    "<p>Your account and records are saved only in this browser, on this device. " +
    "Clearing your browser data will delete them, so this is not a cloud backup.</p>" +
    "<p>Grades and GPA shown here are estimates. They are not official results from your university.</p>";
}
