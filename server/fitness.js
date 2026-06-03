// Pure fitness math — no DB, no Anthropic. All numbers come from here; the
// model is told what they are and states them accurately rather than guessing.

// Parse "6'1\"" or "6'1" or bare inches (e.g. "73") → total inches.
export function parseHeightToInches(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+)['’](\d+)/);
  if (m) return parseInt(m[1]) * 12 + parseInt(m[2]);
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

// Mifflin-St Jeor BMR (kcal/day). Returns null if any input is missing.
// Men:   10·kg + 6.25·cm − 5·age + 5
// Women: 10·kg + 6.25·cm − 5·age − 161
export function mifflinBMR(weightLbs, heightInches, age, sex) {
  if (!weightLbs || !heightInches || !age || !sex) return null;
  const kg = weightLbs * 0.453592;
  const cm = heightInches * 2.54;
  const base = 10 * kg + 6.25 * cm - 5 * Number(age);
  return String(sex).toLowerCase().startsWith('f') ? base - 161 : base + 5;
}

// TDEE from BMR. Default 1.375 = lightly active (1-3 days/week).
export function computeTDEE(bmr, multiplier = 1.375) {
  return bmr ? Math.round(bmr * multiplier) : null;
}

// Calories burned per mile running.
// Rule of thumb: ~0.75 × bodyweight_lbs per mile (flat, moderate pace ~10 min/mile).
export function calsPerMileRunning(weightLbs) {
  return weightLbs ? Math.round(0.75 * weightLbs) : null;
}
