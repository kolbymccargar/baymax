// =============================================================================
//  TOOLS — the actions Baymax can take, exposed to the model via tool use.
//  Each handler has an Anthropic tool `schema`, a `mutates` flag (whether it
//  changes data, used to tell the UI to refresh), and a `run(input)` function.
// =============================================================================
import db from './db.js';
import { getProfile, todaySnapshot, localToday, getWorkoutSchedule, todayWorkout } from './data.js';

const get = (table, id) => db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);

const str = (desc) => ({ type: 'string', description: desc });
const num = (desc) => ({ type: 'number', description: desc });

const handlers = {
  // --- Tasks ---------------------------------------------------------------
  add_task: {
    mutates: true,
    schema: {
      name: 'add_task',
      description: 'Create a new task. Resolve relative dates (today, tomorrow) to YYYY-MM-DD using the current date in context.',
      input_schema: {
        type: 'object',
        properties: {
          title: str('Task title'),
          due_date: str('Due date as YYYY-MM-DD (optional)'),
          notes: str('Optional notes'),
        },
        required: ['title'],
      },
    },
    run: ({ title, due_date = null, notes = null }) => {
      const info = db
        .prepare("INSERT INTO tasks (title, due_date, status, notes) VALUES (?, ?, 'open', ?)")
        .run(title, due_date, notes);
      return get('tasks', info.lastInsertRowid);
    },
  },

  update_task: {
    mutates: true,
    schema: {
      name: 'update_task',
      description: 'Update fields on an existing task. Only provided fields change.',
      input_schema: {
        type: 'object',
        properties: {
          id: num('Task id'),
          title: str('New title'),
          due_date: str('New due date YYYY-MM-DD'),
          status: { type: 'string', enum: ['open', 'done'] },
          notes: str('New notes'),
        },
        required: ['id'],
      },
    },
    run: ({ id, ...fields }) => updateRow('tasks', id, fields, ['title', 'due_date', 'status', 'notes']),
  },

  complete_task: {
    mutates: true,
    schema: {
      name: 'complete_task',
      description: 'Mark a task as done.',
      input_schema: { type: 'object', properties: { id: num('Task id') }, required: ['id'] },
    },
    run: ({ id }) => {
      db.prepare("UPDATE tasks SET status = 'done' WHERE id = ?").run(id);
      return get('tasks', id) || { error: `no task ${id}` };
    },
  },

  delete_task: {
    mutates: true,
    schema: {
      name: 'delete_task',
      description: 'Delete a task permanently.',
      input_schema: { type: 'object', properties: { id: num('Task id') }, required: ['id'] },
    },
    run: ({ id }) => {
      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
      return { ok: true, deleted: id };
    },
  },

  // --- Routines ------------------------------------------------------------
  add_routine: {
    mutates: true,
    schema: {
      name: 'add_routine',
      description: 'Create a new routine.',
      input_schema: {
        type: 'object',
        properties: {
          name: str('Routine name'),
          schedule: str('Schedule, e.g. "daily" or "Mon,Wed,Fri"'),
          time_block: { type: 'string', enum: ['morning', 'day', 'night'], description: 'Time-of-day group' },
        },
        required: ['name'],
      },
    },
    run: ({ name, schedule = null, time_block = null }) => {
      const info = db
        .prepare('INSERT INTO routines (name, schedule, time_block) VALUES (?, ?, ?)')
        .run(name, schedule, time_block);
      return get('routines', info.lastInsertRowid);
    },
  },

  update_routine: {
    mutates: true,
    schema: {
      name: 'update_routine',
      description: 'Update fields on an existing routine. Only provided fields change.',
      input_schema: {
        type: 'object',
        properties: {
          id: num('Routine id'),
          name: str('New name'),
          schedule: str('New schedule'),
          last_done: str('Last done date YYYY-MM-DD'),
          time_block: { type: 'string', enum: ['morning', 'day', 'night'], description: 'Time-of-day group' },
        },
        required: ['id'],
      },
    },
    run: ({ id, ...fields }) => updateRow('routines', id, fields, ['name', 'schedule', 'last_done', 'time_block']),
  },

  complete_routine: {
    mutates: true,
    schema: {
      name: 'complete_routine',
      description: "Mark a routine as done today (sets last_done to today's date).",
      input_schema: { type: 'object', properties: { id: num('Routine id') }, required: ['id'] },
    },
    run: ({ id }) => {
      db.prepare('UPDATE routines SET last_done = ? WHERE id = ?').run(localToday(), id);
      return get('routines', id) || { error: `no routine ${id}` };
    },
  },

  delete_routine: {
    mutates: true,
    schema: {
      name: 'delete_routine',
      description: 'Delete a routine permanently.',
      input_schema: { type: 'object', properties: { id: num('Routine id') }, required: ['id'] },
    },
    run: ({ id }) => {
      db.prepare('DELETE FROM routines WHERE id = ?').run(id);
      return { ok: true, deleted: id };
    },
  },

  // --- Health & weight -----------------------------------------------------
  log_health: {
    mutates: true,
    schema: {
      name: 'log_health',
      description: 'Add a health log entry. Date defaults to today if omitted.',
      input_schema: {
        type: 'object',
        properties: {
          metric: str('Metric name, e.g. sleep_hours, resting_hr'),
          value: str('Measured value'),
          notes: str('Optional notes'),
          date: str('Date YYYY-MM-DD (optional, defaults to today)'),
        },
        required: ['metric'],
      },
    },
    run: ({ metric, value = null, notes = null, date }) => {
      const info = db
        .prepare('INSERT INTO health_logs (date, metric, value, notes) VALUES (?, ?, ?, ?)')
        .run(date || localToday(), metric, value, notes);
      return get('health_logs', info.lastInsertRowid);
    },
  },

  log_weight: {
    mutates: true,
    schema: {
      name: 'log_weight',
      description: 'Log a body weight entry. Date defaults to today if omitted.',
      input_schema: {
        type: 'object',
        properties: { weight: num('Body weight'), date: str('Date YYYY-MM-DD (optional)') },
        required: ['weight'],
      },
    },
    run: ({ weight, date }) => {
      const info = db.prepare('INSERT INTO weight_log (date, weight) VALUES (?, ?)').run(date || localToday(), weight);
      return get('weight_log', info.lastInsertRowid);
    },
  },

  // --- Supplements ---------------------------------------------------------
  add_supplement: {
    mutates: true,
    schema: {
      name: 'add_supplement',
      description: 'Add a supplement to the stack (active by default).',
      input_schema: {
        type: 'object',
        properties: {
          name: str('Supplement name'),
          dose: str('Dose, e.g. "5g"'),
          timing: str('Timing, e.g. "morning", "with food"'),
          notes: str('Optional notes'),
        },
        required: ['name'],
      },
    },
    run: ({ name, dose = null, timing = null, notes = null }) => {
      const info = db
        .prepare('INSERT INTO supplements (name, dose, timing, active, notes) VALUES (?, ?, ?, 1, ?)')
        .run(name, dose, timing, notes);
      return get('supplements', info.lastInsertRowid);
    },
  },

  update_supplement: {
    mutates: true,
    schema: {
      name: 'update_supplement',
      description: 'Update a supplement. Use active 1/0 to activate/deactivate. Only provided fields change.',
      input_schema: {
        type: 'object',
        properties: {
          id: num('Supplement id'),
          name: str('New name'),
          dose: str('New dose'),
          timing: str('New timing'),
          active: { type: 'number', enum: [0, 1], description: '1 = active, 0 = inactive' },
          notes: str('New notes'),
        },
        required: ['id'],
      },
    },
    run: ({ id, ...fields }) =>
      updateRow('supplements', id, fields, ['name', 'dose', 'timing', 'active', 'notes']),
  },

  mark_supplement_taken: {
    mutates: true,
    schema: {
      name: 'mark_supplement_taken',
      description:
        'Mark a supplement taken (or not) for today. Identify it by id or name. Set taken=false to undo.',
      input_schema: {
        type: 'object',
        properties: {
          id: num('Supplement id (preferred)'),
          name: str('Supplement name (used if id not given)'),
          taken: { type: 'boolean', description: 'true = taken today (default), false = undo' },
        },
      },
    },
    run: ({ id, name, taken = true }) => {
      const supp = id
        ? get('supplements', id)
        : name
          ? db.prepare('SELECT * FROM supplements WHERE name = ? COLLATE NOCASE').get(name)
          : null;
      if (!supp) return { error: `supplement not found (id=${id ?? ''} name=${name ?? ''})` };
      const today = localToday();
      if (taken) {
        db.prepare('INSERT OR IGNORE INTO supplement_log (supplement_id, date) VALUES (?, ?)').run(supp.id, today);
      } else {
        db.prepare('DELETE FROM supplement_log WHERE supplement_id = ? AND date = ?').run(supp.id, today);
      }
      return { id: supp.id, name: supp.name, taken: !!taken, date: today };
    },
  },

  // --- Profile -------------------------------------------------------------
  update_profile: {
    mutates: true,
    schema: {
      name: 'update_profile',
      description:
        'Set or change profile fields (height, current_weight, goal) and/or arbitrary key/value facts (e.g. age, wake_time). Provide only what changes.',
      input_schema: {
        type: 'object',
        properties: {
          height: str('Height, e.g. 6\'1"'),
          current_weight: num('Current weight'),
          goal: str('Goal description'),
          facts: {
            type: 'object',
            description: 'Key/value facts to set, e.g. { "age": "34", "wake_time": "6:00am" }',
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
    run: ({ height, current_weight, goal, facts }) => {
      const cols = { height, current_weight, goal };
      const present = Object.keys(cols).filter((k) => cols[k] !== undefined);
      if (present.length) {
        db.prepare(`UPDATE profile SET ${present.map((k) => `${k} = ?`).join(', ')} WHERE id = 1`)
          .run(...present.map((k) => cols[k]));
      }
      if (facts && typeof facts === 'object') {
        const up = db.prepare(
          'INSERT INTO profile_facts (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        );
        for (const [k, v] of Object.entries(facts)) up.run(k, String(v));
      }
      return getProfile();
    },
  },

  // --- Workout schedule ----------------------------------------------------
  get_workout_schedule: {
    mutates: false,
    schema: {
      name: 'get_workout_schedule',
      description: 'Returns the full 7-day workout split (one row per day_of_week, 0=Sunday … 6=Saturday).',
      input_schema: { type: 'object', properties: {} },
    },
    run: () => getWorkoutSchedule(),
  },

  update_workout_day: {
    mutates: true,
    schema: {
      name: 'update_workout_day',
      description: 'Update the workout focus, run flag, or notes for a specific day of the week.',
      input_schema: {
        type: 'object',
        properties: {
          day_of_week: { type: 'number', description: '0=Sunday, 1=Monday, …, 6=Saturday' },
          focus: str('Workout focus description'),
          run: { type: 'number', enum: [0, 1], description: '1 = run day, 0 = no run' },
          notes: str('Optional notes (e.g. "keep it light")'),
        },
        required: ['day_of_week'],
      },
    },
    run: ({ day_of_week, focus, run, notes }) => {
      const fields = { focus, run, notes };
      const cols = ['focus', 'run', 'notes'].filter((c) => fields[c] !== undefined);
      if (cols.length) {
        db.prepare(
          `UPDATE workout_schedule SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE day_of_week = ?`
        ).run(...cols.map((c) => fields[c]), day_of_week);
      }
      return db.prepare('SELECT * FROM workout_schedule WHERE day_of_week = ?').get(day_of_week)
        || { error: `no schedule for day_of_week ${day_of_week}` };
    },
  },

  // --- Read ----------------------------------------------------------------
  get_data: {
    mutates: false,
    schema: {
      name: 'get_data',
      description:
        'Pull fresh data on demand to get current ids and state before acting. Returns tasks, routines, supplements (with taken-today), profile, and recent weight.',
      input_schema: { type: 'object', properties: {} },
    },
    run: () => {
      const snap = todaySnapshot();
      return {
        date: snap.date,
        profile: snap.profile,
        tasks: db.prepare('SELECT * FROM tasks ORDER BY id').all(),
        routines: db.prepare('SELECT * FROM routines ORDER BY id').all(),
        supplements: snap.supplements,
        latestWeight: snap.latestWeight,
        recentWeight: db.prepare('SELECT * FROM weight_log ORDER BY date DESC, id DESC LIMIT 10').all(),
        workoutSchedule: getWorkoutSchedule(),
        todayWorkout: todayWorkout(),
      };
    },
  },
};

// Shared helper: update only the whitelisted fields that were provided.
function updateRow(table, id, fields, allowed) {
  const cols = allowed.filter((c) => fields[c] !== undefined);
  if (cols.length) {
    db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
      .run(...cols.map((c) => fields[c]), id);
  }
  return get(table, id) || { error: `no ${table} row ${id}` };
}

// Tool definitions sent to the model.
export const TOOLS = Object.values(handlers).map((h) => h.schema);

// Execute a tool by name. Returns { content, mutated, is_error } for tool_result.
export function executeTool(name, input) {
  const h = handlers[name];
  if (!h) return { content: JSON.stringify({ error: `unknown tool ${name}` }), mutated: false, is_error: true };
  try {
    const result = h.run(input || {});
    const is_error = !!(result && result.error);
    return { content: JSON.stringify(result), mutated: h.mutates && !is_error, is_error };
  } catch (err) {
    return { content: JSON.stringify({ error: err.message }), mutated: false, is_error: true };
  }
}
