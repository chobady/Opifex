// Cattura da Comandi Rapidi: riceve un testo dettato, lo fa ordinare a Gemini e lo salva
// direttamente nel tuo Firestore. Protetto da un codice segreto (CAPTURE_TOKEN).
// Variabili su Vercel: CAPTURE_TOKEN, OWNER_UID, FIREBASE_SERVICE_ACCOUNT, GEMINI_API_KEY.
import { handleCapture, readBody } from './gemini.js';
import { newItem, uid } from '../src/lib/model.js';
import { fail, sameSecret, userDb, ownerUid, romeNow, TZ } from './_lib/fs.js';

function draftToItem(d, areas) {
  const area = areas.find((a) => a.name.toLowerCase() === String(d.area || '').toLowerCase());
  const habit = d.type === 'abitudine';
  const mode = d.recur === 'weekdays' ? 'weekdays' : d.recur === 'weekly' || d.recur === 'monthly' ? 'times' : 'daily';
  return newItem({
    type: d.type,
    title: d.title,
    notes: d.notes || '',
    area: area?.id || null,
    priority: d.priority,
    when: habit ? { kind: 'none', date: null, time: null } : { kind: d.whenKind, date: d.date || null, time: d.time || null },
    recur: habit ? '' : d.recur || '',
    habit: habit ? { mode, perWeek: mode === 'times' ? 1 : 3 } : null,
    checklist: (d.checklist || []).map((t) => ({ id: uid(), t, done: false })),
    price: d.price || '',
  });
}

export default async function handler(req, res) {
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  try {
    if (req.method !== 'POST' && req.method !== 'GET') throw fail(405, 'Metodo non consentito.');
    const body = req.method === 'POST' ? await readBody(req) : {};
    const url = new URL(req.url, 'http://x');
    const given = req.headers['x-opifex-token'] || body.token || url.searchParams.get('token');
    if (!sameSecret(given, process.env.CAPTURE_TOKEN)) throw fail(401, 'Codice non valido.');
    const owner = ownerUid();
    const text = String(body.text || url.searchParams.get('text') || '').trim();
    if (!text) throw fail(400, 'Non ho sentito niente.');

    const db = await userDb(owner);
    const areas = (await db.list('areas')).filter((a) => a.name);
    const { date: today } = romeNow();
    const weekday = new Date().toLocaleDateString('it-IT', { weekday: 'long', timeZone: TZ });

    const { items: drafts } = await handleCapture({ text, today, weekday, areas: areas.map((a) => a.name) });
    if (!drafts.length) throw fail(422, 'Non sono riuscito a capire cosa creare.');
    const created = drafts.map((d) => draftToItem(d, areas));
    for (const it of created) await db.put(`items/${it.id}`, it);
    const label = (it) => `${it.title}${it.area ? ` (${areas.find((a) => a.id === it.area)?.name})` : ''}`;
    res.status(200).send(created.length === 1 ? `Creato: ${label(created[0])}` : `Creati ${created.length}: ${created.map(label).join('; ')}`);
  } catch (err) {
    if (!err.status) console.error(err);
    res.status(err.status || 500).send(err.status ? err.message : 'Errore interno.');
  }
}
