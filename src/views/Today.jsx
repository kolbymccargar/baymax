import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Chat from '../Chat.jsx';

export default function Today() {
  const [data, setData] = useState(null);
  const reload = () => api.get('/api/today').then(setData);

  useEffect(() => {
    reload();
  }, []);

  if (!data) return <p className="muted">Loading…</p>;

  const toggleSupp = async (id) => {
    await api.post(`/api/supplements/${id}/toggle`);
    reload();
  };

  const weightLabel = data.latestWeight
    ? `${data.latestWeight.weight} (${data.latestWeight.date})`
    : data.profile.current_weight ?? '—';

  return (
    <div className="grid">
      <section className="panel">
        <h2>Today's Tasks</h2>
        {data.tasks.length ? (
          <ul className="list">
            {data.tasks.map((t) => (
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
        {data.routines.length ? (
          <ul className="list">
            {data.routines.map((r) => (
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

      <section className="panel">
        <h2>Supplements</h2>
        {data.supplements.length ? (
          <ul className="list">
            {data.supplements.map((s) => (
              <li key={s.id}>
                <label className="check">
                  <input type="checkbox" checked={!!s.taken} onChange={() => toggleSupp(s.id)} />
                  <span>{s.name}</span>
                  {s.timing && <small className="muted">{s.timing}</small>}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No active supplements.</p>
        )}
      </section>

      <section className="panel">
        <h2>Profile</h2>
        <p>
          Goal: <strong>{data.profile.goal || '—'}</strong>
        </p>
        <p className="muted">
          Height {data.profile.height || '—'} · Weight {weightLabel}
        </p>
      </section>

      <section className="panel chat-panel">
        <h2>Chat</h2>
        <Chat onDataChanged={reload} />
      </section>
    </div>
  );
}
