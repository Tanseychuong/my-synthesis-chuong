/* ==========================================================================
   gpa.js - the GPA projection page.
   Shows how the semester GPA is worked out, and lets the student type pretend
   scores for pending assessments to see how the GPA would change.
   ========================================================================== */

const currentUser = requireLogin();
let data = null;           // this user's courses and grading scale
let semester = "";         // the semester being shown
let whatIf = {};           // pretend scores, like { 12: 85 }. They are NOT saved: a refresh clears them.

if (currentUser !== null) {
  start();
}

function start() {
  renderLayout("gpa");
  data = loadUserData(currentUser);
  semester = chooseSemester();
  render();
  showFlash();
}

function save() {
  saveUserData(currentUser, data);
}

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

function allSemesters() {
  const names = [];
  for (let i = 0; i < data.courses.length; i++) {
    if (names.indexOf(data.courses[i].semester) === -1) names.push(data.courses[i].semester);
  }
  if (names.indexOf(semester) === -1) names.push(semester);
  names.sort();
  return names;
}

function coursesInSemester() {
  const list = [];
  for (let i = 0; i < data.courses.length; i++) {
    if (data.courses[i].semester === semester) list.push(data.courses[i]);
  }
  return list;
}

function changeSemester(value) {
  location.href = "gpa.html?semester=" + encodeURIComponent(value);
}

// Look through every course for one assessment
function findAssessment(id) {
  for (let i = 0; i < data.courses.length; i++) {
    const course = data.courses[i];
    for (let j = 0; j < course.categories.length; j++) {
      const found = findById(course.categories[j].assessments, id);
      if (found !== null) return found;
    }
  }
  return null;
}

// ----- Actions -----

// Called when the student types a pretend percentage
function setWhatIf(assessmentId, text) {
  if (text.trim() === "") {
    delete whatIf[assessmentId];                  // empty box: forget the pretend score
  } else {
    const number = Number(text);
    if (isNaN(number) || number < 0 || number > 100) {
      showMessage("Enter a percentage between 0 and 100.", "error");
      return;
    }
    whatIf[assessmentId] = number;
  }
  render();
}

function clearWhatIf() {
  whatIf = {};
  render("Pretend scores cleared.");
}

// Turn a pretend score into a real score that is saved
function saveWhatIfAsScore(assessmentId) {
  const assessment = findAssessment(assessmentId);
  assessment.score = round2(whatIf[assessmentId] / 100 * assessment.maxScore);
  delete whatIf[assessmentId];
  save();
  render("Saved as a real score.");
}

// ----- Drawing the page -----

function render(successText) {
  const courses = coursesInSemester();
  const result = semesterGpa(courses, data.scale, whatIf);

  // Table of the courses that count toward the GPA
  let includedHtml = '<p class="muted">No course has any scores yet, so there is no GPA to show.</p>';
  if (result.included.length > 0) {
    let rows = "";
    for (let i = 0; i < result.included.length; i++) {
      const item = result.included[i];
      rows += `<tr>
        <td>${esc(item.course.code)}</td>
        <td>${esc(item.course.name)}</td>
        <td>${num(item.course.credits)}</td>
        <td>${pct(item.summary.percent)}</td>
        <td><span class="badge ${item.summary.status}">${item.summary.word}</span></td>
        <td>${num(item.summary.gradedWeight)}%</td>
        <td>${esc(item.grade.letter)}</td>
        <td>${num(item.grade.points)}</td>
      </tr>`;
    }
    includedHtml = `<div class="table-wrap"><table>
        <thead><tr>
          <th>Code</th><th>Course</th><th>Credits</th><th>Percent</th><th>Status</th>
          <th>Graded so far</th><th>Letter</th><th>Grade points</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="muted small-text">GPA = (credits x grade points, added up for every course) divided by (all the credits added up)
        = ${num(result.qualityPoints)} / ${num(result.credits)}.</p>`;
  }

  // Courses that are left out, with the reason
  let excludedHtml = "";
  if (result.excluded.length > 0) {
    let items = "";
    for (let i = 0; i < result.excluded.length; i++) {
      items += "<li><strong>" + esc(result.excluded[i].course.code) + "</strong>: " + esc(result.excluded[i].reason) + "</li>";
    }
    excludedHtml = `<section class="card">
      <h3>Not included in the GPA</h3>
      <p class="muted">These courses are left out. They are not counted as zero.</p>
      <ul>${items}</ul>
    </section>`;
  }

  // Pending assessments the student can try pretend scores on
  let whatIfHtml = "";
  let pretendCount = 0;
  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    for (let j = 0; j < course.categories.length; j++) {
      const category = course.categories[j];

      let rows = "";
      for (let k = 0; k < category.assessments.length; k++) {
        const a = category.assessments[k];
        if (isGraded(a)) continue;                     // only pending ones

        let value = "";
        let saveButton = "";
        if (whatIf[a.id] !== undefined) {
          pretendCount += 1;
          value = whatIf[a.id];
          saveButton = '<button type="button" class="secondary small" onclick="saveWhatIfAsScore(' + a.id + ')">Save as real score</button>';
        }

        rows += `<tr>
          <td>${esc(a.name)}</td>
          <td>${a.maxScore}</td>
          <td><input type="number" step="any" min="0" max="100" placeholder="e.g. 85" value="${value}"
               aria-label="Pretend percentage for ${esc(a.name)}" onchange="setWhatIf(${a.id}, this.value)"></td>
          <td>${saveButton}</td>
        </tr>`;
      }

      if (rows !== "") {
        whatIfHtml += `<h3>${esc(course.code)}: ${esc(category.name)}</h3>
          <div class="table-wrap"><table>
            <thead><tr><th>Pending assessment</th><th>Out of</th><th>If I score (%)</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`;
      }
    }
  }
  if (whatIfHtml === "") {
    whatIfHtml = '<p class="muted">No pending assessments. Add an assessment with an empty score in a course, and it will appear here.</p>';
  }

  let clearButton = "";
  if (pretendCount > 0) {
    clearButton = '<button type="button" class="secondary" onclick="clearWhatIf()">Clear all pretend scores</button>';
  }

  let pretendText = "";
  if (pretendCount === 1) pretendText = " Includes 1 pretend score.";
  if (pretendCount > 1) pretendText = " Includes " + pretendCount + " pretend scores.";

  let options = "";
  const semesters = allSemesters();
  for (let i = 0; i < semesters.length; i++) {
    let selected = "";
    if (semesters[i] === semester) selected = "selected";
    options += '<option value="' + esc(semesters[i]) + '" ' + selected + ">" + esc(semesters[i]) + "</option>";
  }

  let gpaText = "–";
  if (result.gpa !== null) gpaText = result.gpa.toFixed(2);

  document.getElementById("app").innerHTML = `
    <div class="page-title">
      <label>Semester
        <select onchange="changeSemester(this.value)">${options}</select>
      </label>
    </div>

    <section class="card summary">
      <div>
        <p class="muted">${result.label} for ${esc(semester)}</p>
        <div class="big">${gpaText}</div>
        <p class="muted small-text">${result.included.length} of ${courses.length} courses included, ${num(result.credits)} credit hours.${pretendText}
          Each course counts its grade so far, so the GPA changes as more work is graded.
          This is an estimate based on your grading scale, not an official GPA.</p>
      </div>
    </section>

    <section class="card">
      <h3>Courses in the GPA</h3>
      ${includedHtml}
    </section>

    ${excludedHtml}

    <section class="card">
      <h2>Try different scores</h2>
      <p class="muted">Type a percentage for a pending assessment to see how the GPA changes.
        Pretend scores are not saved unless you choose "Save as real score".</p>
      ${whatIfHtml}
      ${clearButton}
    </section>
  `;

  if (successText) showMessage(successText, "success");
  else clearMessage();
}
