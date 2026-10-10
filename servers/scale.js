/* ==========================================================================
   scale.js - the grading scale page.
   Rows are added and removed on the page itself. Nothing is saved until
   "Save scale" is pressed, and then every row is checked.
   ========================================================================== */

const currentUser = requireLogin();
let data = null;

if (currentUser) start();

function start() {
  renderLayout("scale");
  data = loadUserData(currentUser);
  render();
  showFlash();
}

function save() {
  saveUserData(currentUser, data);
}

// One row of the scale table
function scaleRowHtml(row) {
  return `<tr>
    <td><input type="number" class="scale-min" step="any" min="0" max="100" value="${row.min}" aria-label="Minimum percentage"></td>
    <td><input type="text" class="scale-letter" value="${esc(row.letter)}" aria-label="Letter grade"></td>
    <td><input type="number" class="scale-points" step="any" min="0" value="${row.points}" aria-label="Grade points"></td>
    <td><button type="button" class="danger small" onclick="this.closest('tr').remove()">Remove</button></td>
  </tr>`;
}

function addScaleRow() {
  document.getElementById("scale-rows").insertAdjacentHTML("beforeend", scaleRowHtml({ min: "", letter: "", points: "" }));
}

function saveScale() {
  const rows = [];
  for (const tr of document.querySelectorAll("#scale-rows tr")) {
    rows.push({
      min: parseNumber(tr.querySelector(".scale-min").value),
      letter: tr.querySelector(".scale-letter").value.trim(),
      points: parseNumber(tr.querySelector(".scale-points").value)
    });
  }

  if (rows.length === 0) { showMessage("Add at least one row.", "error"); return; }

  const seen = [];
  for (const row of rows) {
    if (!(row.min >= 0 && row.min <= 100)) { showMessage("Every minimum percentage must be between 0 and 100.", "error"); return; }
    if (row.letter === "") { showMessage("Every row needs a letter grade.", "error"); return; }
    if (!(row.points >= 0)) { showMessage("Grade points must be a number, 0 or more.", "error"); return; }
    if (seen.includes(row.min)) { showMessage("Two rows have the same minimum percentage (" + row.min + ").", "error"); return; }
    seen.push(row.min);
  }
  if (!seen.includes(0)) { showMessage("One row must start at 0%, so every grade has a letter.", "error"); return; }

  data.scale = rows.sort((a, b) => b.min - a.min);
  save();
  render("Grading scale saved.");
}

function resetScale() {
  if (!confirm("Replace your grading scale with the example scale?")) return;
  data.scale = EXAMPLE_SCALE.map(row => ({ ...row }));
  save();
  render("Example grading scale restored.");
}

function render(successText) {
  const rows = [...data.scale].sort((a, b) => b.min - a.min).map(scaleRowHtml).join("");

  document.getElementById("app").innerHTML = `
    <div class="page-title"><h2>Grading scale</h2></div>
    <section class="card">
      <p>A grade at or above the minimum percentage gets that letter and those grade points.</p>
      <p class="muted">The scale starts as an example only. Change it to match your university's policy.
        Course grades and GPA use this scale.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Minimum %</th><th>Letter</th><th>Grade points</th><th></th></tr></thead>
        <tbody id="scale-rows">${rows}</tbody>
      </table></div>
      <div class="actions">
        <button type="button" class="secondary" onclick="addScaleRow()">Add row</button>
        <button type="button" onclick="saveScale()">Save scale</button>
        <button type="button" class="danger" onclick="resetScale()">Restore example scale</button>
      </div>
    </section>
  `;

  if (successText) showMessage(successText, "success");
  else clearMessage();
}
