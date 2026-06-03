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
`);

// Add age/sex to profile if not present (idiomatic SQLite column migration).
for (const stmt of [
  'ALTER TABLE profile ADD COLUMN age INTEGER',
  'ALTER TABLE profile ADD COLUMN sex TEXT',
]) {
  try { db.exec(stmt); } catch (_) {}
}

// --- Seed data (only when empty) --------------------------------------------
// Profile: the user's starting facts.
if (!db.prepare('SELECT 1 FROM profile WHERE id = 1').get()) {
  db.prepare('INSERT INTO profile (id, height, current_weight, goal, age, sex) VALUES (1, ?, ?, ?, NULL, NULL)')
    .run(`6'1"`, 190, 'aggressive cut');
}

// Supplements: names only; dose/timing left blank for the user to fill in.
if (db.prepare('SELECT COUNT(*) AS n FROM supplements').get().n === 0) {
  const ins = db.prepare('INSERT INTO supplements (name, dose, timing, active, notes) VALUES (?, NULL, NULL, 1, NULL)');
  for (const name of ['Ashwagandha', 'Zinc', 'Magnesium', 'Vitamin D', 'Fish oil']) ins.run(name);
}

export default db;
