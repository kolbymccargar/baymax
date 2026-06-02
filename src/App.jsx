import { useEffect, useState } from 'react';
import Chat from './Chat.jsx';

export default function App() {
  const [today, setToday] = useState({ tasks: [], routines: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/today')
      .then((r) => r.json())
      .then(setToday)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="app">
      <header className="app-header">
        <h1>Baymax</h1>
        <p className="date">{dateLabel}</p>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>Today's Tasks</h2>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : today.tasks.length ? (
            <ul className="list">
              {today.tasks.map((t) => (
                <li key={t.id}>
                  <span>{t.title}</span>
                  {t.notes && <small className="muted">{t.notes}</small>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing due today.</p>
          )}
        </section>

        <section className="panel">
          <h2>Routines</h2>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : today.routines.length ? (
            <ul className="list">
              {today.routines.map((r) => (
                <li key={r.id}>
                  <span>{r.name}</span>
                  {r.schedule && <small className="muted">{r.schedule}</small>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No routines yet.</p>
          )}
        </section>

        <section className="panel chat-panel">
          <h2>Chat</h2>
          <Chat />
        </section>
      </main>
    </div>
  );
}
