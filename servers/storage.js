/* ==========================================================================
   storage.js - saving and loading with localStorage.

   What is stored:
     gradeTracker.users          all accounts   { "sam": { username, salt, hash } }
     gradeTracker.session        who is logged in (the account key, e.g. "sam")
     gradeTracker.data.<key>     one user's courses and grading scale

   Each user has their own data key, so accounts never see each other's courses.
   ========================================================================== */

const USERS_KEY = "gradeTracker.users";
const SESSION_KEY = "gradeTracker.session";
const DATA_PREFIX = "gradeTracker.data.";

// An EXAMPLE grading scale. It is not any university's official scale.
// Every new account starts with a copy and can change it on the "Grading scale" page.
const EXAMPLE_SCALE = [
  { min: 93, letter: "A",  points: 4.0 },
  { min: 90, letter: "A-", points: 3.7 },
  { min: 87, letter: "B+", points: 3.3 },
  { min: 83, letter: "B",  points: 3.0 },
  { min: 80, letter: "B-", points: 2.7 },
  { min: 77, letter: "C+", points: 2.3 },
  { min: 73, letter: "C",  points: 2.0 },
  { min: 70, letter: "C-", points: 1.7 },
  { min: 67, letter: "D+", points: 1.3 },
  { min: 60, letter: "D",  points: 1.0 },
  { min: 0,  letter: "F",  points: 0.0 }
];

// Read JSON from localStorage. If nothing is there (or it is damaged), use the fallback.
function readJson(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch (error) {
    return fallback;
  }
}

// Write JSON to localStorage. Returns false if the browser refused.
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

// "Sam" and "sam" are the same account
function userKey(username) {
  return username.trim().toLowerCase();
}

// What a brand-new account starts with
function defaultUserData() {
  return {
    nextId: 1,                      // used to give every record its own id
    courses: [],                    // each course holds categories, each category holds assessments
    scale: EXAMPLE_SCALE.map(row => ({ ...row }))
  };
}

function loadUserData(key) {
  return Object.assign(defaultUserData(), readJson(DATA_PREFIX + key, {}));
}

function saveUserData(key, data) {
  if (!writeJson(DATA_PREFIX + key, data)) {
    showMessage("Your changes could not be saved in this browser.", "error");
  }
}

// Gives a new record an id nobody else has
function newId(data) {
  const id = data.nextId;
  data.nextId = id + 1;
  return id;
}
