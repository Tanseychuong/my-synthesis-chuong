# Grade Tracker

A grade tracking and GPA projection app built with only HTML, CSS and JavaScript.
Students create an account, add their courses, record assessment scores, and see
their course grades and projected semester GPA.

## Run it

No installation is needed. Open `index.html` in a browser.
(If a browser blocks the login from a plain file, run `python -m http.server`
in this folder and open http://localhost:8000/.)

## Files

```
grade-tracker/
├── index.html          Sends you to the dashboard (logged in) or the login page
├── login.html          Login page
├── register.html       Register page
├── dashboard.html      Stats, add a course, list of courses (one semester at a time)
├── course.html         One course: categories, assessments, target calculator
├── gpa.html            Projected GPA and "try different scores"
├── scale.html          Edit the grading scale
├── css/
│   └── style.css       All the styling
└── js/
    ├── ui.js           Formatting, messages, header and footer     (every page)
    ├── storage.js      localStorage: loading and saving            (every page)
    ├── auth.js         Register, log in, log out, password hashing (every page)
    ├── calculations.js Averages, course grades, letter grades, GPA (pages that need grades)
    ├── validation.js   Checks what the user typed                  (dashboard, course)
    ├── login.js        Login page only
    ├── register.js     Register page only
    ├── dashboard.js    Dashboard page only
    ├── course.js       Course page only
    ├── gpa.js          GPA page only
    └── scale.js        Grading scale page only
```

Each HTML page loads the shared files first, then its own file.

## How accounts work

- **Register** stores a username, a random salt, and a SHA-256 hash of salt + password.
  The password itself is never saved.
- **Login** hashes what you typed and compares it. The session is remembered until you log out.
- Every account has its own saved data (`gradeTracker.data.<username>`), so accounts
  in the same browser never see each other's courses.

## Limits (important)

This is a login for convenience, not for security. All data is in the browser's
`localStorage`:

- Accounts and courses exist only in the browser and device where they were created.
  Another computer, or another browser, starts empty.
- Clearing browser data deletes everything.
- Anyone who can open the browser's developer tools can read the stored data.
- There is no "forgot password".

Real accounts that work on every device need a server and a database.
