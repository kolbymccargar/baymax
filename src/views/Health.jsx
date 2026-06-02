import CrudList from '../components/CrudList.jsx';
import { today } from '../api.js';

export default function Health() {
  return (
    <div className="panel">
      <h2>Health Logs</h2>
      <CrudList
        url="/api/health_logs"
        columns={[
          { key: 'date', label: 'Date', type: 'date', default: today() },
          { key: 'metric', label: 'Metric (e.g. sleep_hours)', required: true },
          { key: 'value', label: 'Value' },
          { key: 'notes', label: 'Notes', flex: 2 },
        ]}
      />
    </div>
  );
}
