import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Single local SQLite file at the project root.
const db = new Database(path.join(__dirname, '..', 'baymax.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT NOT NULL,
    due_date  TEXT,                          -- YYYY-MM-DD
    status    TEXT NOT NULL DEFAULT 'open',  -- open | done
    notes     TEXT
  );

  CREATE TABLE IF NOT EXISTS routines (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    schedule   TEXT,   -- free-form for now, e.g. "daily", "Mon,Wed,Fri"
    last_done  TEXT    -- YYYY-MM-DD
  );

  CREATE TABLE IF NOT EXISTS health_logs (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    date    TEXT NOT NULL,   -- YYYY-MM-DD
    metric  TEXT NOT NULL,   -- e.g. "weight", "sleep_hours"
    value   TEXT,
    notes   TEXT
  );

  -- Single-user profile (always row id = 1).
  CREATE TABLE IF NOT EXISTS profile (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    height          TEXT,
    current_weight  REAL,
    goal            TEXT
  );

  -- Flexible key/value facts about the user (cut_aggressiveness, wake_time, ...).
  CREATE TABLE IF NOT EXISTS profile_facts (
    key    TEXT PRIMARY KEY,
    value  TEXT
  );

  CREATE TABLE IF NOT EXISTS supplements (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL,
    dose    TEXT,
    timing  TEXT,   -- e.g. "morning", "with food"
    active  INTEGER NOT NULL DEFAULT 1,  -- 1 = yes, 0 = no
    notes   TEXT
  );

  -- One row per supplement actually taken on a given day.
  CREATE TABLE IF NOT EXISTS supplement_log (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    supplement_id  INTEGER NOT NULL,
    date           TEXT NOT NULL,   -- YYYY-MM-DD
    UNIQUE (supplement_id, date)
  );

  CREATE TABLE IF NOT EXISTS weight_log (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    date    TEXT NOT NULL,   -- YYYY-MM-DD
    weight  REAL NOT NULL
  );

  -- Conversation memory. Foundation for a deeper memory layer later.
  CREATE TABLE IF NOT EXISTS chat_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    role       TEXT NOT NULL,   -- user | assistant
    content    TEXT NOT NULL,
    timestamp  TEXT NOT NULL    -- ISO 8601
  );

  -- Weekly workout split. One row per day (0=Sunday … 6=Saturday).
  CREATE TABLE IF NOT EXISTS workout_schedule (
    day_of_week  INTEGER PRIMARY KEY,
    focus        TEXT NOT NULL,
    run          INTEGER NOT NULL DEFAULT 1,  -- 1 = run day, 0 = no run
    notes        TEXT
  );
`);

// Idiomatic SQLite column migrations — try/catch because ADD COLUMN IF NOT EXISTS
// is not supported.
for (const stmt of [
  'ALTER TABLE profile ADD COLUMN age INTEGER',
  'ALTER TABLE profile ADD COLUMN sex TEXT',
  'ALTER TABLE routines ADD COLUMN time_block TEXT',
]) {
  try { db.exec(stmt); } catch (_) {}
}

// --- Seed data (only when empty) --------------------------------------------
if (!db.prepare('SELECT 1 FROM profile WHERE id = 1').get()) {
  db.prepare('INSERT INTO profile (id, height, current_weight, goal, age, sex) VALUES (1, ?, ?, ?, NULL, NULL)')
    .run(`6'1"`, 190, 'aggressive cut');
}

// --- v2 migration: real supplement stack + real daily routines --------------
// Keyed off profile_facts so it runs exactly once, even across restarts.
if (!db.prepare("SELECT 1 FROM profile_facts WHERE key = 'seed_v2'").get()) {
  db.transaction(() => {
    // Replace supplements — wipe log first to avoid orphaned rows.
    db.prepare('DELETE FROM supplement_log').run();
    db.prepare('DELETE FROM supplements').run();
    const insSup = db.prepare(
      'INSERT INTO supplements (name, dose, timing, active, notes) VALUES (?, NULL, ?, 1, NULL)'
    );
    for (const [name, timing] of [
      ['Fish Oil',              'with breakfast'],
      ['Zinc',                  'with breakfast'],
      ['Ashwagandha',           'with breakfast'],
      ['Vitamin D3',            'with breakfast'],
      ['Creatine Monohydrate',  'pre-workout'],
      ['Magnesium',             'night, before bed'],
    ]) insSup.run(name, timing);

    // Replace routines with real daily protocol, tagged by time block.
    db.prepare('DELETE FROM routines').run();
    const insRou = db.prepare(
      'INSERT INTO routines (name, schedule, time_block) VALUES (?, ?, ?)'
    );
    for (const [name, block] of [
      ['Wake 5:30am',                                              'morning'],
      ['Mobility set — 5 min (jumping, arm swings, torso twists)', 'morning'],
      ['Oil pull — coconut oil, swish then rinse',                 'morning'],
      ['Run — 2 miles minimum',                                    'morning'],
      ['Cold-to-warm shower',                                      'morning'],
      ['Beef tallow moisturizer',                                  'morning'],
      ['Breakfast — 5 eggs, Greek yogurt, cottage cheese, banana', 'morning'],
      ['Morning supplements',                                      'morning'],
      ['10k steps before gym',                                     'day'],
      ['One small snack only — fruit or pepitas, no grazing',      'day'],
      ['Pre-workout carb (fuel, not a snack)',                      'day'],
      ['Final phone check — no doomscroll',                        'night'],
      ['Set alarms 5:30 and 5:45',                                 'night'],
      ['Plug in phone, stop touching it',                          'night'],
      ['Magnesium with water',                                     'night'],
      ["Lay out tomorrow's clothes",                               'night'],
      ['Warm shower',                                              'night'],
      ['Skincare',                                                 'night'],
      ['Sleep 10–11pm',                                            'night'],
    ]) insRou.run(name, 'daily', block);

    db.prepare(
      "INSERT INTO profile_facts (key, value) VALUES ('seed_v2', '1')" +
      " ON CONFLICT(key) DO UPDATE SET value = '1'"
    ).run();
  })();
}

// --- v3 migration: workout schedule + coaching principles -------------------
if (!db.prepare("SELECT 1 FROM profile_facts WHERE key = 'seed_v3'").get()) {
  db.transaction(() => {
    const insDay = db.prepare(
      'INSERT OR REPLACE INTO workout_schedule (day_of_week, focus, run, notes) VALUES (?, ?, ?, ?)'
    );
    for (const [dow, focus, run, notes] of [
      [0, "Rest / fun activity (skate, hike, pickleball)",          0, null],
      [1, "Back & biceps",                                          1, null],
      [2, "Kettlebell & abs",                                       1, null],
      [3, "Chest & triceps",                                        1, null],
      [4, "Kettlebell & abs",                                       1, null],
      [5, "Light — bodyweight, abs, pushups/pullups at home",       1, "keep it light"],
      [6, "Hard session — your choice, hit it hard",                0, null],
    ]) insDay.run(dow, focus, run, notes);

    // Coaching principles — INSERT OR IGNORE preserves any edits the user made.
    const insFact = db.prepare(
      'INSERT OR IGNORE INTO profile_facts (key, value) VALUES (?, ?)'
    );
    for (const [key, value] of [
      ['diet_no_rest_days', 'Diet stays clean every day. Rest days are moderate calorie, never a write-off.'],
      ['alcohol',           'Once a week max. Prep by eating clean and hydrating with electrolytes beforehand.'],
      ['missed_training',   "A half-assed workout beats none. Make up missed sessions; don't write off the day."],
      ['mindset',           'Train to enjoy it. Disappointment should follow skipping, not working out.'],
    ]) insFact.run(key, value);

    db.prepare(
      "INSERT INTO profile_facts (key, value) VALUES ('seed_v3', '1')" +
      " ON CONFLICT(key) DO UPDATE SET value = '1'"
    ).run();
  })();
}

export default db;
