import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

export default function Chat({ onDataChanged }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  // Load persisted history so Baymax remembers across sessions.
  useEffect(() => {
    api.get('/api/history').then((rows) =>
      setMessages(rows.map((r) => ({ role: r.role, content: r.content })))
    );
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setBusy(true);
    setError('');

    try {
      const data = await api.post('/api/chat', { message: text });
      if (data.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
      if (data.dataChanged) onDataChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      <div className="messages">
        {messages.length === 0 && <p className="muted">Baymax is standing by. Give him something.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <span className="role">{m.role === 'user' ? 'You' : 'Baymax'}</span>
            <p>{m.content}</p>
          </div>
        ))}
        {busy && <p className="muted">Baymax is thinking…</p>}
        {error && <p className="error">{error}</p>}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={send}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" />
        <button type="submit" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  );
}
