/* ==========================================================================
   calculations.js - the grade maths. Nothing in here touches the page.

   An assessment with score === null is PENDING. A score of 0 is a real score.
   `whatIf` is an optional object of pretend scores for pending assessments:
       { assessmentId: percent }
   Pretend scores are only used for a calculation. They are never saved.
   ========================================================================== */

function isGraded(assessment) {
  return assessment.score !== null;
}

function totalWeight(course) {
  return course.categories.reduce((sum, category) => sum + category.weight, 0);
}

// Average of one category, weighted by points possible:
//   average = total points earned / total points possible x 100
// Pending assessments are skipped. They are NOT counted as zero.
function categoryStats(category, whatIf) {
  whatIf = whatIf || {};
  let earned = 0;
  let possible = 0;
  let counted = 0;

  for (const a of category.assessments) {
    let score = null;
    if (isGraded(a)) {
      score = a.score;
    } else if (whatIf[a.id] !== undefined) {
      score = (whatIf[a.id] / 100) * a.maxScore;
    }
    if (score === null) continue;       // still pending, leave it out

    earned += score;
    possible += a.maxScore;
    counted += 1;
  }

  return {
    counted: counted,
    average: possible > 0 ? (earned / possible) * 100 : null    // null = no scores yet
  };
}

// Everything we know about one course's grade
function courseSummary(course, whatIf) {
  whatIf = whatIf || {};
  let scoredWeight = 0;     // weight of categories that have at least one score
  let scoredPoints = 0;     // sum of (category average x weight / 100)
  let scoredCount = 0;
  let categoryCount = 0;
  let pending = 0;          // pending assessments with no pretend score
  let assumed = 0;          // pending assessments that use a pretend score
  const missing = [];       // names of categories with no scores yet

  for (const category of course.categories) {
    for (const a of category.assessments) {
      if (isGraded(a)) continue;
      if (whatIf[a.id] !== undefined) assumed += 1;
      else pending += 1;
    }

    if (category.weight === 0) continue;     // a 0% category cannot change the grade
    categoryCount += 1;

    const stats = categoryStats(category, whatIf);
    if (stats.average === null) {
      missing.push(category.name);
    } else {
      scoredWeight += category.weight;
      scoredPoints += stats.average * category.weight / 100;
      scoredCount += 1;
    }
  }

  const total = round2(totalWeight(course));

  // Current performance: only the categories that have scores so far
  const current = scoredWeight > 0 ? (scoredPoints / scoredWeight) * 100 : null;

  // Projected grade: only when the weights total 100% and every category has a score
  let projected = null;
  let kind = "";       // "final" or "projected"
  let problem = "";    // why there is no projected grade

  if (total === 0) {
    problem = "Add assessment categories to see a grade.";
  } else if (total !== 100) {
    problem = "Category weights total " + total + "%, not 100%.";
  } else if (missing.length > 0) {
    problem = "No scores yet in: " + missing.join(", ") + ".";
  } else {
    projected = scoredPoints;
    kind = (pending > 0 || assumed > 0) ? "projected" : "final";
  }

  return {
    current: current, projected: projected, kind: kind, problem: problem,
    total: total, weightsOk: total === 100, remaining: round2(100 - total),
    scoredCount: scoredCount, categoryCount: categoryCount
  };
}

// Finds the letter and grade points for a percentage using the grading scale
function gradeFor(percent, scale) {
  if (percent === null) return null;
  const rounded = round2(percent);
  const rows = [...scale].sort((a, b) => b.min - a.min);     // highest boundary first
  for (const row of rows) {
    if (rounded >= row.min) return row;
  }
  return null;
}

// Semester GPA = sum(credits x grade points) / sum(credits)
// Only courses with a valid projected grade are included. The others are listed
// with the reason, so an incomplete course is never mistaken for a zero.
function semesterGpa(courses, scale, whatIf) {
  const included = [];
  const excluded = [];
  let credits = 0;
  let qualityPoints = 0;

  for (const course of courses) {
    const summary = courseSummary(course, whatIf);
    const grade = gradeFor(summary.projected, scale);

    if (grade === null) {
      excluded.push({ course: course, reason: summary.problem || "No grading scale row matches this grade." });
      continue;
    }

    included.push({ course: course, summary: summary, grade: grade });
    credits += course.credits;
    qualityPoints += course.credits * grade.points;
  }

  return {
    gpa: credits > 0 ? qualityPoints / credits : null,     // null = nothing to calculate
    credits: credits,
    qualityPoints: qualityPoints,
    included: included,
    excluded: excluded
  };
}

// Course grade if every pending assessment in the course scored exactly `percent`
function gradeWithPendingAt(course, percent) {
  const whatIf = {};
  for (const category of course.categories) {
    for (const a of category.assessments) {
      if (!isGraded(a)) whatIf[a.id] = percent;
    }
  }
  return courseSummary(course, whatIf).projected;
}

// Answers "what do I need to score to finish the course on `target` percent?"
function targetMessage(course, target) {
  // The course grade moves in a straight line as the pending scores go from 0% to 100%,
  // so two test calculations are enough to find the score that reaches the target.
  const low = gradeWithPendingAt(course, 0);
  const high = gradeWithPendingAt(course, 100);

  if (low === null || high === null) {
    return "Category weights must total 100%, and every category needs at least one assessment.";
  }
  if (high - low < 0.0001) {
    return "There are no pending assessments left that can change this grade.";
  }

  const needed = ((target - low) / (high - low)) * 100;

  if (needed <= 0) return "You already reach " + pct(target) + " even if you score 0% on everything pending.";
  if (needed > 100) return "Not reachable. Even 100% on every pending assessment gives " + pct(high) + ".";
  return "You need about " + pct(needed) + " on average across all pending assessments.";
}
