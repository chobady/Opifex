import { useEffect } from 'react';
import { Icon } from '../lib/icons.jsx';
import { sfx } from '../lib/sound.js';

export function Sheet({ title, onClose, children, footer, kicker }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="sheet-wrap"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="sheet-head">
          <div className="sheet-titles">
            {kicker && <span className="kicker">{kicker}</span>}
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" aria-label="Chiudi" onClick={onClose}>
            <Icon name="X" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Chips({ options, value, onChange, className = '', label }) {
  return (
    <div className={`chips ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`chip ${o.className || ''} ${value === o.id ? 'on' : ''}`}
          aria-pressed={value === o.id}
          onClick={() => {
            sfx.tap();
            onChange(o.id);
          }}
        >
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function Empty({ icon = 'Orbit', title, text, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {right}
    </div>
  );
}

// Tre barrette: l'importanza si legge anche senza colore.
export function Bars({ priority }) {
  const n = priority === 'critico' ? 3 : priority === 'importante' ? 2 : 1;
  return (
    <span className="bars" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
    </span>
  );
}

export function Progress({ pct, className = '' }) {
  const v = Math.round(Math.max(0, Math.min(1, pct || 0)) * 100);
  return (
    <span className={`progress ${className} ${v >= 100 ? 'full' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <i style={{ width: `${v}%` }} />
    </span>
  );
}
