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
    due_date  TEXT,                       -- YYYY-MM-DD
    status    TEXT NOT NULL DEFAULT 'open', -- open | done
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
`);

// --- Sample data (first run only) -------------------------------------------
// Gives the Today view something to show during your first local test.
// Safe to delete this block once you start adding your own data.
const taskCount = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
if (taskCount === 0) {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  db.prepare('INSERT INTO tasks (title, due_date, status, notes) VALUES (?, ?, ?, ?)')
    .run('Try out Baymax', today, 'open', 'Sample task — delete me anytime');
  db.prepare('INSERT INTO routines (name, schedule, last_done) VALUES (?, ?, ?)')
    .run('Drink water', 'daily', null);
}

export default db;
