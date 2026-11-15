// Suoni sci-fi generati al volo con WebAudio: nessun file audio da scaricare.
const KEY = 'opifex.sound';
let ctx = null;
let enabled = true;
try {
  enabled = localStorage.getItem(KEY) !== 'off';
} catch {
  /* storage non disponibile */
}

function audio() {
  if (!enabled) return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ f = 440, f2, t = 0.12, type = 'sine', g = 0.08, delay = 0, cutoff }) {
  const a = audio();
  if (!a) return;
  const start = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, start);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, start + t);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(g, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + t);
  let node = osc;
  if (cutoff) {
    const filter = a.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    osc.connect(filter);
    node = filter;
  }
  node.connect(gain);
  gain.connect(a.destination);
  osc.start(start);
  osc.stop(start + t + 0.03);
}

export const sfx = {
  tap() {
    tone({ f: 900, f2: 1350, t: 0.05, type: 'triangle', g: 0.035 });
  },
  nav() {
    tone({ f: 520, f2: 780, t: 0.07, type: 'sine', g: 0.045 });
  },
  open() {
    tone({ f: 380, f2: 760, t: 0.11, type: 'sine', g: 0.05 });
    tone({ f: 1520, t: 0.08, type: 'triangle', g: 0.02, delay: 0.05 });
  },
  close() {
    tone({ f: 700, f2: 350, t: 0.1, type: 'sine', g: 0.045 });
  },
  done() {
    tone({ f: 523, f2: 1046, t: 0.13, type: 'sine', g: 0.08 });
    tone({ f: 1568, t: 0.2, type: 'triangle', g: 0.045, delay: 0.09 });
  },
  undo() {
    tone({ f: 800, f2: 400, t: 0.12, type: 'triangle', g: 0.04 });
  },
  ring() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, t: 0.42, type: 'sine', g: 0.07, delay: i * 0.075 }));
    tone({ f: 2093, f2: 4186, t: 0.6, type: 'triangle', g: 0.02, delay: 0.38 });
  },
  send() {
    tone({ f: 260, f2: 1900, t: 0.26, type: 'sawtooth', g: 0.035, cutoff: 2400 });
  },
  think() {
    tone({ f: 660, t: 0.06, type: 'square', g: 0.015, cutoff: 1800 });
    tone({ f: 990, t: 0.06, type: 'square', g: 0.015, delay: 0.09, cutoff: 1800 });
  },
  reply() {
    tone({ f: 784, t: 0.09, type: 'sine', g: 0.06 });
    tone({ f: 1175, t: 0.14, type: 'sine', g: 0.06, delay: 0.08 });
  },
  error() {
    tone({ f: 190, f2: 120, t: 0.26, type: 'square', g: 0.035, cutoff: 900 });
  },
  remove() {
    tone({ f: 420, f2: 90, t: 0.22, type: 'sawtooth', g: 0.035, cutoff: 1400 });
  },
};

export const soundEnabled = () => enabled;
export function setSoundEnabled(on) {
  enabled = !!on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage non disponibile */
  }
  if (on) sfx.open();
}
