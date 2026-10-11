/* ==========================================================================
   calculations.js - all the grade maths. Nothing here touches the page.

   Words used in this file:
     pending   an assessment with no score yet (score is null). It is NOT counted as zero.
     graded    an assessment with a score. A score of 0 is a real score.
     whatIf    pretend scores for pending assessments, like { 12: 85 } meaning
               "assessment 12 scored 85%". They are only used for a calculation, never saved.
   ========================================================================== */

function isGraded(assessment) {
  return assessment.score !== null;
}

// Add up the weights of all the categories in a course
function totalWeight(course) {
  let total = 0;
  for (let i = 0; i < course.categories.length; i++) {
    total += course.categories[i].weight;
  }
  return total;
}

// ----- Step 1: one category -----
// Average = points earned / points possible x 100, using only the graded assessments.
// Example: 40 out of 50 and 90 out of 100 gives 130 / 150 = 86.67%
function categoryStats(category, whatIf) {
  if (whatIf === undefined) whatIf = {};

  let earned = 0;
  let possible = 0;
  let counted = 0;

  for (let i = 0; i < category.assessments.length; i++) {
    const a = category.assessments[i];

    let score = null;
    if (isGraded(a)) {
      score = a.score;
    } else if (whatIf[a.id] !== undefined) {
      score = whatIf[a.id] / 100 * a.maxScore;      // a pretend score
    }

    if (score !== null) {
      earned += score;
      possible += a.maxScore;
      counted += 1;
    }
  }

  let average = null;                                // null means "no scores yet"
  if (possible > 0) average = earned / possible * 100;

  return { counted: counted, earned: earned, possible: possible, average: average };
}

// ----- Step 2: one course -----
// Each category adds (its average x its weight / 100) to the course grade.
//
// The grade is shown as soon as ANY category has a score. How sure we are depends on the status:
//   "sofar"     only part of the course is graded, so this is the grade so far
//   "projected" the whole course has scores, but some assessments are still pending
//   "final"     everything is graded
//   "none"      no scores at all yet, so there is no grade to show
function courseSummary(course, whatIf) {
  if (whatIf === undefined) whatIf = {};

  let gradedWeight = 0;          // total weight of the categories that have scores
  let gradedPoints = 0;          // what those categories add to the grade
  let gradedCategories = 0;
  let categoryCount = 0;
  let pending = 0;               // pending assessments with no pretend score
  let assumed = 0;               // pending assessments that have a pretend score
  const missing = [];            // names of categories with no scores yet

  for (let i = 0; i < course.categories.length; i++) {
    const category = course.categories[i];

    for (let j = 0; j < category.assessments.length; j++) {
      const a = category.assessments[j];
      if (!isGraded(a)) {
        if (whatIf[a.id] !== undefined) assumed += 1;
        else pending += 1;
      }
    }

    if (category.weight === 0) continue;             // a 0% category cannot change the grade
    categoryCount += 1;

    const stats = categoryStats(category, whatIf);
    if (stats.average === null) {
      missing.push(category.name);
    } else {
      gradedWeight += category.weight;
      gradedPoints += stats.average * category.weight / 100;
      gradedCategories += 1;
    }
  }

  const total = round2(totalWeight(course));

  // The course percentage so far = what the graded categories earned / the weight they cover.
  // If the whole course is graded (weight 100), this is simply the sum of the final scores.
  let percent = null;
  if (gradedWeight > 0) percent = gradedPoints / gradedWeight * 100;

  const complete = (total === 100 && missing.length === 0);

  let status = "none";
  if (percent !== null) {
    if (!complete) status = "sofar";
    else if (pending > 0 || assumed > 0) status = "projected";
    else status = "final";
  }

  // Words to show the student
  let label = "No grade yet";
  let word = "no scores";
  let note = "No scores recorded yet.";

  if (status === "sofar") {
    label = "Grade so far";
    word = "so far";
    note = "Based on the " + num(gradedWeight) + "% of the course that has been graded so far.";
    if (total !== 100) note += " The category weights add up to " + num(total) + "%, not 100%.";
    if (missing.length > 0) note += " Nothing graded yet in: " + missing.join(", ") + ".";
  } else if (status === "projected") {
    label = "Projected final grade";
    word = "projected";
    note = "Some work is still pending, so this assumes you keep scoring at your current average.";
  } else if (status === "final") {
    label = "Final grade";
    word = "final";
    note = "All the work in this course is graded.";
  }

  return {
    percent: percent,
    status: status,
    label: label,
    word: word,
    note: note,
    complete: complete,
    totalWeight: total,
    remaining: round2(100 - total),
    gradedWeight: gradedWeight,
    gradedCategories: gradedCategories,
    categoryCount: categoryCount,
    missing: missing
  };
}

// The course as a table, with the same columns as the tracker spreadsheet:
//   weight | total score possible | my score | percent | final score (weight x percent)
function courseBreakdown(course, whatIf) {
  const rows = [];
  let weightSum = 0;
  let finalScoreSum = 0;

  for (let i = 0; i < course.categories.length; i++) {
    const category = course.categories[i];
    const stats = categoryStats(category, whatIf);

    let finalScore = null;
    if (stats.average !== null) finalScore = stats.average * category.weight / 100;

    rows.push({
      name: category.name,
      weight: category.weight,
      possible: stats.possible,
      earned: stats.earned,
      percent: stats.average,
      finalScore: finalScore
    });

    weightSum += category.weight;
    if (finalScore !== null) finalScoreSum += finalScore;
  }

  return { rows: rows, weightSum: round2(weightSum), finalScoreSum: finalScoreSum };
}

// ----- Step 3: letter grade -----
// Finds the first row of the scale (highest first) that the percentage reaches.
function gradeFor(percent, scale) {
  if (percent === null) return null;

  const rounded = round2(percent);
  const rows = sortedScale(scale);
  for (let i = 0; i < rows.length; i++) {
    if (rounded >= rows[i].min) return rows[i];
  }
  return null;
}

// ----- Step 4: semester GPA -----
// GPA = (credits x grade points, added up for every course) / (all the credits added up)
// Every course that has at least one score is included, using its grade so far.
// A course with no scores is left out and listed with the reason. It is never counted as zero.
function semesterGpa(courses, scale, whatIf) {
  const included = [];
  const excluded = [];
  let credits = 0;
  let qualityPoints = 0;
  let soFarCount = 0;          // courses that are only graded in part
  let notFinalCount = 0;       // courses that are not completely graded

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const summary = courseSummary(course, whatIf);
    const grade = gradeFor(summary.percent, scale);

    if (grade === null) {
      let reason = "No scores recorded yet.";
      if (summary.percent !== null) reason = "No grading scale row matches this grade.";
      excluded.push({ course: course, reason: reason });
    } else {
      included.push({ course: course, summary: summary, grade: grade });
      credits += course.credits;
      qualityPoints += course.credits * grade.points;
      if (summary.status === "sofar") soFarCount += 1;
      if (summary.status !== "final") notFinalCount += 1;
    }
  }

  let gpa = null;                                      // null means nothing to calculate
  if (credits > 0) gpa = qualityPoints / credits;

  // The name shown next to the GPA
  let label = "GPA";
  if (included.length > 0) {
    if (soFarCount > 0) label = "GPA so far";
    else if (notFinalCount > 0) label = "Projected GPA";
    else label = "Final GPA";
  }

  return {
    gpa: gpa,
    label: label,
    credits: credits,
    qualityPoints: qualityPoints,
    included: included,
    excluded: excluded
  };
}

// ----- Extra: "What do I need to score?" -----

// The course summary if EVERY pending assessment scored exactly this percent
function gradeWithPendingAt(course, percent) {
  const whatIf = {};
  for (let i = 0; i < course.categories.length; i++) {
    const category = course.categories[i];
    for (let j = 0; j < category.assessments.length; j++) {
      const a = category.assessments[j];
      if (!isGraded(a)) whatIf[a.id] = percent;
    }
  }
  return courseSummary(course, whatIf);
}

// The course grade goes up in a straight line as the pending scores go from 0% to 100%.
// So we calculate it at 0% and at 100%, then work out where the target sits between the two.
function targetMessage(course, target) {
  const low = gradeWithPendingAt(course, 0);
  const high = gradeWithPendingAt(course, 100);

  if (!high.complete) {
    return "To use this, the category weights must total 100% and every category needs at least one assessment.";
  }
  if (high.percent - low.percent < 0.0001) {
    return "There are no pending assessments left that can change this grade.";
  }

  const needed = (target - low.percent) / (high.percent - low.percent) * 100;

  if (needed <= 0) return "You already reach " + pct(target) + " even if you score 0% on everything pending.";
  if (needed > 100) return "Not reachable. Even 100% on every pending assessment gives " + pct(high.percent) + ".";
  return "You need about " + pct(needed) + " on average across all pending assessments.";
}
