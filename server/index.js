import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from './db.js';
import { MODEL, PORT, HISTORY_LIMIT } from './config.js';
import { buildSystemPrompt } from './brain.js';
import { getProfile, todaySnapshot, brainContext, localToday } from './data.js';
import { TOOLS, executeTool } from './tools.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// --- Generic CRUD ------------------------------------------------------------
// Registers list / create / update / delete for a table. `columns` is a
// whitelist (column names come from here, never from the request), so building
// SQL with them is safe; all values stay parameterized.
function crud(base, table, columns) {
  app.get(base, (req, res) => {
    res.json(db.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
  });

  app.post(base, (req, res) => {
    const cols = columns.filter((c) => c in req.body);
    if (!cols.length) return res.status(400).json({ error: 'no recognized fields' });
    const info = db
      .prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`)
      .run(...cols.map((c) => req.body[c]));
    res.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid));
  });

  app.patch(`${base}/:id`, (req, res) => {
    const cols = columns.filter((c) => c in req.body);
    if (!cols.length) return res.status(400).json({ error: 'no recognized fields' });
    db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
      .run(...cols.map((c) => req.body[c]), req.params.id);
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id));
  });

  app.delete(`${base}/:id`, (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  });
}

crud('/api/tasks', 'tasks', ['title', 'due_date', 'status', 'notes']);
crud('/api/routines', 'routines', ['name', 'schedule', 'last_done']);
crud('/api/health_logs', 'health_logs', ['date', 'metric', 'value', 'notes']);
crud('/api/supplements', 'supplements', ['name', 'dose', 'timing', 'active', 'notes']);
crud('/api/weight_log', 'weight_log', ['date', 'weight']);

// --- Profile + facts ---------------------------------------------------------
app.get('/api/profile', (req, res) => res.json(getProfile()));

app.put('/api/profile', (req, res) => {
  const { height, current_weight, goal } = req.body;
  db.prepare('UPDATE profile SET height = ?, current_weight = ?, goal = ? WHERE id = 1')
    .run(height ?? null, current_weight ?? null, goal ?? null);
  res.json(getProfile());
});

app.put('/api/profile/facts/:key', (req, res) => {
  db.prepare(
    'INSERT INTO profile_facts (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(req.params.key, req.body.value ?? '');
  res.json(getProfile());
});

app.delete('/api/profile/facts/:key', (req, res) => {
  db.prepare('DELETE FROM profile_facts WHERE key = ?').run(req.params.key);
  res.json(getProfile());
});

// --- Supplements: mark taken today (toggle) ----------------------------------
app.post('/api/supplements/:id/toggle', (req, res) => {
  const today = localToday();
  const existing = db
    .prepare('SELECT id FROM supplement_log WHERE supplement_id = ? AND date = ?')
    .get(req.params.id, today);
  if (existing) {
    db.prepare('DELETE FROM supplement_log WHERE id = ?').run(existing.id);
    res.json({ taken: false });
  } else {
    db.prepare('INSERT INTO supplement_log (supplement_id, date) VALUES (?, ?)').run(req.params.id, today);
    res.json({ taken: true });
  }
});

// --- Today: aggregate everything the dashboard + chat brain need -------------
app.get('/api/today', (req, res) => res.json(todaySnapshot()));

// --- Chat memory -------------------------------------------------------------
// Full conversation history (oldest first) for the UI to render on load.
app.get('/api/history', (req, res) => {
  res.json(db.prepare('SELECT id, role, content, timestamp FROM chat_history ORDER BY id').all());
});

// One call to the Anthropic Messages API. Throws on HTTP error.
async function callAnthropic(apiKey, payload) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) {
    const err = new Error(data?.error?.message || 'Anthropic API error');
    err.status = r.status;
    throw err;
  }
  return data;
}

// --- Chat: Baymax's brain + tool use + persistent memory ---------------------
// The key stays server-side. Each call: load recent history, inject the live
// system prompt + tools, then run the tool-use loop — execute any tool_use
// blocks against the DB and feed tool_result back — until the model returns a
// final text reply. Persist the turn so Baymax remembers across sessions.
const MAX_TOOL_TURNS = 10;

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in .env' });
  }

  const message = (req.body?.message ?? '').trim();
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  // Recent history (chronological text) + this new turn.
  const recent = db
    .prepare('SELECT role, content FROM chat_history ORDER BY id DESC LIMIT ?')
    .all(HISTORY_LIMIT)
    .reverse();
  const messages = [...recent, { role: 'user', content: message }];

  const system = buildSystemPrompt(brainContext());
  let dataChanged = false;
  let reply = '';

  try {
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const data = await callAnthropic(apiKey, {
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: TOOLS,
        messages,
      });

      // Keep the assistant's full content (text + any tool_use blocks) in the convo.
      messages.push({ role: 'assistant', content: data.content });

      if (data.stop_reason === 'tool_use') {
        // Execute every tool_use block and return all results in one user turn.
        const toolResults = [];
        for (const block of data.content) {
          if (block.type !== 'tool_use') continue;
          const { content, mutated, is_error } = executeTool(block.name, block.input);
          if (mutated) dataChanged = true;
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content, is_error });
        }
        messages.push({ role: 'user', content: toolResults });
        continue; // ask the model to continue with the results
      }

      // Final answer.
      reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
      break;
    }

    if (!reply) reply = 'Handled. (No further comment.)';

    // Persist the user message + final assistant text (memory stays plain text).
    const now = new Date().toISOString();
    const insert = db.prepare('INSERT INTO chat_history (role, content, timestamp) VALUES (?, ?, ?)');
    db.transaction(() => {
      insert.run('user', message, now);
      insert.run('assistant', reply, now);
    })();

    res.json({ reply, dataChanged });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// --- Static frontend (production build) -------------------------------------
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Baymax server listening on http://localhost:${PORT}`);
});
