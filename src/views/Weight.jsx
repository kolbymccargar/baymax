import CrudList from '../components/CrudList.jsx';
import { today } from '../api.js';

export default function Weight() {
  return (
    <div className="panel">
      <h2>Weight Log</h2>
      <CrudList
        url="/api/weight_log"
        addLabel="Log"
        columns={[
          { key: 'date', label: 'Date', type: 'date', default: today() },
          { key: 'weight', label: 'Weight', type: 'number', required: true },
        ]}
      />
    </div>
  );
}
