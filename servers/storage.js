/* ==========================================================================
   storage.js - saving and loading with localStorage.

   localStorage is a small storage box inside the browser. It keeps text, so we
   turn our data into text with JSON.stringify() before saving, and back into
   data with JSON.parse() when loading.

   What we keep in it:
     gradeTracker.users         all the accounts
     gradeTracker.session       who is logged in right now
     gradeTracker.data.<name>   one user's courses and grading scale

   Every user has their own "data" key, so users never see each other's courses.
   ========================================================================== */

const USERS_KEY = "gradeTracker.users";
const SESSION_KEY = "gradeTracker.session";
const DATA_PREFIX = "gradeTracker.data.";

// The default grading scale. The letters and bands come from the Course GPA Tracker spreadsheet.
// A grade at or above "min" gets that letter. The spreadsheet has no grade points,
// so the points are the usual 4.0 steps. Students can change all of this on the Grading scale page.
const DEFAULT_SCALE = [
  { min: 80, letter: "A",  points: 4.0 },
  { min: 75, letter: "B+", points: 3.5 },
  { min: 70, letter: "B",  points: 3.0 },
  { min: 65, letter: "C+", points: 2.5 },
  { min: 60, letter: "C",  points: 2.0 },
  { min: 55, letter: "D+", points: 1.5 },
  { min: 50, letter: "D",  points: 1.0 },
  { min: 0,  letter: "E",  points: 0.0 }
];

// Read saved data. If nothing is saved (or it is damaged), give back the "fallback" instead.
function readJson(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    if (text === null) return fallback;
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

// Save data. Gives back true if it worked and false if the browser refused.
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

// "Sam" and "sam" are the same account, so we always use lower case for the key.
function userKey(username) {
  return username.trim().toLowerCase();
}

// Make a fresh copy of the default scale, so changing one user's scale never changes the default.
function copyDefaultScale() {
  const copy = [];
  for (let i = 0; i < DEFAULT_SCALE.length; i++) {
    const row = DEFAULT_SCALE[i];
    copy.push({ min: row.min, letter: row.letter, points: row.points });
  }
  return copy;
}

// A copy of a grading scale, with the highest grade first.
// (sort() puts the rows in order. The little function says: bigger "min" comes first.)
function sortedScale(scale) {
  const copy = [];
  for (let i = 0; i < scale.length; i++) copy.push(scale[i]);
  copy.sort(function (a, b) { return b.min - a.min; });
  return copy;
}

// Load one user's data. A brand-new user gets an empty list of courses and the default scale.
function loadUserData(key) {
  const saved = readJson(DATA_PREFIX + key, null);
  if (saved === null) {
    return { nextId: 1, courses: [], scale: copyDefaultScale() };
  }
  if (!saved.scale) saved.scale = copyDefaultScale();
  return saved;
}

function saveUserData(key, data) {
  const worked = writeJson(DATA_PREFIX + key, data);
  if (!worked) showMessage("Your changes could not be saved in this browser.", "error");
}

// Give out a new id. Every course, category and assessment gets its own number,
// so we can always tell them apart, even when two have the same name.
function newId(data) {
  const id = data.nextId;
  data.nextId = id + 1;
  return id;
}
