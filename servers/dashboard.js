/* ==========================================================================
   dashboard.js - the dashboard page.
   Shows the totals, a form to add a course, and a card for each course.
   One semester is shown at a time. The semester comes from the address (?semester=...).
   ========================================================================== */

const currentUser = requireLogin();
let data = null;           // this user's courses and grading scale
let semester = "";         // the semester being shown

if (currentUser !== null) {
  start();
}

function start() {
  renderLayout("dashboard");
  data = loadUserData(currentUser);
  semester = chooseSemester();
  render();
  showFlash();
}

function save() {
  saveUserData(currentUser, data);
}

// Which semester to show: the one in the address, else the newest course's, else a default name
function chooseSemester() {
  const fromAddress = new URLSearchParams(location.search).get("semester");
  if (fromAddress) return fromAddress;

  let newest = null;
  for (let i = 0; i < data.courses.length; i++) {
    if (newest === null || data.courses[i].id > newest.id) newest = data.courses[i];
  }
  if (newest !== null) return newest.semester;
  return "Current semester";
}

// A list of every semester name, each one only once
function allSemesters() {
  const names = [];
  for (let i = 0; i < data.courses.length; i++) {
    if (names.indexOf(data.courses[i].semester) === -1) names.push(data.courses[i].semester);
  }
  if (names.indexOf(semester) === -1) names.push(semester);
  names.sort();
  return names;
}

// Only the courses that belong to the chosen semester
function coursesInSemester() {
  const list = [];
  for (let i = 0; i < data.courses.length; i++) {
    if (data.courses[i].semester === semester) list.push(data.courses[i]);
  }
  return list;
}

function changeSemester(value) {
  location.href = "dashboard.html?semester=" + encodeURIComponent(value);
}

// ----- Adding a course -----

function addCourse(event) {
  event.preventDefault();
  const form = event.target.elements;
  const name = form.courseName.value.trim();
  const code = form.courseCode.value.trim();
  const credits = parseNumber(form.credits.value);
  const courseSemester = form.semester.value.trim();

  const problem = checkCourse(data, name, code, credits, courseSemester, null);
  if (problem !== "") {
    showMessage(problem, "error");
    return;
  }

  data.courses.push({
    id: newId(data),
    name: name,
    code: code,
    credits: credits,
    semester: courseSemester,
    categories: []
  });
  save();
  semester = courseSemester;          // show the semester the course was added to
  render("Course added.");
}

// ----- Drawing the page -----

function render(successText) {
  const courses = coursesInSemester();
  const gpa = semesterGpa(courses, data.scale, {});

  // Average so far: each course's percentage, counted by its credit hours
  let weighted = 0;
  let creditsWithScores = 0;
  let totalCredits = 0;
  for (let i = 0; i < courses.length; i++) {
    totalCredits += courses[i].credits;
    const summary = courseSummary(courses[i], {});
    if (summary.percent !== null) {
      weighted += summary.percent * courses[i].credits;
      creditsWithScores += courses[i].credits;
    }
  }
  let averageSoFar = null;
  if (creditsWithScores > 0) averageSoFar = weighted / creditsWithScores;

  // The drop-down list of semesters
  let options = "";
  const semesters = allSemesters();
  for (let i = 0; i < semesters.length; i++) {
    let selected = "";
    if (semesters[i] === semester) selected = "selected";
    options += '<option value="' + esc(semesters[i]) + '" ' + selected + ">" + esc(semesters[i]) + "</option>";
  }

  // The course cards, or a message when there are none
  let cards = "";
  if (courses.length === 0) {
    cards = `<div class="card empty">
      <p><strong>No courses in this semester yet.</strong></p>
      <p>Add your first course above, then open it to set up its assessment categories.</p>
    </div>`;
  } else {
    cards = '<div class="course-grid">';
    for (let i = 0; i < courses.length; i++) {
      cards += courseCardHtml(courses[i]);
    }
    cards += "</div>";
  }

  let gpaText = "–";
  if (gpa.gpa !== null) gpaText = gpa.gpa.toFixed(2);

  document.getElementById("app").innerHTML = `
    <div class="page-title">
      <label>Semester
        <select onchange="changeSemester(this.value)">${options}</select>
      </label>
    </div>

    <div class="stats">
      <div class="stat"><div class="number">${courses.length}</div><div class="label">Courses</div></div>
      <div class="stat"><div class="number">${num(totalCredits)}</div><div class="label">Credit hours</div></div>
      <div class="stat"><div class="number">${pct(averageSoFar)}</div><div class="label">Average so far</div></div>
      <div class="stat">
        <div class="number">${gpaText}</div>
        <div class="label">${gpa.label} (${gpa.included.length} of ${courses.length} courses)</div>
      </div>
    </div>
    <p class="muted small-text">
      The average and GPA use the work that has been graded so far. They change as more scores are added.
      <a href="gpa.html?semester=${encodeURIComponent(semester)}">See how the GPA is worked out</a>
    </p>

    <section class="card">
      <h2>Add a course</h2>
      <form class="inline-form" onsubmit="addCourse(event)" novalidate>
        <label>Course name <input name="courseName" placeholder="Introduction to Programming"></label>
        <label>Course code <input name="courseCode" placeholder="CS101"></label>
        <label>Credit hours <input name="credits" type="number" step="any" min="0" placeholder="3"></label>
        <label>Semester <input name="semester" value="${esc(semester)}"></label>
        <button type="submit">Add course</button>
      </form>
    </section>

    <h2>Your courses in ${esc(semester)}</h2>
    ${cards}
  `;

  if (successText) showMessage(successText, "success");
  else clearMessage();
}

// The HTML for one course card
function courseCardHtml(course) {
  const summary = courseSummary(course, {});
  const grade = gradeFor(summary.percent, data.scale);

  let letter = "?";
  let letterClass = "letter none";
  let gradeLine = "No scores yet. Open the course to add some.";
  if (grade !== null) {
    letter = esc(grade.letter);
    letterClass = "letter";
    gradeLine = pct(summary.percent) + " (" + num(grade.points) + " grade points)";
  }

  return `<article class="card course-card">
    <div class="top">
      <div class="${letterClass}">${letter}</div>
      <div>
        <h3>${esc(course.name)}</h3>
        <p class="muted">${esc(course.code)}, ${num(course.credits)} credit hours</p>
      </div>
    </div>
    <p><span class="badge ${summary.status}">${summary.word}</span> ${gradeLine}</p>
    <div>
      <progress max="100" value="${summary.gradedWeight}"></progress>
      <p class="muted small-text">${num(summary.gradedWeight)}% of the course graded so far</p>
    </div>
    <a class="button" href="course.html?id=${course.id}">Open course</a>
  </article>`;
}
