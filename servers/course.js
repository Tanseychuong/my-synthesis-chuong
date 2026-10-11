/* ==========================================================================
   course.js - the page for one course.
   Shows the grade so far, a score table, the categories with their assessments,
   and the "What do I need to score?" calculator.
   The course comes from the address: course.html?id=3
   ========================================================================== */

const currentUser = requireLogin();
let data = null;           // this user's courses and grading scale
let course = null;         // the course on this page
let editing = null;        // the row being edited, like "category-3" or "assessment-7"

if (currentUser !== null) {
  start();
}

function start() {
  renderLayout("dashboard");
  data = loadUserData(currentUser);

  const id = Number(new URLSearchParams(location.search).get("id"));
  course = findById(data.courses, id);

  if (course === null) {
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

// ----- Editing a row (a category or an assessment) -----

function startEdit(what) {
  editing = what;
  render();
}

function cancelEdit() {
  editing = null;
  render();
}

// ----- Course actions -----

function saveCourse(event) {
  event.preventDefault();
  const form = event.target.elements;
  const name = form.courseName.value.trim();
  const code = form.courseCode.value.trim();
  const credits = parseNumber(form.credits.value);
  const courseSemester = form.semester.value.trim();

  const problem = checkCourse(data, name, code, credits, courseSemester, course.id);
  if (problem !== "") {
    showMessage(problem, "error");
    return;
  }

  course.name = name;
  course.code = code;
  course.credits = credits;
  course.semester = courseSemester;
  save();
  render("Course updated.");
}

function deleteCourse() {
  const sure = confirm("Delete " + course.name + "? Its categories and assessments will be deleted too.");
  if (!sure) return;

  data.courses = removeById(data.courses, course.id);
  save();
  flash("Course deleted.", "success");
  location.href = "dashboard.html?semester=" + encodeURIComponent(course.semester);
}

// ----- Category actions -----

function addCategory(event) {
  event.preventDefault();
  const form = event.target.elements;
  const name = form.catName.value.trim();
  const weight = parseNumber(form.weight.value);

  const problem = checkCategory(course, name, weight, null);
  if (problem !== "") {
    showMessage(problem, "error");
    return;
  }

  course.categories.push({ id: newId(data), name: name, weight: weight, assessments: [] });
  save();
  render("Category added.");
}

function saveCategory(categoryId) {
  const category = findById(course.categories, categoryId);
  const name = document.getElementById("edit-catName").value.trim();
  const weight = parseNumber(document.getElementById("edit-catWeight").value);

  const problem = checkCategory(course, name, weight, categoryId);
  if (problem !== "") {
    showMessage(problem, "error");
    return;
  }

  category.name = name;
  category.weight = weight;
  editing = null;
  save();
  render("Category updated.");
}

function deleteCategory(categoryId) {
  const category = findById(course.categories, categoryId);
  const count = category.assessments.length;

  // Warn first if the category already has assessments in it
  if (count > 0) {
    const sure = confirm(category.name + " has " + count + " recorded assessment(s). Delete the category and all of them?");
    if (!sure) return;
  }

  course.categories = removeById(course.categories, categoryId);
  save();
  render("Category deleted.");
}

// ----- Assessment actions -----

function addAssessment(event, categoryId) {
  event.preventDefault();
  const category = findById(course.categories, categoryId);
  const form = event.target.elements;

  const name = form.title.value.trim();
  const score = readScore(form.score.value);          // null when the box is empty
  const max = parseNumber(form.max.value);

  const problem = checkAssessment(name, score, max);
  if (problem !== "") {
    showMessage(problem, "error");
    return;
  }

  category.assessments.push({
    id: newId(data),
    name: name,
    score: score,
    maxScore: max,
    due: form.due.value
  });
  save();
  render("Assessment added.");
}

function saveAssessment(categoryId, assessmentId) {
  const category = findById(course.categories, categoryId);
  const assessment = findById(category.assessments, assessmentId);

  const name = document.getElementById("edit-name").value.trim();
  const score = readScore(document.getElementById("edit-score").value);
  const max = parseNumber(document.getElementById("edit-max").value);

  const problem = checkAssessment(name, score, max);
  if (problem !== "") {
    showMessage(problem, "error");
    return;
  }

  assessment.name = name;
  assessment.score = score;
  assessment.maxScore = max;
  assessment.due = document.getElementById("edit-due").value;
  editing = null;
  save();
  render("Assessment updated.");
}

function deleteAssessment(categoryId, assessmentId) {
  const category = findById(course.categories, categoryId);
  category.assessments = removeById(category.assessments, assessmentId);
  save();
  render("Assessment deleted.");
}

// ----- "What do I need to score?" -----

function calculateTarget() {
  const target = parseNumber(document.getElementById("target").value);
  const box = document.getElementById("target-result");

  if (!(target >= 0 && target <= 100)) {
    box.textContent = "Enter a target between 0 and 100.";
    return;
  }
  box.textContent = targetMessage(course, target);
}

// ----- Drawing the page -----

function render(successText) {
  document.getElementById("app").innerHTML = courseView();
  if (successText) showMessage(successText, "success");
  else clearMessage();
}

function courseView() {
  const summary = courseSummary(course, {});
  const grade = gradeFor(summary.percent, data.scale);

  // Box 1: the course grade, with a label saying how sure we are
  let gradeBox = "";
  if (grade !== null) {
    gradeBox = `<div class="big">${pct(summary.percent)}</div>
      <p><span class="badge ${summary.status}">${summary.word}</span>
         ${summary.label}: <strong>${esc(grade.letter)}</strong>, ${num(grade.points)} grade points</p>
      <p class="muted small-text">${esc(summary.note)} This is an estimate, not an official grade.</p>`;
  } else {
    gradeBox = `<div class="big">–</div><p>${esc(summary.note)}</p>`;
  }

  // Box 2: how much of the course has been graded
  const progressBox = `<div class="big">${num(summary.gradedWeight)}%</div>
    <progress max="100" value="${summary.gradedWeight}"></progress>
    <p class="muted small-text">of the course is graded so far
      (${summary.gradedCategories} of ${summary.categoryCount} categories have scores).</p>`;

  // Box 3: do the category weights add up to 100?
  let weightsText = "Weights total 100%.";
  let weightsClass = "good";
  if (summary.totalWeight !== 100) {
    weightsClass = "warn";
    weightsText = "Weights should total 100%.";
    if (summary.remaining > 0) weightsText += " " + num(summary.remaining) + "% still to allocate.";
  }
  const weightsBox = `<div class="big">${num(summary.totalWeight)}%</div>
    <div class="status ${weightsClass}">${weightsText}</div>`;

  // The categories
  let categories = "";
  if (course.categories.length === 0) {
    categories = `<div class="card empty"><p><strong>No categories yet.</strong></p>
      <p>Add a category such as Assignments or Final exam below, and give it a weight.</p></div>`;
  } else {
    for (let i = 0; i < course.categories.length; i++) {
      categories += categoryHtml(course.categories[i]);
    }
  }

  return `
    <p><a class="button secondary small" href="dashboard.html?semester=${encodeURIComponent(course.semester)}">Back to dashboard</a></p>

    <div class="page-title">
      <div>
        <h2>${esc(course.name)}</h2>
        <p class="muted">${esc(course.code)}, ${num(course.credits)} credit hours, ${esc(course.semester)}</p>
      </div>
    </div>

    <section class="card summary">
      <div><p class="muted">Course grade</p>${gradeBox}</div>
      <div><p class="muted">Progress</p>${progressBox}</div>
      <div><p class="muted">Category weights</p>${weightsBox}</div>
    </section>

    ${breakdownHtml()}

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

// The score table, with the same columns as the tracker spreadsheet
function breakdownHtml() {
  if (course.categories.length === 0) return "";

  const table = courseBreakdown(course, {});
  let rows = "";
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];

    let possible = "–";
    let earned = "–";
    let finalScore = "–";
    if (row.percent !== null) {
      possible = num(row.possible);
      earned = num(row.earned);
      finalScore = num(row.finalScore);
    }

    rows += `<tr>
      <td>${esc(row.name)}</td>
      <td>${num(row.weight)}%</td>
      <td>${possible}</td>
      <td>${earned}</td>
      <td>${pct(row.percent)}</td>
      <td>${finalScore}</td>
    </tr>`;
  }

  return `<section class="card">
    <h3>Score breakdown</h3>
    <p class="muted small-text">Each category's percentage is points earned divided by points possible.
      Multiply it by the category's weight to get its final score. Categories with no scores yet show a dash.</p>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Category</th><th>Weight</th><th>Total score possible</th><th>My score</th><th>Percent</th><th>Final score</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <th>Total</th><th>${num(table.weightSum)}%</th><th></th><th></th><th></th><th>${num(table.finalScoreSum)}</th>
      </tr></tfoot>
    </table></div>
  </section>`;
}

// One category: its title, its table of assessments, and a form to add another
function categoryHtml(category) {
  const stats = categoryStats(category, {});

  let head = "";
  if (editing === "category-" + category.id) {
    head = `<div class="row-edit">
      <label>Category name <input id="edit-catName" value="${esc(category.name)}"></label>
      <label>Weight (%) <input id="edit-catWeight" type="number" step="any" min="0" max="100" value="${category.weight}"></label>
      <div class="actions">
        <button type="button" onclick="saveCategory(${category.id})">Save</button>
        <button type="button" class="secondary" onclick="cancelEdit()">Cancel</button>
      </div>
    </div>`;
  } else {
    let plural = "s";
    if (stats.counted === 1) plural = "";
    head = `<div class="category-head">
      <div>
        <h3>${esc(category.name)}</h3>
        <p class="muted">Worth ${num(category.weight)}% of the course grade.
          Average: <strong>${pct(stats.average)}</strong> from ${stats.counted} graded assessment${plural}.</p>
      </div>
      <div class="actions">
        <button type="button" class="secondary small" onclick="startEdit('category-${category.id}')">Edit category</button>
        <button type="button" class="danger small" onclick="deleteCategory(${category.id})">Delete category</button>
      </div>
    </div>`;
  }

  let table = '<p class="muted">No assessments yet. Add the first one below.</p>';
  if (category.assessments.length > 0) {
    let rows = "";
    for (let i = 0; i < category.assessments.length; i++) {
      rows += assessmentRowHtml(category, category.assessments[i]);
    }
    table = `<div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Score</th><th>Out of</th><th>Percent</th><th>Due</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

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

// One row of the assessments table. It turns into input boxes while being edited.
function assessmentRowHtml(category, a) {
  if (editing === "assessment-" + a.id) {
    let scoreValue = "";
    if (a.score !== null) scoreValue = a.score;

    return `<tr>
      <td><input id="edit-name" value="${esc(a.name)}" aria-label="Assessment name"></td>
      <td><input id="edit-score" type="number" step="any" min="0" value="${scoreValue}" placeholder="Pending" aria-label="Score earned"></td>
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

  let status = "pending";
  let score = "–";
  let percent = "–";
  if (isGraded(a)) {
    status = "graded";
    score = a.score;
    percent = pct(a.score / a.maxScore * 100);
  }
  let due = "–";
  if (a.due) due = esc(a.due);

  return `<tr>
    <td>${esc(a.name)}</td>
    <td>${score}</td>
    <td>${a.maxScore}</td>
    <td>${percent}</td>
    <td>${due}</td>
    <td><span class="badge ${status}">${status}</span></td>
    <td><div class="actions">
      <button type="button" class="secondary small" onclick="startEdit('assessment-${a.id}')">Edit</button>
      <button type="button" class="danger small" onclick="deleteAssessment(${category.id}, ${a.id})">Delete</button>
    </div></td>
  </tr>`;
}
