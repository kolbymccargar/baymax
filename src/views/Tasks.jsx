import CrudList from '../components/CrudList.jsx';
import { api } from '../api.js';

export default function Tasks() {
  return (
    <div className="panel">
      <h2>Tasks</h2>
      <CrudList
        url="/api/tasks"
        defaults={{ status: 'open' }}
        columns={[
          { key: 'title', label: 'Title', required: true, flex: 2 },
          { key: 'due_date', label: 'Due', type: 'date' },
          { key: 'notes', label: 'Notes', flex: 2 },
        ]}
        rowClass={(t) => (t.status === 'done' ? 'done' : '')}
        extraActions={(t, reload) => (
          <button
            onClick={async () => {
              await api.patch(`/api/tasks/${t.id}`, { status: t.status === 'done' ? 'open' : 'done' });
              reload();
            }}
          >
            {t.status === 'done' ? 'Undo' : 'Done'}
          </button>
        )}
      />
    </div>
  );
}
