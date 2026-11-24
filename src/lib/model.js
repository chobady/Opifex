// Modello dati e regole di Opifex (date, ricorrenze, anelli).

export const TYPES = {
  impegno: { label: 'Impegno', plural: 'Impegni', icon: 'CircleCheck' },
  obiettivo: { label: 'Obiettivo', plural: 'Obiettivi', icon: 'Target' },
  abitudine: { label: 'Abitudine', plural: 'Abitudini', icon: 'Repeat' },
  problema: { label: 'Problema', plural: 'Problemi', icon: 'TriangleAlert' },
  oggetto: { label: 'Oggetto', plural: 'Oggetti', icon: 'ShoppingBag' },
  nota: { label: 'Nota', plural: 'Inbox', icon: 'Inbox' },
  diario: { label: 'Diario', plural: 'Diario', icon: 'NotebookPen' },
  persona: { label: 'Persona', plural: 'Persone', icon: 'UserRound' },
};
// I tipi che si possono scegliere nell'editor (il diario ha la sua vista).
export const TYPE_IDS = ['impegno', 'obiettivo', 'abitudine', 'problema', 'oggetto', 'nota'];

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
  { id: 'yearly', label: 'Ogni anno' },
];

// Quanto prima avvisare di una scadenza (giorni).
export const ADVANCES = [
  { id: '0', label: 'Il giorno stesso' },
  { id: '3', label: '3 giorni prima' },
  { id: '7', label: '1 settimana' },
  { id: '14', label: '2 settimane' },
  { id: '30', label: '1 mese' },
];

// Durate rapide in minuti.
export const DURATIONS = [5, 15, 30, 60, 120];
export const durationLabel = (m) => (!m ? '' : m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);

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
    paid: '',
    paidOn: null,
    url: '',
    someday: false,
    measure: null,
    habit: null,
    advice: null,
    mood: null,
    day: null,
    focusDate: null,
    minutes: null,
    advanceDays: 0,
    slips: 0,
    photos: [],
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
  if (isDone(it) || it.someday) return false;
  if (it.type === 'abitudine') return habitDue(it, today);
  if (it.when?.kind === 'asap') return true;
  return it.when?.kind === 'date' && !!it.when.date && it.when.date <= today;
}
export function doneOn(it, day) {
  return (isDone(it) && it.doneAt === day) || (it.doneLog || []).includes(day);
}

/* ---------- abitudini ---------- */
export const HABIT_MODES = [
  { id: 'daily', label: 'Ogni giorno' },
  { id: 'weekdays', label: 'Lun–Ven' },
  { id: 'times', label: 'Alcune volte a settimana' },
];
export const DEFAULT_HABIT = { mode: 'daily', perWeek: 3 };
export const habitOf = (it) => ({ ...DEFAULT_HABIT, ...(it.habit || {}) });

const isWeekend = (day) => [0, 6].includes(fromStr(day).getDay());
export function weekCount(it, day) {
  const from = startOfWeek(day);
  const to = addDays(from, 6);
  return (it.doneLog || []).filter((d) => d >= from && d <= to).length;
}
// Il giorno e' "in programma" per l'abitudine?
export function habitScheduled(it, day) {
  const h = habitOf(it);
  if (h.mode === 'weekdays') return !isWeekend(day);
  if (h.mode === 'times') return doneOn(it, day) || weekCount(it, day) < h.perWeek;
  return true;
}
export function habitDue(it, day = todayStr()) {
  return !it.someday && !doneOn(it, day) && habitScheduled(it, day);
}
export function toggleHabitDay(it, day) {
  const log = it.doneLog || [];
  const next = log.includes(day) ? log.filter((d) => d !== day) : [...log, day].sort();
  return { ...it, doneLog: next.slice(-400), updatedAt: Date.now() };
}
// Serie attuale: giorni di fila (o settimane, per "alcune volte a settimana").
export function habitStreak(it, today = todayStr()) {
  const h = habitOf(it);
  const log = new Set(it.doneLog || []);
  if (h.mode === 'times') {
    let week = startOfWeek(today);
    let n = 0;
    const met = (w) => (it.doneLog || []).filter((d) => d >= w && d <= addDays(w, 6)).length >= h.perWeek;
    if (!met(week)) week = addDays(week, -7);
    while (n < 520 && met(week)) {
      n += 1;
      week = addDays(week, -7);
    }
    return { n, unit: n === 1 ? 'settimana' : 'settimane' };
  }
  let day = log.has(today) ? today : addDays(today, -1);
  let n = 0;
  for (let guard = 0; guard < 800; guard += 1) {
    if (h.mode === 'weekdays' && isWeekend(day)) {
      day = addDays(day, -1);
      continue;
    }
    if (!log.has(day)) break;
    n += 1;
    day = addDays(day, -1);
  }
  return { n, unit: n === 1 ? 'giorno' : 'giorni' };
}
// Quanti dei giorni in programma negli ultimi `span` giorni sono stati fatti (0..1).
export function habitRate(it, today = todayStr(), span = 30) {
  const h = habitOf(it);
  const from = addDays(today, -(span - 1));
  const startDay = it.createdAt ? toStr(new Date(it.createdAt)) : from;
  const begin = startDay > from ? startDay : from;
  if (begin > today) return null;
  const done = (it.doneLog || []).filter((d) => d >= begin && d <= today).length;
  if (h.mode === 'times') {
    const weeks = Math.max(1, (diffDays(today, begin) + 1) / 7);
    return Math.min(1, done / (h.perWeek * weeks));
  }
  let planned = 0;
  for (let d = begin; d <= today; d = addDays(d, 1)) if (h.mode === 'daily' || !isWeekend(d)) planned += 1;
  return planned ? Math.min(1, done / planned) : null;
}

/* ---------- obiettivi ---------- */
const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export { num as toNumber };
// Progresso 0..1: da un numero (misurabile) oppure da passi e impegni collegati (tappe).
export function goalProgress(it, byId = {}) {
  const m = it.measure;
  if (m) {
    const start = num(m.start) ?? 0;
    const cur = num(m.current) ?? start;
    const target = num(m.target);
    if (target === null || target === start) return null;
    const pct = Math.max(0, Math.min(1, (cur - start) / (target - start)));
    return { pct, mode: 'measure', label: `${m.current ?? start} / ${m.target}${m.unit ? ' ' + m.unit : ''}` };
  }
  const steps = it.checklist || [];
  const linked = (it.links || []).map((id) => byId[id]).filter((x) => x && x.type === 'impegno');
  const total = steps.length + linked.length;
  if (!total) return null;
  const done = steps.filter((c) => c.done).length + linked.filter(isDone).length;
  return { pct: done / total, mode: 'steps', label: `${done} di ${total} tappe`, done, total };
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
  if (recur === 'yearly') {
    const d = fromStr(dateStr);
    const n = new Date(d.getFullYear() + 1, d.getMonth(), 1);
    const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    n.setDate(Math.min(d.getDate(), last));
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
  if (it.recur === 'yearly') return day.slice(5) === base.slice(5);
  return false;
}

// Scadenze che si avvicinano: data futura entro l'anticipo scelto.
export function upcoming(items, today = todayStr()) {
  return items
    .filter((it) => !isDone(it) && !it.someday && it.advanceDays > 0 && it.when?.kind === 'date' && it.when.date > today)
    .filter((it) => diffDays(it.when.date, today) <= it.advanceDays)
    .sort((a, b) => (a.when.date < b.when.date ? -1 : 1));
}

// Impegni rimasti indietro (scaduti, non ricorrenti giornalieri).
export const behind = (items, today = todayStr()) => items.filter((it) => it.type === 'impegno' && !it.someday && isOverdue(it, today));

// Sposta a una nuova data contando il rinvio.
export function postpone(it, date) {
  return { ...it, when: { ...it.when, kind: 'date', date }, slips: (it.slips || 0) + 1, updatedAt: Date.now() };
}

// Cosa fare se ho N minuti: impegni aperti per oggi o senza data, che ci stanno nel tempo.
export function fitsIn(items, minutes, today = todayStr()) {
  const open = items.filter(
    (it) =>
      it.type === 'impegno' &&
      !isDone(it) &&
      !it.someday &&
      it.status !== 'waiting' &&
      (it.when?.kind !== 'date' || !it.when.date || it.when.date <= today),
  );
  return {
    fit: sortItems(open.filter((it) => it.minutes && it.minutes <= minutes)),
    unknown: sortItems(open.filter((it) => !it.minutes)),
  };
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
      slips: 0,
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

// Anelli di Oggi per fasi della Bacheca: esterno = da fare, medio = in corso (anche in attesa), interno = fatto.
export const STAGES = [
  { id: 'todo', label: 'Da fare', r: 88 },
  { id: 'doing', label: 'In corso', r: 66 },
  { id: 'done', label: 'Fatto', r: 44 },
];
export function stageStats(items, today = todayStr()) {
  const out = { todo: [], doing: [], done: [] };
  for (const it of items) {
    // I "prima possibile" non fanno parte degli anelli: hanno il loro riquadro sotto.
    if (it.type !== 'impegno' || it.someday || it.when?.kind === 'asap') continue;
    if (doneOn(it, today)) out.done.push(it);
    else if (isDone(it)) continue;
    // Un impegno destinato a un giorno futuro conta solo da quel giorno (se resta indietro, continua a contare).
    else if (it.when?.kind === 'date' && it.when.date && it.when.date > today) continue;
    else if (it.status === 'doing' || it.status === 'waiting') out.doing.push(it);
    else if (isDueToday(it, today)) out.todo.push(it);
  }
  for (const k of Object.keys(out)) out[k] = sortItems(out[k]);
  const total = out.todo.length + out.doing.length + out.done.length;
  return { ...out, total };
}

// Anello di un'area: fatti negli ultimi 7 giorni sul totale (fatti + ancora aperti).
export function areaStats(items, areaId, today = todayStr()) {
  const from = addDays(today, -6);
  let done = 0;
  let open = 0;
  for (const it of items) {
    if (it.area !== areaId || !isDoable(it) || it.someday) continue;
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

/* ---------- storico e prezzi ---------- */
export function parsePrice(v) {
  const m = String(v ?? '').replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
export const money = (n) => `${(Math.round(n * 100) / 100).toLocaleString('it-IT', { minimumFractionDigits: n % 1 ? 2 : 0 })} €`;

// Tutte le volte che qualcosa e' stato fatto: [{day, item}].
export function doneEvents(items) {
  const out = [];
  for (const it of items) {
    if (it.type === 'diario' || it.type === 'persona') continue;
    if (isDone(it) && it.doneAt && !(it.recur && it.when?.kind === 'date')) out.push({ day: it.doneAt, item: it });
    for (const d of it.doneLog || []) out.push({ day: d, item: it });
  }
  return out;
}

/* ---------- persone ---------- */
export const phoneDigits = (p) => String(p || '').replace(/[^\d+]/g, '');
// Cose che riguardano una persona: collegate a lei, oppure "in attesa di" col suo nome.
export function personItems(person, items) {
  const name = (person.title || '').trim().toLowerCase();
  const first = name.split(/\s+/)[0];
  return items.filter((it) => {
    if (it.id === person.id || it.type === 'persona' || it.type === 'diario') return false;
    if ((it.links || []).includes(person.id)) return true;
    const w = (it.waitingFor || '').toLowerCase();
    return !!w && !!first && (w.includes(name) || w.split(/[^\p{L}]+/u).includes(first));
  });
}

// Settimana a cui si riferisce la revisione (di domenica vale gia' la prossima).
export const reviewWeek = (today) => (new Date(`${today}T12:00:00`).getDay() === 0 ? addDays(today, 1) : startOfWeek(today));
