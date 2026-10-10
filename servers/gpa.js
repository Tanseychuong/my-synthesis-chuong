/* ==========================================================================
   gpa.js - the GPA projection page.
   Shows which courses count toward the GPA, and lets the student type
   pretend scores for pending assessments to see how the GPA would change.
   ========================================================================== */

const currentUser = requireLogin();
let data = null;
let semester = "";
let whatIf = {};         // pretend scores { assessmentId: percent }. NOT saved: lost on refresh.

if (currentUser) start();

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
  if (data.courses.length > 0) {
    return data.courses.reduce((a, b) => (b.id > a.id ? b : a)).semester;
  }
  return "Current semester";
}

function changeSemester(value) {
  location.href = "gpa.html?semester=" + encodeURIComponent(value);
}

function findAssessment(id) {
  for (const course of data.courses) {
    for (const category of course.categories) {
      const found = category.assessments.find(a => a.id === id);
      if (found) return found;
    }
  }
  return null;
}

// ----- Actions -----

function setWhatIf(assessmentId, text) {
  if (text.trim() === "") {
    delete whatIf[assessmentId];
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

// Turns a pretend score into a real recorded score
function saveWhatIfAsScore(assessmentId) {
  const a = findAssessment(assessmentId);
  a.score = round2((whatIf[assessmentId] / 100) * a.maxScore);
  delete whatIf[assessmentId];
  save();
  render("Saved as a real score.");
}

// ----- Page -----

function render(successText) {
  const courses = data.courses.filter(c => c.semester === semester);
  const result = semesterGpa(courses, data.scale, whatIf);

  // Courses that count toward the GPA
  let includedHtml;
  if (result.included.length === 0) {
    includedHtml = `<p class="muted">No course has a complete grade yet, so there is no GPA to show.</p>`;
  } else {
    const rows = result.included.map(item => `<tr>
      <td>${esc(item.course.code)}</td>
      <td>${esc(item.course.name)}</td>
      <td>${num(item.course.credits)}</td>
      <td>${pct(item.summary.projected)}</td>
      <td>${esc(item.grade.letter)}</td>
      <td>${num(item.grade.points)}</td>
    </tr>`).join("");
    includedHtml = `<div class="table-wrap"><table>
        <thead><tr><th>Code</th><th>Course</th><th>Credits</th><th>Projected</th><th>Letter</th><th>Grade points</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="muted small-text">GPA = total of (credits x grade points) divided by total credits
        = ${num(result.qualityPoints)} / ${num(result.credits)}.</p>`;
  }

  // Courses left out of the GPA, with the reason
  let excludedHtml = "";
  if (result.excluded.length > 0) {
    excludedHtml = `<section class="card">
      <h3>Not included in the GPA</h3>
      <p class="muted">These courses are left out. They are not counted as zero.</p>
      <ul>${result.excluded.map(item =>
        `<li><strong>${esc(item.course.code)}</strong>: ${esc(item.reason)}</li>`).join("")}</ul>
    </section>`;
  }

  // Pending assessments the student can try pretend scores on
  let whatIfHtml = "";
  let pretendCount = 0;
  for (const course of courses) {
    for (const category of course.categories) {
      const pending = category.assessments.filter(a => !isGraded(a));
      if (pending.length === 0) continue;

      const rows = pending.map(a => {
        const hasPretend = whatIf[a.id] !== undefined;
        if (hasPretend) pretendCount += 1;
        return `<tr>
          <td>${esc(a.name)}</td>
          <td>${a.maxScore}</td>
          <td><input type="number" step="any" min="0" max="100" placeholder="e.g. 85"
               value="${hasPretend ? whatIf[a.id] : ""}"
               aria-label="Pretend percentage for ${esc(a.name)}" onchange="setWhatIf(${a.id}, this.value)"></td>
          <td>${hasPretend ? `<button type="button" class="secondary small" onclick="saveWhatIfAsScore(${a.id})">Save as real score</button>` : ""}</td>
        </tr>`;
      }).join("");

      whatIfHtml += `<h3>${esc(course.code)}: ${esc(category.name)}</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Pending assessment</th><th>Out of</th><th>If I score (%)</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`;
    }
  }
  if (whatIfHtml === "") {
    whatIfHtml = `<p class="muted">No pending assessments. Add an assessment with an empty score in a course, and it will appear here.</p>`;
  }

  const options = [...new Set([...data.courses.map(c => c.semester), semester])].sort().map(name =>
    `<option value="${esc(name)}" ${name === semester ? "selected" : ""}>${esc(name)}</option>`).join("");

  document.getElementById("app").innerHTML = `
    <div class="page-title">
      <label>Semester
        <select onchange="changeSemester(this.value)">${options}</select>
      </label>
    </div>

    <section class="card summary">
      <div>
        <p class="muted">Projected GPA for ${esc(semester)}</p>
        <div class="big">${result.gpa === null ? "–" : result.gpa.toFixed(2)}</div>
        <p class="muted small-text">${result.included.length} of ${courses.length} courses included, ${num(result.credits)} credit hours.
          ${pretendCount > 0 ? "Includes " + pretendCount + " pretend score" + (pretendCount === 1 ? "" : "s") + "." : ""}
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
      ${pretendCount > 0 ? `<button type="button" class="secondary" onclick="clearWhatIf()">Clear all pretend scores</button>` : ""}
    </section>
  `;

  if (successText) showMessage(successText, "success");
  else clearMessage();
}
