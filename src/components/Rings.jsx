import { useEffect, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { PRIORITIES, STAGES } from '../lib/model.js';

// Ogni impegno di oggi ha la sua "fetta" fissa (stesso angolo in tutti e tre gli anelli):
// quando avanza di fase, si accende la fetta dell'anello più interno, nello stesso punto.
const WEIGHT = { critico: 0, importante: 1, normale: 2 };
export function ringSlots(stats) {
  const all = [...stats.todo, ...stats.doing, ...stats.done];
  return all.sort(
    (a, b) =>
      (WEIGHT[a.priority] ?? 2) - (WEIGHT[b.priority] ?? 2) ||
      (a.createdAt || 0) - (b.createdAt || 0) ||
      String(a.id).localeCompare(String(b.id)),
  );
}

function StageRing({ stage, slots, stageOf, mounted }) {
  const { r } = stage;
  const total = slots.length;
  const c = 2 * Math.PI * r;
  const n = Math.max(total, 1);
  const slot = c / n;
  const gap = total > 1 ? Math.min(7, slot * 0.34) : 0;
  const dash = slot - gap;
  return (
    <g className={`stage stage-${stage.id}`}>
      {total === 0 && <circle className="ring-track" cx="100" cy="100" r={r} />}
      {slots.map((it, i) => {
        const on = stageOf[it.id] === stage.id;
        const rot = -90 + (i * 360) / n + ((gap / 2) * 360) / c;
        return (
          <circle
            key={`${it.id}-${on ? 'on' : 'off'}`}
            className={on ? `ring-seg on p-${it.priority || 'normale'}` : 'ring-seg empty'}
            cx="100"
            cy="100"
            r={r}
            strokeDasharray={`${dash} ${c}`}
            transform={`rotate(${rot} 100 100)`}
            style={on ? { '--dash': dash, animationDelay: mounted ? '0ms' : `${120 + i * 70}ms` } : undefined}
          />
        );
      })}
    </g>
  );
}

export function Rings({ stats, celebrate }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 1200);
    return () => clearTimeout(t);
  }, []);
  const { total } = stats;
  const done = stats.done.length;
  const label = STAGES.map((s) => `${s.label} ${stats[s.id].length}`).join(', ');
  // Giornata completa: tutto al centro -> anelli d'oro (restano d'oro finché resta tutto fatto).
  const golden = total > 0 && done === total;
  const slots = ringSlots(stats);
  const stageOf = {};
  STAGES.forEach((st) => stats[st.id].forEach((it) => (stageOf[it.id] = st.id)));
  return (
    <div className={`rings ${celebrate ? 'celebrate victory' : ''} ${golden ? 'all-done golden' : ''}`}>
      <svg viewBox="0 0 200 200" role="img" aria-label={golden ? `Giornata completa: fatti tutti i ${total} impegni` : `Impegni di oggi: ${label}, fatti ${done} di ${total}`}>
        <defs>
          <linearGradient id="opx-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.35" stopColor="#ffd34d" />
            <stop offset="0.65" stopColor="#e9a300" />
            <stop offset="1" stopColor="#fff0a0" />
          </linearGradient>
        </defs>
        {STAGES.map((s) => (
          <StageRing key={s.id} stage={s} slots={slots} stageOf={stageOf} mounted={mounted} />
        ))}
      </svg>
      <div className="rings-center">
        {total > 0 ? (
          <>
            <span className="rings-num">
              {done}/{total}
            </span>
            <span className="rings-sub">{golden ? 'giornata completa' : 'fatti oggi'}</span>
          </>
        ) : (
          <>
            <Icon name="Orbit" size={22} />
            <span className="rings-sub">libero</span>
          </>
        )}
      </div>
      {celebrate && (
        <div className="burst gold" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ '--a': `${i * 15}deg`, '--d': `${300 + (i % 6) * 70}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RingsLegend({ stats }) {
  return (
    <div className="legend">
      {STAGES.map((s, i) => (
        <div key={s.id} className={`legend-row stage-${s.id}`}>
          <span className="legend-ring" aria-hidden="true">
            {STAGES.map((x, k) => (
              <i key={x.id} className={k === i ? 'on' : ''} />
            ))}
          </span>
          <div>
            <span className="legend-name">
              {s.id === 'doing' ? 'In corso / attesa' : s.label}
            </span>
            <span className="legend-pips">
              {stats[s.id].length ? (
                stats[s.id].map((it) => <i key={it.id} className={`p-${it.priority || 'normale'}`} title={it.title} />)
              ) : (
                <span className="legend-count">nessuno</span>
              )}
            </span>
          </div>
        </div>
      ))}
      <div className="legend-key" aria-label="Colori per importanza">
        {PRIORITIES.map((p) => (
          <span key={p.id} className={`p-${p.id}`}>
            <i />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AreaRing({ area, stats, size = 48, onClick, label = true }) {
  const r = 21;
  const c = 2 * Math.PI * r;
  const frac = stats.total ? stats.done / stats.total : 0;
  return (
    <button className="area-ring" onClick={onClick} aria-label={`Area ${area.name}: ${stats.open} aperti`}>
      <span className="area-ring-art" style={{ width: size, height: size }}>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle className="ring-track" cx="24" cy="24" r={r} />
          <circle
            className="area-prog"
            cx="24"
            cy="24"
            r={r}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - frac)}
            transform="rotate(-90 24 24)"
            style={{ opacity: frac > 0 ? 1 : 0 }}
          />
        </svg>
        <Icon name={area.icon} size={Math.round(size * 0.42)} />
        {stats.open > 0 && <span className="area-count">{stats.open}</span>}
      </span>
      {label && <span className="area-name">{area.name}</span>}
    </button>
  );
}
