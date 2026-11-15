import { useEffect, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { PRIORITIES } from '../lib/model.js';

const RADII = { critico: 88, importante: 66, normale: 44 };

export function Rings({ stats, celebrate }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);
  const done = PRIORITIES.reduce((n, p) => n + stats[p.id].done, 0);
  const total = PRIORITIES.reduce((n, p) => n + stats[p.id].total, 0);
  const label = PRIORITIES.map((p) => `${p.label} ${stats[p.id].done} di ${stats[p.id].total}`).join(', ');
  return (
    <div className={`rings ${celebrate ? 'celebrate' : ''}`}>
      <svg viewBox="0 0 200 200" role="img" aria-label={`Anelli di oggi: ${label}`}>
        {PRIORITIES.map((p) => {
          const r = RADII[p.id];
          const c = 2 * Math.PI * r;
          const s = stats[p.id];
          const frac = s.total ? s.done / s.total : 0;
          return (
            <g key={p.id} className={`p-${p.id}`}>
              <circle className="ring-track" cx="100" cy="100" r={r} />
              <circle
                className={`ring-prog ${frac >= 1 ? 'full' : ''}`}
                cx="100"
                cy="100"
                r={r}
                strokeDasharray={c}
                strokeDashoffset={c * (1 - (mounted ? frac : 0))}
                transform="rotate(-90 100 100)"
                style={{ opacity: frac > 0 ? 1 : 0 }}
              />
            </g>
          );
        })}
      </svg>
      <div className="rings-center">
        {total > 0 ? (
          <>
            <span className="rings-num">
              {done}/{total}
            </span>
            <span className="rings-sub">oggi</span>
          </>
        ) : (
          <>
            <Icon name="Orbit" size={22} />
            <span className="rings-sub">libero</span>
          </>
        )}
      </div>
      {celebrate && (
        <div className="burst" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <i key={i} style={{ '--a': `${i * 22.5}deg`, '--d': `${(i % 4) * 40}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RingsLegend({ stats }) {
  return (
    <div className="legend">
      {PRIORITIES.map((p) => (
        <div key={p.id} className={`legend-row p-${p.id}`}>
          <span className="legend-dot" />
          <div>
            <span className="legend-name">{p.label}</span>
            <span className="legend-count">
              {stats[p.id].total ? `${stats[p.id].done} di ${stats[p.id].total}` : 'niente oggi'}
            </span>
          </div>
        </div>
      ))}
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
