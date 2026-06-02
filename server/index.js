import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from './db.js';
import { MODEL, PORT } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Local date as YYYY-MM-DD (local time, not UTC).
const localToday = () => new Date().toLocaleDateString('en-CA');

// --- API --------------------------------------------------------------------

// Today view data: tasks due today + all routines.
// (Routine scheduling is free-form for now; refine filtering as it grows.)
app.get('/api/today', (req, res) => {
  const today = localToday();
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE due_date = ? AND status != 'done' ORDER BY id")
    .all(today);
  const routines = db.prepare('SELECT * FROM routines ORDER BY id').all();
  res.json({ date: today, tasks, routines });
});

// Chat proxy to the Anthropic Messages API. The API key stays server-side.
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in .env' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error?.message || 'Anthropic API error' });
    }

    const reply = (data.content || []).map((b) => b.text).filter(Boolean).join('');
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Static frontend (production build) -------------------------------------
// In dev, the Vite server on :5173 serves the UI and proxies /api here.
// After `npm run build`, this serves the built client.
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Baymax server listening on http://localhost:${PORT}`);
});
