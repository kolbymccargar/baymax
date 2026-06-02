import { useState } from 'react';
import { api, useList } from '../api.js';

// Reusable add / inline-edit / delete list backed by a CRUD endpoint.
//   columns: [{ key, label, type?, default?, required?, flex? }]
//   defaults: extra fields sent on create (e.g. { status: 'open' })
//   extraActions(item, reload): optional render prop for per-row buttons
//   rowClass(item): optional className for a row
export default function CrudList({ url, columns, defaults = {}, extraActions, rowClass, addLabel = 'Add' }) {
  const blank = () => Object.fromEntries(columns.map((c) => [c.key, c.default ?? '']));
  const [items, reload, setItems] = useList(url);
  const [form, setForm] = useState(blank);

  async function add(e) {
    e.preventDefault();
    if (columns.some((c) => c.required && !String(form[c.key] ?? '').trim())) return;
    await api.post(url, { ...defaults, ...form });
    setForm(blank());
    reload();
  }

  // Edit locally on change, persist the row on blur.
  const update = (id, patch) => setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const persist = (item) =>
    api.patch(`${url}/${item.id}`, Object.fromEntries(columns.map((c) => [c.key, item[c.key]])));
  const remove = async (id) => {
    await api.del(`${url}/${id}`);
    reload();
  };

  return (
    <div>
      <form className="row-form" onSubmit={add}>
        {columns.map((c) => (
          <input
            key={c.key}
            type={c.type || 'text'}
            placeholder={c.label}
            value={form[c.key] ?? ''}
            onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
            style={{ flex: c.flex || 1 }}
          />
        ))}
        <button type="submit">{addLabel}</button>
      </form>

      <ul className="crud-list">
        {items.map((item) => (
          <li key={item.id} className={rowClass ? rowClass(item) : ''}>
            {columns.map((c) => (
              <input
                key={c.key}
                type={c.type || 'text'}
                value={item[c.key] ?? ''}
                onChange={(e) => update(item.id, { [c.key]: e.target.value })}
                onBlur={() => persist(item)}
                style={{ flex: c.flex || 1 }}
              />
            ))}
            {extraActions && extraActions(item, reload)}
            <button className="del" onClick={() => remove(item.id)} title="Delete">
              ✕
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="muted">Nothing yet.</li>}
      </ul>
    </div>
  );
}
