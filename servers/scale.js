/* ==========================================================================
   scale.js - the grading scale page.
   The student can change the rows, add rows and remove rows.
   Nothing is saved until "Save scale" is pressed, and then every row is checked.
   ========================================================================== */

const currentUser = requireLogin();
let data = null;           // this user's courses and grading scale

if (currentUser !== null) {
  start();
}

function start() {
  renderLayout("scale");
  data = loadUserData(currentUser);
  render();
  showFlash();
}

function save() {
  saveUserData(currentUser, data);
}

// The HTML for one row of the scale table
function scaleRowHtml(row) {
  return `<tr>
    <td><input type="number" class="scale-min" step="any" min="0" max="100" value="${row.min}" aria-label="Minimum percentage"></td>
    <td><input type="text" class="scale-letter" value="${esc(row.letter)}" aria-label="Letter grade"></td>
    <td><input type="number" class="scale-points" step="any" min="0" value="${row.points}" aria-label="Grade points"></td>
    <td><button type="button" class="danger small" onclick="this.closest('tr').remove()">Remove</button></td>
  </tr>`;
}

// Add an empty row at the bottom of the table
function addScaleRow() {
  const emptyRow = { min: "", letter: "", points: "" };
  document.getElementById("scale-rows").insertAdjacentHTML("beforeend", scaleRowHtml(emptyRow));
}

// Read every row from the page, check them, and save the new scale
function saveScale() {
  const tableRows = document.querySelectorAll("#scale-rows tr");
  const rows = [];

  for (let i = 0; i < tableRows.length; i++) {
    rows.push({
      min: parseNumber(tableRows[i].querySelector(".scale-min").value),
      letter: tableRows[i].querySelector(".scale-letter").value.trim(),
      points: parseNumber(tableRows[i].querySelector(".scale-points").value)
    });
  }

  if (rows.length === 0) {
    showMessage("Add at least one row.", "error");
    return;
  }

  const minimums = [];                 // the minimums we have seen, to catch repeats
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!(row.min >= 0 && row.min <= 100)) {
      showMessage("Every minimum percentage must be between 0 and 100.", "error");
      return;
    }
    if (row.letter === "") {
      showMessage("Every row needs a letter grade.", "error");
      return;
    }
    if (!(row.points >= 0)) {
      showMessage("Grade points must be a number, 0 or more.", "error");
      return;
    }
    if (minimums.indexOf(row.min) !== -1) {
      showMessage("Two rows have the same minimum percentage (" + row.min + ").", "error");
      return;
    }
    minimums.push(row.min);
  }

  // One row must start at 0, otherwise a very low grade would have no letter
  if (minimums.indexOf(0) === -1) {
    showMessage("One row must start at 0%, so every grade gets a letter.", "error");
    return;
  }

  data.scale = sortedScale(rows);      // highest grade first
  save();
  render("Grading scale saved.");
}

function resetScale() {
  const sure = confirm("Replace your grading scale with the default scale?");
  if (!sure) return;

  data.scale = copyDefaultScale();
  save();
  render("Default grading scale restored.");
}

function render(successText) {
  const sorted = sortedScale(data.scale);
  let rows = "";
  for (let i = 0; i < sorted.length; i++) {
    rows += scaleRowHtml(sorted[i]);
  }

  document.getElementById("app").innerHTML = `
    <div class="page-title"><h2>Grading scale</h2></div>
    <section class="card">
      <p>A grade at or above the minimum percentage gets that letter and those grade points.</p>
      <p class="muted">The letters and bands start from the Course GPA Tracker spreadsheet. The grade points are the usual
        4.0 steps, so check them against your university's policy. Course grades and GPA use this scale.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Minimum %</th><th>Letter</th><th>Grade points</th><th></th></tr></thead>
        <tbody id="scale-rows">${rows}</tbody>
      </table></div>
      <div class="actions">
        <button type="button" class="secondary" onclick="addScaleRow()">Add row</button>
        <button type="button" onclick="saveScale()">Save scale</button>
        <button type="button" class="danger" onclick="resetScale()">Restore default scale</button>
      </div>
    </section>
  `;

  if (successText) showMessage(successText, "success");
  else clearMessage();
}
