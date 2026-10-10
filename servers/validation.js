/* ==========================================================================
   validation.js - checks what the user typed.
   Each function returns an error message, or "" when everything is fine.
   ========================================================================== */

function checkCourse(data, name, code, credits, semester, ignoreId) {
  if (name === "") return "Enter a course name.";
  if (code === "") return "Enter a course code.";
  if (!(credits > 0)) return "Credit hours must be a number greater than 0.";
  if (semester === "") return "Enter a semester name.";

  const duplicate = data.courses.some(c =>
    c.id !== ignoreId && c.code.toLowerCase() === code.toLowerCase());
  if (duplicate) return "You already have a course with the code " + code + ".";

  return "";
}

function checkCategory(course, name, weight, ignoreId) {
  if (name === "") return "Enter a category name.";
  if (!(weight >= 0)) return "Weight must be a number, 0 or more.";

  // Total of the OTHER categories in this course
  const others = course.categories
    .filter(c => c.id !== ignoreId)
    .reduce((sum, c) => sum + c.weight, 0);
  const newTotal = round2(others + weight);
  if (newTotal > 100) return "Weights would total " + newTotal + "%. The total cannot go over 100%.";

  return "";
}

// score is null when the assessment is still pending
function checkAssessment(name, score, max) {
  if (name === "") return "Enter an assessment name.";
  if (!(max > 0)) return "Maximum score must be a number greater than 0.";
  if (score !== null) {
    if (isNaN(score)) return "Score must be a number. Leave it empty if the assessment is not graded yet.";
    if (score < 0) return "Score cannot be negative.";
    if (score > max) return "Score cannot be higher than the maximum score (" + max + ").";
  }
  return "";
}

// An empty score box means "pending". Typing 0 is a real score of zero.
function readScore(text) {
  return text.trim() === "" ? null : Number(text);
}
