/* ==========================================================================
   course.js - one course: summary, categories, assessments, target calculator.
   The course comes from the address: course.html?id=3
   ========================================================================== */

const currentUser = requireLogin();
let data = null;
let course = null;
let editing = null;        // which row is being edited, e.g. "category-3" or "assessment-7"

if (currentUser) start();

function start() {
  renderLayout("dashboard");
  data = loadUserData(currentUser);

  const id = Number(new URLSearchParams(location.search).get("id"));
  course = data.courses.find(c => c.id === id);

  if (!course) {
    flash("That course was not found.", "error");
    location.href = "dashboard.html";
    return;
  }
  render();
  showFlash();
}

function save() {
  saveUserData(currentUser, data);
}

function findCategory(id) {
  return course.categories.find(c => c.id === id);
}

// ----- Editing rows -----

function startEdit(what) { editing = what; render(); }
function cancelEdit() { editing = null; render(); }

// ----- Course actions -----

function saveCourse(event) {
  event.preventDefault();
  const f = event.target.elements;
  const name = f.courseName.value.trim();
  const code = f.courseCode.value.trim();
  const credits = parseNumber(f.credits.value);
  const semester = f.semester.value.trim();

  const problem = checkCourse(data, name, code, credits, semester, course.id);
  if (problem) { showMessage(problem, "error"); return; }

  course.name = name;
  course.code = code;
  course.credits = credits;
  course.semester = semester;
  save();
  render("Course updated.");
}

function deleteCourse() {
  if (!confirm("Delete " + course.name + "? Its categories and assessments will be deleted too.")) return;

  data.courses = data.courses.filter(c => c.id !== course.id);
  save();
  flash("Course deleted.", "success");
  location.href = "dashboard.html?semester=" + encodeURIComponent(course.semester);
}

// ----- Category actions -----

function addCategory(event) {
  event.preventDefault();
  const f = event.target.elements;
  const name = f.catName.value.trim();
  const weight = parseNumber(f.weight.value);

  const problem = checkCategory(course, name, weight, null);
  if (problem) { showMessage(problem, "error"); return; }

  course.categories.push({ id: newId(data), name: name, weight: weight, assessments: [] });
  save();
  render("Category added.");
}

function saveCategory(categoryId) {
  const category = findCategory(categoryId);
  const name = document.getElementById("edit-catName").value.trim();
  const weight = parseNumber(document.getElementById("edit-catWeight").value);

  const problem = checkCategory(course, name, weight, categoryId);
  if (problem) { showMessage(problem, "error"); return; }

  category.name = name;
  category.weight = weight;
  editing = null;
  save();
  render("Category updated.");
}

function deleteCategory(categoryId) {
  const category = findCategory(categoryId);
  const count = category.assessments.length;

  if (count > 0) {
    const ok = confirm(category.name + " has " + count + " recorded assessment(s). Delete the category and all of them?");
    if (!ok) return;
  }

  course.categories = course.categories.filter(c => c.id !== categoryId);
  save();
  render("Category deleted.");
}

// ----- Assessment actions -----

function addAssessment(event, categoryId) {
  event.preventDefault();
  const category = findCategory(categoryId);
  const f = event.target.elements;

  const name = f.title.value.trim();
  const score = readScore(f.score.value);
  const max = parseNumber(f.max.value);

  const problem = checkAssessment(name, score, max);
  if (problem) { showMessage(problem, "error"); return; }

  category.assessments.push({ id: newId(data), name: name, score: score, maxScore: max, due: f.due.value });
  save();
  render("Assessment added.");
}

function saveAssessment(categoryId, assessmentId) {
  const category = findCategory(categoryId);
  const a = category.assessments.find(item => item.id === assessmentId);

  const name = document.getElementById("edit-name").value.trim();
  const score = readScore(document.getElementById("edit-score").value);
  const max = parseNumber(document.getElementById("edit-max").value);

  const problem = checkAssessment(name, score, max);
  if (problem) { showMessage(problem, "error"); return; }

  a.name = name;
  a.score = score;
  a.maxScore = max;
  a.due = document.getElementById("edit-due").value;
  editing = null;
  save();
  render("Assessment updated.");
}

function deleteAssessment(categoryId, assessmentId) {
  const category = findCategory(categoryId);
  category.assessments = category.assessments.filter(a => a.id !== assessmentId);
  save();
  render("Assessment deleted.");
}

// ----- Target calculator -----

function calculateTarget() {
  const target = parseNumber(document.getElementById("target").value);
  const box = document.getElementById("target-result");

  if (!(target >= 0 && target <= 100)) {
    box.textContent = "Enter a target between 0 and 100.";
    return;
  }
  box.textContent = targetMessage(course, target);
}

// ----- Page -----

function render(successText) {
  document.getElementById("app").innerHTML = courseView();
  if (successText) showMessage(successText, "success");
  else clearMessage();
}

function courseView() {
  const summary = courseSummary(course);
  const grade = gradeFor(summary.projected, data.scale);

  const currentBox = summary.current === null
    ? `<div class="big">–</div><p class="muted">No scores recorded yet.</p>`
    : `<div class="big">${pct(summary.current)}</div>
       <p class="muted">Based on ${summary.scoredCount} of ${summary.categoryCount} categories that have scores.</p>`;

  let gradeBox;
  if (grade) {
    const title = summary.kind === "final" ? "Final calculated grade" : "Projected final grade";
    const note = summary.kind === "projected"
      ? "Some assessments are still pending, so this assumes you keep scoring at your current average in each category. "
      : "";
    gradeBox = `<div class="big">${pct(summary.projected)}</div>
      <p>${title}: <strong>${esc(grade.letter)}</strong>, ${num(grade.points)} grade points</p>
      <p class="muted small-text">${note}This is an estimate, not an official grade.</p>`;
  } else {
    gradeBox = `<div class="big">–</div><p>${esc(summary.problem)}</p>`;
  }

  const weightsBox = `<div class="big">${num(summary.total)}%</div>
    <div class="status ${summary.weightsOk ? "good" : "warn"}">
      ${summary.weightsOk
        ? "Weights total 100%."
        : "Weights must total 100% to get a projected grade." + (summary.remaining > 0 ? " " + num(summary.remaining) + "% still to allocate." : "")}
    </div>`;

  const categories = course.categories.length === 0
    ? `<div class="card empty"><p><strong>No categories yet.</strong></p>
       <p>Add a category such as Assignments or Final exam below, and give it a weight.</p></div>`
    : course.categories.map(categoryHtml).join("");

  return `
    <p><a class="button secondary small" href="dashboard.html?semester=${encodeURIComponent(course.semester)}">Back to dashboard</a></p>

    <div class="page-title">
      <div>
        <h2>${esc(course.name)}</h2>
        <p class="muted">${esc(course.code)}, ${num(course.credits)} credit hours, ${esc(course.semester)}</p>
      </div>
    </div>

    <section class="card summary">
      <div><p class="muted">Current performance</p>${currentBox}</div>
      <div><p class="muted">Course grade</p>${gradeBox}</div>
      <div><p class="muted">Category weights</p>${weightsBox}</div>
    </section>

    <section class="card">
      <details>
        <summary>Edit course details</summary>
        <form class="inline-form" onsubmit="saveCourse(event)" novalidate>
          <label>Course name <input name="courseName" value="${esc(course.name)}"></label>
          <label>Course code <input name="courseCode" value="${esc(course.code)}"></label>
          <label>Credit hours <input name="credits" type="number" step="any" min="0" value="${course.credits}"></label>
          <label>Semester <input name="semester" value="${esc(course.semester)}"></label>
          <button type="submit">Save changes</button>
        </form>
        <p class="below"><button type="button" class="danger" onclick="deleteCourse()">Delete this course</button></p>
      </details>
    </section>

    <h2>Assessment categories</h2>
    ${categories}

    <section class="card">
      <h3>Add a category</h3>
      <form class="inline-form" onsubmit="addCategory(event)" novalidate>
        <label>Category name <input name="catName" placeholder="Assignments"></label>
        <label>Weight (% of course grade) <input name="weight" type="number" step="any" min="0" max="100" placeholder="20"></label>
        <button type="submit">Add category</button>
      </form>
    </section>

    <section class="card">
      <h2>What do I need to score?</h2>
      <p class="muted">Enter the course grade you want. This finds the average percentage you would need across all pending assessments.</p>
      <div class="inline-form">
        <label>Target course grade (%) <input id="target" type="number" step="any" min="0" max="100" placeholder="80"></label>
        <button type="button" onclick="calculateTarget()">Calculate</button>
      </div>
      <p id="target-result" class="result" aria-live="polite"></p>
    </section>
  `;
}

function categoryHtml(category) {
  const stats = categoryStats(category);
  const isEditing = editing === "category-" + category.id;

  let head;
  if (isEditing) {
    head = `<div class="row-edit">
      <label>Category name <input id="edit-catName" value="${esc(category.name)}"></label>
      <label>Weight (%) <input id="edit-catWeight" type="number" step="any" min="0" max="100" value="${category.weight}"></label>
      <div class="actions">
        <button type="button" onclick="saveCategory(${category.id})">Save</button>
        <button type="button" class="secondary" onclick="cancelEdit()">Cancel</button>
      </div>
    </div>`;
  } else {
    head = `<div class="category-head">
      <div>
        <h3>${esc(category.name)}</h3>
        <p class="muted">Worth ${num(category.weight)}% of the course grade.
          Average: <strong>${pct(stats.average)}</strong> from ${stats.counted} graded assessment${stats.counted === 1 ? "" : "s"}.</p>
      </div>
      <div class="actions">
        <button type="button" class="secondary small" onclick="startEdit('category-${category.id}')">Edit category</button>
        <button type="button" class="danger small" onclick="deleteCategory(${category.id})">Delete category</button>
      </div>
    </div>`;
  }

  const rows = category.assessments.map(a => assessmentRowHtml(category, a)).join("");
  const table = category.assessments.length === 0
    ? `<p class="muted">No assessments yet. Add the first one below.</p>`
    : `<div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Score</th><th>Out of</th><th>Percent</th><th>Due</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;

  return `<section class="card">
    ${head}
    ${table}
    <form class="inline-form" onsubmit="addAssessment(event, ${category.id})" novalidate>
      <label>Assessment name <input name="title" placeholder="Assignment 1"></label>
      <label>Score earned (empty = pending) <input name="score" type="number" step="any" min="0"></label>
      <label>Out of <input name="max" type="number" step="any" min="0" placeholder="50"></label>
      <label>Due date (optional) <input name="due" type="date"></label>
      <button type="submit">Add assessment</button>
    </form>
  </section>`;
}

function assessmentRowHtml(category, a) {
  if (editing === "assessment-" + a.id) {
    return `<tr>
      <td><input id="edit-name" value="${esc(a.name)}" aria-label="Assessment name"></td>
      <td><input id="edit-score" type="number" step="any" min="0" value="${a.score === null ? "" : a.score}" placeholder="Pending" aria-label="Score earned"></td>
      <td><input id="edit-max" type="number" step="any" min="0" value="${a.maxScore}" aria-label="Maximum score"></td>
      <td></td>
      <td><input id="edit-due" type="date" value="${esc(a.due || "")}" aria-label="Due date"></td>
      <td></td>
      <td><div class="actions">
        <button type="button" class="small" onclick="saveAssessment(${category.id}, ${a.id})">Save</button>
        <button type="button" class="secondary small" onclick="cancelEdit()">Cancel</button>
      </div></td>
    </tr>`;
  }

  const status = isGraded(a) ? "graded" : "pending";
  return `<tr>
    <td>${esc(a.name)}</td>
    <td>${isGraded(a) ? a.score : "–"}</td>
    <td>${a.maxScore}</td>
    <td>${isGraded(a) ? pct((a.score / a.maxScore) * 100) : "–"}</td>
    <td>${a.due ? esc(a.due) : "–"}</td>
    <td><span class="badge ${status}">${status}</span></td>
    <td><div class="actions">
      <button type="button" class="secondary small" onclick="startEdit('assessment-${a.id}')">Edit</button>
      <button type="button" class="danger small" onclick="deleteAssessment(${category.id}, ${a.id})">Delete</button>
    </div></td>
  </tr>`;
}
