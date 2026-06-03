import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Chat from '../Chat.jsx';
import '../dashboard.css';

// ── Count-up animation hook ───────────────────────────────
function useCountUp(target, duration = 1400, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target == null || isNaN(Number(target))) return;
    const t = Number(target);
    let raf;
    let startTs = null;
    const tick = (ts) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs - delay;
      if (elapsed <= 0) { raf = requestAnimationFrame(tick); return; }
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setVal(eased * t);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(t);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return val;
}

// ── Animated stat block ───────────────────────────────────
function StatBlock({ name, value, unit, delay = 0, decimals = 0, note }) {
  const raw = useCountUp(value != null ? Number(value) : null, 1400, delay);
  const display = value == null
    ? '—'
    : decimals > 0
    ? raw.toFixed(decimals)
    : Math.round(raw).toLocaleString();
  return (
    <div className="hud-stat">
      <div className="hud-stat-val">
        {display}
        {value != null && unit && <span className="hud-stat-unit">{unit}</span>}
      </div>
      <div className="hud-stat-name">{name}</div>
      {note && <div className="hud-stat-note">{note}</div>}
    </div>
  );
}

const BLOCKS = ['morning', 'day', 'night'];

// ── Today view ────────────────────────────────────────────
export default function Today() {
  const [data, setData]               = useState(null);
  const [briefing, setBriefing]       = useState(null);
  const [stats, setStats]             = useState(null);
  const [briefingBusy, setBriefingBusy] = useState(true);
  const [briefingErr, setBriefingErr] = useState('');

  const reload = () => api.get('/api/today').then(setData);

  useEffect(() => {
    reload();
    api.get('/api/briefing')
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setBriefing(d.briefing);
        setStats(d.stats ?? null);
      })
      .catch((e) => setBriefingErr(e.message))
      .finally(() => setBriefingBusy(false));
  }, []);

  const toggleSupp = async (id) => {
    await api.post(`/api/supplements/${id}/toggle`);
    reload();
  };

  // Prefer workout from stats (briefing data); fall back to /api/today data
  const workout = stats?.workout ?? data?.workout ?? null;
  const runDay  = stats ? stats.runDay : workout ? !!workout.run : true;

  return (
    <div className="hud">

      {/* ── HERO — Morning brief ──────────────────────── */}
      <section className="hud-panel hud-hero" style={{ '--d': '0ms' }}>
        <div className="hud-lbl">Morning Brief</div>
        {briefingBusy && !briefing && (
          <p className="hud-hero-loading">Baymax is reading your data…</p>
        )}
        {briefingErr && <p className="hud-hero-error">{briefingErr}</p>}
        {briefing   && <p className="hud-briefing">{briefing}</p>}
      </section>

      {/* ── STATS — Calorie & run numbers ────────────── */}
      <section className="hud-panel hud-stats" style={{ '--d': '90ms' }}>
        <div className="hud-lbl">{runDay ? 'Run Target' : 'Daily Targets'}</div>
        <div className="hud-stat-grid">
          <StatBlock name="BMR"          value={stats?.bmr}            unit="kcal" delay={260} />
          <StatBlock name="TDEE"         value={stats?.tdee}           unit="kcal" delay={330} />
          <StatBlock name="Deficit"      value={stats?.deficit}        unit="kcal" delay={400} />
          <StatBlock name="Target Intake" value={stats?.targetCalories} unit="kcal" delay={470} />
          {runDay && (
            <StatBlock
              name="Run Distance"
              value={stats?.runMiles}
              unit="mi"
              delay={540}
              decimals={1}
              note={stats?.runMinutes ? `~${stats.runMinutes} min · ${stats.cpm} kcal/mi` : null}
            />
          )}
        </div>
        <p className="hud-stats-footnote">
          Estimates · Mifflin-St Jeor · BMR × 1.375 · 0.75 × BW kcal/mi
        </p>
      </section>

      {/* ── MIDDLE — Workout/Routines + right column ─── */}
      <div className="hud-middle">

        {/* Left: Workout + Routines */}
        <section className="hud-panel" style={{ '--d': '180ms' }}>
          <div className="hud-lbl">Today's Workout</div>
          {workout ? (
            <>
              <div className="hud-focus">
                {workout.focus}
                {workout.notes && <span className="hud-focus-note"> — {workout.notes}</span>}
              </div>
              <div className={`hud-run-flag ${runDay ? 'on' : 'off'}`}>
                <span className="hud-run-pip" />
                {runDay ? 'Run day — 2 mi min' : 'No run today'}
              </div>
            </>
          ) : (
            <p className="hud-none">No schedule on file</p>
          )}

          {data && (
            <div className="hud-routines">
              <div className="hud-lbl" style={{ marginBottom: '10px' }}>Routines</div>
              {BLOCKS.map((block) => {
                const items = data.routines.filter((r) => r.time_block === block);
                if (!items.length) return null;
                return (
                  <div key={block} className="hud-block">
                    <div className="hud-block-lbl">{block}</div>
                    <ul className="hud-routine-list">
                      {items.map((r) => (
                        <li key={r.id} className="hud-routine-item">
                          <span className="hud-dot" />
                          {r.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Supplements + Tasks stacked */}
        <div className="hud-right">

          {/* Supplements */}
          <section className="hud-panel" style={{ '--d': '270ms' }}>
            <div className="hud-lbl">Supplements</div>
            {data?.supplements?.length ? (
              <ul className="hud-supp-list">
                {data.supplements.map((s) => (
                  <li
                    key={s.id}
                    className={`hud-supp-item${s.taken ? ' taken' : ''}`}
                    onClick={() => toggleSupp(s.id)}
                  >
                    <span className="hud-supp-pip" />
                    <span className="hud-supp-name">{s.name}</span>
                    {s.timing && <span className="hud-supp-timing">{s.timing}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hud-none">{data ? 'No active supplements.' : 'Loading…'}</p>
            )}
          </section>

          {/* Tasks */}
          <section className="hud-panel" style={{ '--d': '340ms' }}>
            <div className="hud-lbl">Tasks</div>
            {data?.tasks?.length ? (
              <ul className="hud-task-list">
                {data.tasks.map((t) => (
                  <li key={t.id} className="hud-task-item">
                    <span className="hud-task-pip" />
                    <span>{t.title}</span>
                    {t.notes && <span className="hud-task-note">{t.notes}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hud-none">{data ? 'Nothing due today.' : 'Loading…'}</p>
            )}
          </section>

        </div>
      </div>

      {/* ── CHAT — Command line ───────────────────────── */}
      <section className="hud-panel hud-chat" style={{ '--d': '420ms' }}>
        <div className="hud-lbl">Command Line</div>
        <Chat onDataChanged={reload} />
      </section>

    </div>
  );
}
