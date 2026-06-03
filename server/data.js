// Shared data-access helpers, used by both the HTTP routes and the chat tools.
import db from './db.js';

// Local date as YYYY-MM-DD (local time, not UTC).
export const localToday = () => new Date().toLocaleDateString('en-CA');

export function getProfile() {
  const row = db.prepare('SELECT height, current_weight, goal, age, sex FROM profile WHERE id = 1').get() || {};
  const facts = {};
  for (const f of db.prepare('SELECT key, value FROM profile_facts').all()) facts[f.key] = f.value;
  return { ...row, facts };
}

export function todaySnapshot() {
  const today = localToday();
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE due_date = ? AND status != 'done' ORDER BY id")
    .all(today);
  const routines = db.prepare('SELECT * FROM routines ORDER BY id').all();
  const supplements = db
    .prepare(
      `SELECT s.*,
         EXISTS (SELECT 1 FROM supplement_log l WHERE l.supplement_id = s.id AND l.date = ?) AS taken
       FROM supplements s WHERE s.active = 1 ORDER BY s.id`
    )
    .all(today);
  const latestWeight =
    db.prepare('SELECT date, weight FROM weight_log ORDER BY date DESC, id DESC LIMIT 1').get() || null;
  return { date: today, tasks, routines, supplements, latestWeight, profile: getProfile() };
}

export function getWorkoutSchedule() {
  return db.prepare('SELECT * FROM workout_schedule ORDER BY day_of_week').all();
}

export function todayWorkout() {
  return db.prepare('SELECT * FROM workout_schedule WHERE day_of_week = ?').get(new Date().getDay()) || null;
}

// Today's snapshot plus overdue tasks and workout — the context Baymax's brain reads.
export function brainContext() {
  const snap = todaySnapshot();
  const overdue = db
    .prepare("SELECT * FROM tasks WHERE due_date IS NOT NULL AND due_date < ? AND status != 'done' ORDER BY due_date")
    .all(snap.date);
  const workout = todayWorkout();
  return { ...snap, overdue, workout };
}
