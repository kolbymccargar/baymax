import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Profile() {
  const [p, setP] = useState(null);
  const [fact, setFact] = useState({ key: '', value: '' });

  useEffect(() => {
    api.get('/api/profile').then(setP);
  }, []);

  if (!p) return <p className="muted">Loading…</p>;

  const saveProfile = () =>
    api.put('/api/profile', { height: p.height, current_weight: p.current_weight, goal: p.goal }).then(setP);
  const setFactValue = (key, value) =>
    api.put(`/api/profile/facts/${encodeURIComponent(key)}`, { value }).then(setP);
  const delFact = (key) => api.del(`/api/profile/facts/${encodeURIComponent(key)}`).then(setP);
  const addFact = (e) => {
    e.preventDefault();
    if (!fact.key.trim()) return;
    setFactValue(fact.key.trim(), fact.value).then(() => setFact({ key: '', value: '' }));
  };

  return (
    <div className="panel">
      <h2>Profile</h2>

      <div className="fields">
        <label>
          Height
          <input value={p.height ?? ''} onChange={(e) => setP({ ...p, height: e.target.value })} onBlur={saveProfile} />
        </label>
        <label>
          Current weight
          <input
            value={p.current_weight ?? ''}
            onChange={(e) => setP({ ...p, current_weight: e.target.value })}
            onBlur={saveProfile}
          />
        </label>
        <label>
          Goal
          <input value={p.goal ?? ''} onChange={(e) => setP({ ...p, goal: e.target.value })} onBlur={saveProfile} />
        </label>
      </div>

      <h3>Facts</h3>
      <ul className="crud-list">
        {Object.entries(p.facts || {}).map(([k, v]) => (
          <li key={k}>
            <span className="fact-key">{k}</span>
            <input defaultValue={v ?? ''} onBlur={(e) => setFactValue(k, e.target.value)} style={{ flex: 2 }} />
            <button className="del" onClick={() => delFact(k)} title="Delete">
              ✕
            </button>
          </li>
        ))}
        {Object.keys(p.facts || {}).length === 0 && <li className="muted">No facts yet.</li>}
      </ul>

      <form className="row-form" onSubmit={addFact}>
        <input
          placeholder="key (e.g. wake_time)"
          value={fact.key}
          onChange={(e) => setFact({ ...fact, key: e.target.value })}
        />
        <input
          placeholder="value"
          value={fact.value}
          onChange={(e) => setFact({ ...fact, value: e.target.value })}
          style={{ flex: 2 }}
        />
        <button type="submit">Add fact</button>
      </form>
    </div>
  );
}
