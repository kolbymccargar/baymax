import CrudList from '../components/CrudList.jsx';
import { api } from '../api.js';

export default function Supplements() {
  return (
    <div className="panel">
      <h2>Supplements</h2>
      <p className="muted">Toggle “taken today” from the Today view.</p>
      <CrudList
        url="/api/supplements"
        defaults={{ active: 1 }}
        columns={[
          { key: 'name', label: 'Name', required: true },
          { key: 'dose', label: 'Dose' },
          { key: 'timing', label: 'Timing' },
          { key: 'notes', label: 'Notes', flex: 2 },
        ]}
        rowClass={(s) => (s.active ? '' : 'inactive')}
        extraActions={(s, reload) => (
          <button
            onClick={async () => {
              await api.patch(`/api/supplements/${s.id}`, { active: s.active ? 0 : 1 });
              reload();
            }}
          >
            {s.active ? 'Active' : 'Inactive'}
          </button>
        )}
      />
    </div>
  );
}
