/* ==========================================================================
   validation.js - checks what the user typed before we save it.
   Each function gives back an error message, or "" when everything is fine.
   ========================================================================== */

function checkCourse(data, name, code, credits, semester, ignoreId) {
  if (name === "") return "Enter a course name.";
  if (code === "") return "Enter a course code.";
  if (!(credits > 0)) return "Credit hours must be a number greater than 0.";
  if (semester === "") return "Enter a semester name.";

  // Two courses cannot share a code. "ignoreId" lets a course keep its own code when edited.
  for (let i = 0; i < data.courses.length; i++) {
    const other = data.courses[i];
    if (other.id !== ignoreId && other.code.toLowerCase() === code.toLowerCase()) {
      return "You already have a course with the code " + code + ".";
    }
  }
  return "";
}

function checkCategory(course, name, weight, ignoreId) {
  if (name === "") return "Enter a category name.";
  if (!(weight >= 0)) return "Weight must be a number, 0 or more.";

  // Add up the weights of the OTHER categories in this course
  let others = 0;
  for (let i = 0; i < course.categories.length; i++) {
    if (course.categories[i].id !== ignoreId) others += course.categories[i].weight;
  }

  const newTotal = round2(others + weight);
  if (newTotal > 100) return "Weights would total " + newTotal + "%. The total cannot go over 100%.";
  return "";
}

// "score" is null when the assessment is not graded yet (still pending)
function checkAssessment(name, score, max) {
  if (name === "") return "Enter an assessment name.";
  if (!(max > 0)) return "Maximum score must be a number greater than 0.";

  if (score !== null) {
    if (isNaN(score)) return "Score must be a number. Leave it empty if it is not graded yet.";
    if (score < 0) return "Score cannot be negative.";
    if (score > max) return "Score cannot be higher than the maximum score (" + max + ").";
  }
  return "";
}

// An empty score box means "pending". Typing 0 is a real score of zero.
function readScore(text) {
  if (text.trim() === "") return null;
  return Number(text);
}
