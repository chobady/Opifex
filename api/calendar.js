// Eventi dei calendari esterni (iCloud pubblico, Google, Outlook) in sola lettura, per l'utente collegato.
import { verifyUser, readBody } from './gemini.js';
import { parseIcs } from './_lib/ics.js';

const HOSTS = [/\.icloud\.com$/i, /^calendar\.google\.com$/i, /^outlook\.(live|office365)\.com$/i, /^outlook\.office\.com$/i];
const cache = new Map();

function cleanUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || '').trim().replace(/^webcals?:\/\//i, 'https://'));
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !HOSTS.some((h) => h.test(u.hostname))) return null;
  return u.toString();
}

async function fetchIcs(url) {
  const hit = cache.get(url);
  if (hit && hit.at > Date.now() - 10 * 60000) return hit.text;
  const res = await fetch(url, { headers: { accept: 'text/calendar, */*' }, redirect: 'follow' });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Non è un calendario.');
  cache.set(url, { at: Date.now(), text });
  return text;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    if (req.method !== 'POST') throw Object.assign(new Error('Metodo non consentito.'), { status: 405 });
    await verifyUser(req);
    const body = await readBody(req);
    const re = /^\d{4}-\d{2}-\d{2}$/;
    const from = re.test(body.from) ? body.from : null;
    const to = re.test(body.to) ? body.to : null;
    if (!from || !to || to < from) throw Object.assign(new Error('Intervallo non valido.'), { status: 400 });
    const cals = (Array.isArray(body.calendars) ? body.calendars : []).slice(0, 8);
    const events = [];
    const errors = [];
    await Promise.all(
      cals.map(async (c) => {
        const url = cleanUrl(c?.url);
        if (!url) {
          errors.push({ id: c?.id, error: 'Indirizzo non valido (serve il link pubblico di iCloud, Google o Outlook).' });
          return;
        }
        try {
          const list = parseIcs(await fetchIcs(url), from, to);
          list.forEach((e) => events.push({ ...e, cal: c.id }));
        } catch (e) {
          errors.push({ id: c.id, error: e.status === 404 ? 'Calendario non trovato: il link pubblico è ancora attivo?' : `Non riesco a leggerlo (${e.message}).` });
        }
      }),
    );
    res.status(200).json({ events: events.slice(0, 2000), errors });
  } catch (err) {
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Errore interno.' });
  }
}
