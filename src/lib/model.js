// Modello dati e regole di Opifex (date, ricorrenze, anelli).

export const TYPES = {
  impegno: { label: 'Impegno', plural: 'Impegni', icon: 'CircleCheck' },
  obiettivo: { label: 'Obiettivo', plural: 'Obiettivi', icon: 'Target' },
  abitudine: { label: 'Abitudine', plural: 'Abitudini', icon: 'Repeat' },
  problema: { label: 'Problema', plural: 'Problemi', icon: 'TriangleAlert' },
  oggetto: { label: 'Oggetto', plural: 'Oggetti', icon: 'ShoppingBag' },
  nota: { label: 'Nota', plural: 'Inbox', icon: 'Inbox' },
};
export const TYPE_IDS = Object.keys(TYPES);

export const PRIORITIES = [
  { id: 'critico', label: 'Critico', weight: 3 },
  { id: 'importante', label: 'Importante', weight: 2 },
  { id: 'normale', label: 'Normale', weight: 1 },
];
export const PRIORITY = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]));

export const STATUSES = [
  { id: 'todo', label: 'Da fare' },
  { id: 'doing', label: 'In corso' },
  { id: 'waiting', label: 'In attesa' },
  { id: 'done', label: 'Fatto' },
];
export const STATUS = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

export const RECURS = [
  { id: '', label: 'Mai' },
  { id: 'daily', label: 'Ogni giorno' },
  { id: 'weekdays', label: 'Lun–Ven' },
  { id: 'weekly', label: 'Ogni settimana' },
  { id: 'monthly', label: 'Ogni mese' },
];

// I tipi che "si fanno" e quindi contano negli anelli e in bacheca.
export const DOABLE = ['impegno', 'abitudine'];

/* ---------- date ---------- */
const pad = (n) => String(n).padStart(2, '0');
export const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromStr = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayStr = () => toStr(new Date());
export const addDays = (s, n) => {
  const d = fromStr(s);
  d.setDate(d.getDate() + n);
  return toStr(d);
};
export const startOfWeek = (s) => addDays(s, -((fromStr(s).getDay() + 6) % 7));
export const diffDays = (a, b) => Math.round((fromStr(a) - fromStr(b)) / 86400000);

const WD_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const WD_LONG = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export const weekdayShort = (s) => WD_SHORT[fromStr(s).getDay()];
export const weekdayLong = (s) => WD_LONG[fromStr(s).getDay()];
export const longDate = (s) => {
  const d = fromStr(s);
  return `${WD_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const shortDate = (s) => {
  const d = fromStr(s);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
export const monthLabel = (s) => {
  const d = fromStr(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export function relativeDate(s, today = todayStr()) {
  const diff = diffDays(s, today);
  if (diff === 0) return 'oggi';
  if (diff === 1) return 'domani';
  if (diff === -1) return 'ieri';
  if (diff < -1) return `${-diff} giorni fa`;
  if (diff < 7) return weekdayShort(s);
  return shortDate(s);
}

/* ---------- elementi ---------- */
export const uid = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).replace(/-/g, '').slice(0, 20);

export function newItem(partial = {}) {
  return {
    id: uid(),
    type: 'impegno',
    title: '',
    notes: '',
    area: null,
    priority: 'normale',
    status: 'todo',
    when: { kind: 'none', date: null, time: null },
    recur: '',
    checklist: [],
    links: [],
    waitingFor: '',
    price: '',
    url: '',
    focusDate: null,
    doneAt: null,
    doneLog: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial,
    when: { kind: 'none', date: null, time: null, ...(partial.when || {}) },
  };
}

export const isDone = (it) => it.status === 'done';
export const isDoable = (it) => DOABLE.includes(it.type);

export function isOverdue(it, today = todayStr()) {
  return !isDone(it) && it.when?.kind === 'date' && !!it.when.date && it.when.date < today;
}
export function isDueToday(it, today = todayStr()) {
  if (isDone(it)) return false;
  if (it.when?.kind === 'asap') return true;
  return it.when?.kind === 'date' && !!it.when.date && it.when.date <= today;
}
export function doneOn(it, day) {
  return (isDone(it) && it.doneAt === day) || (it.doneLog || []).includes(day);
}

export function nextOccurrence(dateStr, recur) {
  if (recur === 'daily') return addDays(dateStr, 1);
  if (recur === 'weekdays') {
    let d = addDays(dateStr, 1);
    while ([0, 6].includes(fromStr(d).getDay())) d = addDays(d, 1);
    return d;
  }
  if (recur === 'weekly') return addDays(dateStr, 7);
  if (recur === 'monthly') {
    const d = fromStr(dateStr);
    const day = d.getDate();
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    n.setDate(Math.min(day, last));
    return toStr(n);
  }
  return dateStr;
}

export function occursOn(it, day) {
  const base = it.when?.kind === 'date' ? it.when.date : null;
  if (!base) return false;
  if (!it.recur) return base === day;
  if (isDone(it) || day < base) return false;
  if (it.recur === 'daily') return true;
  if (it.recur === 'weekdays') return ![0, 6].includes(fromStr(day).getDay());
  if (it.recur === 'weekly') return diffDays(day, base) % 7 === 0;
  if (it.recur === 'monthly') return fromStr(day).getDate() === fromStr(base).getDate();
  return false;
}

// Restituisce l'elemento aggiornato dopo "fatto". I ricorrenti passano alla data successiva.
export function complete(it, today = todayStr()) {
  const now = Date.now();
  if (it.recur && it.when?.kind === 'date' && it.when.date) {
    let next = nextOccurrence(it.when.date, it.recur);
    while (next <= today) next = nextOccurrence(next, it.recur);
    const doneLog = [...new Set([...(it.doneLog || []), today])].slice(-120);
    return {
      ...it,
      when: { ...it.when, date: next },
      doneLog,
      status: 'todo',
      checklist: (it.checklist || []).map((c) => ({ ...c, done: false })),
      updatedAt: now,
    };
  }
  return { ...it, status: 'done', doneAt: today, updatedAt: now };
}
export function reopen(it) {
  return { ...it, status: 'todo', doneAt: null, updatedAt: Date.now() };
}

const prW = (it) => PRIORITY[it.priority]?.weight || 1;
export function sortItems(list) {
  return [...list].sort((a, b) => {
    const p = prW(b) - prW(a);
    if (p) return p;
    const da = a.when?.kind === 'date' ? `${a.when.date || ''}${a.when.time || '99'}` : 'z';
    const dbb = b.when?.kind === 'date' ? `${b.when.date || ''}${b.when.time || '99'}` : 'z';
    if (da !== dbb) return da < dbb ? -1 : 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}
export function sortByTime(list) {
  return [...list].sort((a, b) => {
    const ta = a.when?.time || '99:99';
    const tb = b.when?.time || '99:99';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return prW(b) - prW(a);
  });
}

export function whenLabel(it, today = todayStr()) {
  const w = it.when || {};
  if (w.kind === 'asap') return 'prima possibile';
  if (w.kind === 'date' && w.date) {
    const rel = relativeDate(w.date, today);
    return w.time ? `${rel} · ${w.time}` : rel;
  }
  return '';
}

// Anelli di oggi: per ogni livello, quanti fatti sul totale di cio' che era in programma.
export function ringStats(items, today = todayStr()) {
  const out = { critico: { done: 0, total: 0 }, importante: { done: 0, total: 0 }, normale: { done: 0, total: 0 } };
  for (const it of items) {
    if (!isDoable(it)) continue;
    const slot = out[it.priority] || out.normale;
    if (doneOn(it, today)) {
      slot.done += 1;
      slot.total += 1;
    } else if (isDueToday(it, today)) {
      slot.total += 1;
    }
  }
  return out;
}

// Anello di un'area: fatti negli ultimi 7 giorni sul totale (fatti + ancora aperti).
export function areaStats(items, areaId, today = todayStr()) {
  const from = addDays(today, -6);
  let done = 0;
  let open = 0;
  for (const it of items) {
    if (it.area !== areaId || !isDoable(it)) continue;
    const recent = (isDone(it) && it.doneAt && it.doneAt >= from) || (it.doneLog || []).some((d) => d >= from);
    if (recent) done += 1;
    if (!isDone(it)) open += 1;
  }
  return { done, open, total: done + open };
}

export function matches(it, q) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return `${it.title} ${it.notes || ''} ${(it.checklist || []).map((c) => c.t).join(' ')}`.toLowerCase().includes(s);
}
