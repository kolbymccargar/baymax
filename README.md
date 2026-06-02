# Baymax

> _"Hello. I am Baymax, your personal healthcare companion."_

A local-first personal dashboard. Express backend + React frontend, with data
in a single local SQLite file and an AI chat that proxies to the Anthropic API
(your key stays server-side).

## Stack

- **Backend:** Express (Node), serves the API and the built frontend
- **Frontend:** React (Vite)
- **Data:** SQLite via `better-sqlite3` — single file `baymax.db` (gitignored)
- **Chat:** `/api/chat` proxies to the Anthropic Messages API; key read from `.env`

## Setup

```bash
npm install
cp .env.example .env   # then add your ANTHROPIC_API_KEY
```

## Run (development)

Starts the Express API (`:3001`) and the Vite dev server (`:5173`) together.
The Vite server proxies `/api` to Express.

```bash
npm run dev
```

Open **http://localhost:5173**.

## Run (production-style)

```bash
npm run build   # builds the React app into dist/
npm start       # Express serves dist/ + the API on :3001
```

Open **http://localhost:3001**.

## Structure

```
server/
  index.js     Express app, /api/today + /api/chat
  db.js        SQLite schema + connection (tasks, routines, health_logs)
  config.js    MODEL constant + PORT
src/
  App.jsx      "Today" view (tasks + routines)
  Chat.jsx     chat box wired to /api/chat
  main.jsx     React entry
  styles.css
index.html     Vite entry
```

## Database

Three tables, created on first run (`server/db.js`):

- `tasks` — id, title, due_date, status, notes
- `routines` — id, name, schedule, last_done
- `health_logs` — id, date, metric, value, notes

A couple of sample rows are seeded on first run so the Today view isn't empty;
delete that block in `server/db.js` whenever you like.

## Config

The chat model is a constant in `server/config.js`:

```js
export const MODEL = 'claude-sonnet-4-6';
```
