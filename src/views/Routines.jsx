import CrudList from '../components/CrudList.jsx';
import { api, today } from '../api.js';

export default function Routines() {
  return (
    <div className="panel">
      <h2>Routines</h2>
      <CrudList
        url="/api/routines"
        columns={[
          { key: 'name', label: 'Name', required: true, flex: 2 },
          { key: 'schedule', label: 'Schedule (e.g. daily)' },
          { key: 'last_done', label: 'Last done', type: 'date' },
        ]}
        extraActions={(r, reload) => (
          <button
            onClick={async () => {
              await api.patch(`/api/routines/${r.id}`, { last_done: today() });
              reload();
            }}
          >
            Mark done
          </button>
        )}
      />
    </div>
  );
}
