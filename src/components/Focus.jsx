import { useEffect, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { doneOn, durationLabel } from '../lib/model.js';

const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Tiene lo schermo acceso mentre ti concentri (dove il browser lo permette).
function useWakeLock() {
  useEffect(() => {
    let lock = null;
    const ask = () => navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    ask();
    const again = () => document.visibilityState === 'visible' && ask();
    document.addEventListener('visibilitychange', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      lock?.release().catch(() => {});
    };
  }, []);
}

function useTick(active) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => set((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [active]);
}

function Dial({ pct, children, pulse }) {
  const r = 88;
  const c = 2 * Math.PI * r;
  return (
    <div className={`focus-dial ${pulse ? 'pulse' : ''}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="dial-track" cx="100" cy="100" r={r} />
        {Array.from({ length: 60 }, (_, i) => (
          <line key={i} className={`dial-tick ${i / 60 < pct ? 'on' : ''}`} x1="100" y1="4" x2="100" y2={i % 5 ? 9 : 13} transform={`rotate(${i * 6} 100 100)`} />
        ))}
        <circle className="dial-prog" cx="100" cy="100" r={r} strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 100 100)" />
      </svg>
      <div className="focus-center">{children}</div>
    </div>
  );
}

function TimerFocus({ item, onClose }) {
  const { actions } = useApp();
  const total = (item.minutes || 25) * 60000;
  const [span, setSpan] = useState(total);
  const [endAt, setEndAt] = useState(Date.now() + total);
  const [pausedLeft, setPausedLeft] = useState(null);
  const rang = useRef(false);
  const running = pausedLeft == null;
  useTick(running);
  const left = running ? endAt - Date.now() : pausedLeft;
  const over = left <= 0;
  useEffect(() => {
    if (over && !rang.current) {
      rang.current = true;
      sfx.ring();
      navigator.vibrate?.([120, 80, 120]);
    }
  }, [over]);

  const pause = () => {
    sfx.tap();
    if (running) setPausedLeft(Math.max(0, endAt - Date.now()));
    else {
      setEndAt(Date.now() + pausedLeft);
      setPausedLeft(null);
    }
  };
  const plus5 = () => {
    sfx.tap();
    rang.current = false;
    setSpan((s) => s + 300000);
    if (running) setEndAt((e) => Math.max(e, Date.now()) + 300000);
    else setPausedLeft((p) => p + 300000);
  };
  const finish = () => {
    actions.toggleDone(item);
    onClose();
  };

  return (
    <>
      <Dial pct={Math.min(1, 1 - left / span)} pulse={over}>
        <span className="focus-time">{over ? '00:00' : mmss(left)}</span>
        <span className="focus-sub">{over ? 'tempo scaduto' : running ? 'concentrazione' : 'in pausa'}</span>
      </Dial>
      <div className="focus-actions">
        {!over && (
          <button className="btn ghost" onClick={pause}>
            <Icon name={running ? 'Pause' : 'Play'} size={18} />
            {running ? 'Pausa' : 'Riprendi'}
          </button>
        )}
        <button className="btn ghost" onClick={plus5}>
          <Icon name="Plus" size={18} />5 min
        </button>
        <button className="btn primary" onClick={finish}>
          <Icon name="Check" size={18} />
          Fatto
        </button>
      </div>
    </>
  );
}

function RoutineRun({ item, onClose }) {
  const { actions, today } = useApp();
  const steps = item.checklist || [];
  const [i, setI] = useState(0);
  const [start] = useState(Date.now());
  useTick(true);
  const next = () => {
    if (i + 1 < steps.length) {
      sfx.done();
      setI(i + 1);
      return;
    }
    if (!doneOn(item, today)) actions.toggleDone(item);
    sfx.ring();
    onClose();
  };
  return (
    <>
      <Dial pct={steps.length ? i / steps.length : 0}>
        <span className="focus-time small">
          {i + 1}/{steps.length}
        </span>
        <span className="focus-sub">{mmss(Date.now() - start)}</span>
      </Dial>
      <ol className="routine-steps">
        {steps.map((st, k) => (
          <li key={st.id} className={k < i ? 'past' : k === i ? 'now' : ''}>
            {k < i && <Icon name="Check" size={14} />}
            <span>{st.t}</span>
          </li>
        ))}
      </ol>
      <div className="focus-actions">
        {i > 0 && (
          <button className="btn ghost" onClick={() => setI(i - 1)}>
            <Icon name="ArrowLeft" size={18} />
            Indietro
          </button>
        )}
        <button className="btn primary" onClick={next}>
          <Icon name={i + 1 < steps.length ? 'SkipForward' : 'Check'} size={18} />
          {i + 1 < steps.length ? 'Fatto, avanti' : 'Routine completata'}
        </button>
      </div>
    </>
  );
}

// Schermo intero: timer per un impegno, oppure passi in ordine per una routine.
export function Focus({ item, onClose }) {
  useWakeLock();
  const routine = item.type === 'abitudine' && (item.checklist || []).length > 0;
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={`focus-screen p-${item.priority}`} role="dialog" aria-modal="true" aria-label={`Concentrazione: ${item.title}`}>
      <div className="focus-stars" aria-hidden="true" />
      <header className="focus-head">
        <span className="kicker">{routine ? 'Routine' : 'Concentrazione'}{item.minutes && !routine ? ` · ${durationLabel(item.minutes)}` : ''}</span>
        <button className="icon-btn boxed" aria-label="Esci" onClick={onClose}>
          <Icon name="X" />
        </button>
      </header>
      <h2 className="focus-title">{item.title}</h2>
      {routine ? <RoutineRun item={item} onClose={onClose} /> : <TimerFocus item={item} onClose={onClose} />}
    </div>
  );
}
