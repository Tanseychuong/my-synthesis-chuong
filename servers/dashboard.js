/* ==========================================================================
   dashboard.js - the dashboard page: stats, add a course, list of courses.
   The page shows ONE semester at a time (chosen with ?semester=... in the address).
   ========================================================================== */

const currentUser = requireLogin();
let data = null;
let semester = "";

if (currentUser) start();

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

// The semester from the address, else the newest course's semester
function chooseSemester() {
  const fromAddress = new URLSearchParams(location.search).get("semester");
  if (fromAddress) return fromAddress;
  if (data.courses.length > 0) {
    const newest = data.courses.reduce((a, b) => (b.id > a.id ? b : a));
    return newest.semester;
  }
  return "Current semester";
}

function allSemesters() {
  const names = new Set(data.courses.map(c => c.semester));
  names.add(semester);
  return [...names].sort();
}

function changeSemester(value) {
  location.href = "dashboard.html?semester=" + encodeURIComponent(value);
}

// ----- Actions -----

function addCourse(event) {
  event.preventDefault();
  const f = event.target.elements;
  const name = f.courseName.value.trim();
  const code = f.courseCode.value.trim();
  const credits = parseNumber(f.credits.value);
  const courseSemester = f.semester.value.trim();

  const problem = checkCourse(data, name, code, credits, courseSemester, null);
  if (problem) { showMessage(problem, "error"); return; }

  data.courses.push({
    id: newId(data), name: name, code: code, credits: credits,
    semester: courseSemester, categories: []
  });
  save();
  semester = courseSemester;       // jump to the semester the course was added to
  render("Course added.");
}

// ----- Page -----

function render(successText) {
  const courses = data.courses.filter(c => c.semester === semester);
  const gpa = semesterGpa(courses, data.scale);

  // Current average across courses that have at least one score, weighted by credits
  let weighted = 0;
  let credits = 0;
  for (const course of courses) {
    const summary = courseSummary(course);
    if (summary.current !== null) {
      weighted += summary.current * course.credits;
      credits += course.credits;
    }
  }
  const currentAverage = credits > 0 ? weighted / credits : null;
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

  const options = allSemesters().map(name =>
    `<option value="${esc(name)}" ${name === semester ? "selected" : ""}>${esc(name)}</option>`).join("");

  const cards = courses.length === 0
    ? `<div class="card empty">
         <p><strong>No courses in this semester yet.</strong></p>
         <p>Add your first course above, then open it to set up its assessment categories.</p>
       </div>`
    : `<div class="course-grid">${courses.map(courseCardHtml).join("")}</div>`;

  document.getElementById("app").innerHTML = `
    <div class="page-title">
      <label>Semester
        <select onchange="changeSemester(this.value)">${options}</select>
      </label>
    </div>

    <div class="stats">
      <div class="stat"><div class="number">${courses.length}</div><div class="label">Courses</div></div>
      <div class="stat"><div class="number">${num(totalCredits)}</div><div class="label">Credit hours</div></div>
      <div class="stat"><div class="number">${pct(currentAverage)}</div><div class="label">Current average so far</div></div>
      <div class="stat">
        <div class="number">${gpa.gpa === null ? "–" : gpa.gpa.toFixed(2)}</div>
        <div class="label">Projected GPA (${gpa.included.length} of ${courses.length} courses included)</div>
      </div>
    </div>
    <p class="muted small-text">
      The projected GPA only includes courses whose weights total 100% and have scores in every category.
      <a href="gpa.html?semester=${encodeURIComponent(semester)}">See which courses are included</a>
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

function courseCardHtml(course) {
  const summary = courseSummary(course);
  const grade = gradeFor(summary.projected, data.scale);

  const currentLine = summary.current === null ? "No scores yet" : "Current: " + pct(summary.current);
  const gradeLine = grade
    ? (summary.kind === "final" ? "Final: " : "Projected: ") + pct(summary.projected) + " (" + num(grade.points) + " grade points)"
    : summary.problem;

  return `<article class="card course-card">
    <div class="top">
      <div class="letter ${grade ? "" : "none"}">${grade ? esc(grade.letter) : "?"}</div>
      <div>
        <h3>${esc(course.name)}</h3>
        <p class="muted">${esc(course.code)}, ${num(course.credits)} credit hours</p>
      </div>
    </div>
    <p>${currentLine}</p>
    <p class="muted small-text">${esc(gradeLine)}</p>
    <a class="button" href="course.html?id=${course.id}">Open course</a>
  </article>`;
}
