// Lettore minimo di calendari .ics (iCloud "Calendario pubblico" e simili): eventi, ripetizioni, eccezioni.
// Tutto viene convertito nell'ora di Roma.
const TZ = 'Europe/Rome';

function unfold(text) {
  return String(text).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}
const unescape = (v) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

function parseLine(line) {
  const i = line.indexOf(':');
  if (i < 0) return null;
  const head = line.slice(0, i);
  const value = line.slice(i + 1);
  const [name, ...ps] = head.split(';');
  const params = Object.fromEntries(ps.map((p) => p.split('=')).map(([k, v]) => [k.toUpperCase(), (v || '').replace(/"/g, '')]));
  return { name: name.toUpperCase(), params, value };
}

// Parti di data/ora "da parete" in un fuso -> millisecondi UTC.
function zonedToMs(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  try {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const p = Object.fromEntries(f.formatToParts(new Date(guess)).map((x) => [x.type, x.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    return guess - (shown - guess);
  } catch {
    return guess;
  }
}
function msToRome(ms) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

// Valore DTSTART/DTEND -> { date, time|null, allDay }
function parseWhen(prop) {
  if (!prop) return null;
  const v = prop.value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (!h || prop.params.VALUE === 'DATE') return { date: `${y}-${mo}-${d}`, time: null, allDay: true };
  if (z) return { ...msToRome(Date.UTC(+y, +mo - 1, +d, +h, +mi)), allDay: false };
  const tz = prop.params.TZID;
  if (tz && tz !== TZ) return { ...msToRome(zonedToMs(+y, +mo, +d, +h, +mi, tz)), allDay: false };
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}`, allDay: false };
}

const pad = (n) => String(n).padStart(2, '0');
const toDate = (s) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
const fmt = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (s, n) => {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
};
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);
const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function parseRule(v) {
  return Object.fromEntries(v.split(';').map((p) => p.split('=')));
}

// Date in cui cade l'evento tra from e to (compresi).
function occurrences(start, rule, from, to, exdates) {
  if (!rule) return start >= from && start <= to ? [start] : [];
  const r = parseRule(rule);
  const interval = Math.max(1, Number(r.INTERVAL) || 1);
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? parseWhen({ value: r.UNTIL, params: {} })?.date : null;
  const byday = r.BYDAY ? r.BYDAY.split(',') : null;
  const out = [];
  let n = 0;
  const take = (d) => {
    if (d < start) return true;
    if (until && d > until) return false;
    if (n >= count) return false;
    n += 1;
    if (d >= from && d <= to && !exdates.has(d)) out.push(d);
    return d <= to;
  };
  const sd = toDate(start);
  if (r.FREQ === 'DAILY') {
    for (let d = start, k = 0; k < 4000; d = addDays(d, interval), k += 1) if (!take(d)) break;
  } else if (r.FREQ === 'WEEKLY') {
    const days = (byday || [Object.keys(WD).find((k) => WD[k] === sd.getUTCDay())]).map((x) => WD[x.slice(-2)]).sort();
    const week0 = addDays(start, -((sd.getUTCDay() + 6) % 7));
    outer: for (let w = 0; w < 1500; w += interval) {
      const ws = addDays(week0, w * 7);
      for (const wd of days.map((x) => (x + 6) % 7).sort((a, b) => a - b)) if (!take(addDays(ws, wd))) break outer;
    }
  } else if (r.FREQ === 'MONTHLY' || r.FREQ === 'YEARLY') {
    const step = r.FREQ === 'MONTHLY' ? interval : 12 * interval;
    for (let k = 0; k < 1200; k += step) {
      const base = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth() + k, 1));
      const y = base.getUTCFullYear();
      const m = base.getUTCMonth();
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      let day = null;
      const bd = byday && byday[0].match(/^([+-]?\d)?(\w\w)$/);
      if (bd && bd[1]) {
        const nth = Number(bd[1]);
        const want = WD[bd[2]];
        const hits = [];
        for (let dd = 1; dd <= last; dd += 1) if (new Date(Date.UTC(y, m, dd)).getUTCDay() === want) hits.push(dd);
        day = nth > 0 ? hits[nth - 1] : hits[hits.length + nth];
      } else day = sd.getUTCDate() <= last ? sd.getUTCDate() : null;
      if (!day) continue;
      if (!take(`${y}-${pad(m + 1)}-${pad(day)}`)) break;
    }
  } else if (start >= from && start <= to) out.push(start);
  return out;
}

export function parseIcs(text, from, to) {
  const events = [];
  const overrides = new Map();
  let cur = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') {
      cur = { ex: [] };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const p = parseLine(line);
    if (!p) continue;
    if (p.name === 'SUMMARY') cur.title = unescape(p.value);
    else if (p.name === 'LOCATION') cur.where = unescape(p.value);
    else if (p.name === 'UID') cur.uid = p.value;
    else if (p.name === 'DTSTART') cur.start = parseWhen(p);
    else if (p.name === 'DTEND') cur.end = parseWhen(p);
    else if (p.name === 'RRULE') cur.rule = p.value;
    else if (p.name === 'STATUS') cur.status = p.value.toUpperCase();
    else if (p.name === 'RECURRENCE-ID') cur.recId = parseWhen(p);
    else if (p.name === 'EXDATE') p.value.split(',').forEach((v) => { const w = parseWhen({ ...p, value: v }); if (w) cur.ex.push(w.date); });
  }
  for (const e of events) if (e.recId && e.uid) overrides.set(`${e.uid}|${e.recId.date}`, true);
  const out = [];
  for (const e of events) {
    if (!e.start || e.status === 'CANCELLED') continue;
    const len = e.end ? Math.max(0, daysBetween(e.start.date, e.end.date) - (e.start.allDay ? 1 : 0)) : 0;
    // Cerco anche un po' prima di "from" per gli eventi di piu' giorni.
    const dates = e.recId ? (e.start.date >= addDays(from, -len) && e.start.date <= to ? [e.start.date] : []) : occurrences(e.start.date, e.rule, addDays(from, -len), to, new Set(e.ex));
    for (const d of dates) {
      if (!e.recId && e.uid && overrides.has(`${e.uid}|${d}`)) continue;
      for (let k = 0; k <= len; k += 1) {
        const day = addDays(d, k);
        if (day < from || day > to) continue;
        out.push({
          title: e.title || '(senza titolo)',
          where: e.where || '',
          date: day,
          time: e.start.allDay || k > 0 ? null : e.start.time,
          end: e.start.allDay || k < len ? null : e.end?.time || null,
          allDay: e.start.allDay || k > 0,
        });
      }
    }
  }
  return out.sort((a, b) => (a.date + (a.time || '00:00') < b.date + (b.time || '00:00') ? -1 : 1));
}
