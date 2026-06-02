import { useState } from 'react';
import Today from './views/Today.jsx';
import Tasks from './views/Tasks.jsx';
import Routines from './views/Routines.jsx';
import Supplements from './views/Supplements.jsx';
import Weight from './views/Weight.jsx';
import Health from './views/Health.jsx';
import Profile from './views/Profile.jsx';

const VIEWS = {
  today: ['Today', Today],
  tasks: ['Tasks', Tasks],
  routines: ['Routines', Routines],
  supplements: ['Supplements', Supplements],
  weight: ['Weight', Weight],
  health: ['Health', Health],
  profile: ['Profile', Profile],
};

export default function App() {
  const [view, setView] = useState('today');
  const Current = VIEWS[view][1];

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

      <nav className="tabs">
        {Object.entries(VIEWS).map(([key, [label]]) => (
          <button key={key} className={key === view ? 'active' : ''} onClick={() => setView(key)}>
            {label}
          </button>
        ))}
      </nav>

      <main>
        <Current />
      </main>
    </div>
  );
}
