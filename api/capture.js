// Cattura da Comandi Rapidi: riceve un testo dettato, lo fa ordinare a Gemini e lo salva
// direttamente nel tuo Firestore. Protetto da un codice segreto (CAPTURE_TOKEN).
// Variabili su Vercel: CAPTURE_TOKEN, OWNER_UID, FIREBASE_SERVICE_ACCOUNT, GEMINI_API_KEY.
import { timingSafeEqual } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';
import { handleCapture, readBody } from './gemini.js';
import { newItem, uid } from '../src/lib/model.js';

const TZ = 'Europe/Rome';

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function sameSecret(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw fail(500, 'Manca FIREBASE_SERVICE_ACCOUNT su Vercel.');
  try {
    const sa = JSON.parse(raw);
    if (!sa.client_email || !sa.private_key || !sa.project_id) throw new Error('incompleto');
    return { ...sa, private_key: String(sa.private_key).replace(/\\n/g, '\n') };
  } catch {
    throw fail(500, 'FIREBASE_SERVICE_ACCOUNT non è un JSON valido.');
  }
}

async function accessToken(sa) {
  const key = await importPKCS8(sa.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3000)
    .sign(key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw fail(502, 'Non riesco ad accedere a Firebase con la chiave di servizio.');
  return data.access_token;
}

const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)])) } };
};

async function listAreas(base, token, uidValue) {
  const res = await fetch(`${base}/users/${uidValue}/areas?pageSize=200`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw fail(502, 'Non riesco a leggere le tue aree.');
  const data = await res.json();
  return (data.documents || []).map((d) => ({ id: d.name.split('/').pop(), name: d.fields?.name?.stringValue || '' })).filter((a) => a.name);
}

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
    const owner = (process.env.OWNER_UID || '').trim();
    if (!owner) throw fail(500, 'Manca OWNER_UID su Vercel.');
    const text = String(body.text || url.searchParams.get('text') || '').trim();
    if (!text) throw fail(400, 'Non ho sentito niente.');

    const sa = serviceAccount();
    const token = await accessToken(sa);
    const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
    const areas = await listAreas(base, token, owner);
    const now = new Date();
    const today = now.toLocaleDateString('sv-SE', { timeZone: TZ });
    const weekday = now.toLocaleDateString('it-IT', { weekday: 'long', timeZone: TZ });

    const { items: drafts } = await handleCapture({ text, today, weekday, areas: areas.map((a) => a.name) });
    if (!drafts.length) throw fail(422, 'Non sono riuscito a capire cosa creare.');
    const created = drafts.map((d) => draftToItem(d, areas));
    for (const it of created) {
      const fields = Object.fromEntries(Object.entries(it).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)]));
      const r = await fetch(`${base}/users/${owner}/items/${it.id}`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!r.ok) throw fail(502, 'Non sono riuscito a salvare in Opifex.');
    }
    const label = (it) => `${it.title}${it.area ? ` (${areas.find((a) => a.id === it.area)?.name})` : ''}`;
    res.status(200).send(created.length === 1 ? `Creato: ${label(created[0])}` : `Creati ${created.length}: ${created.map(label).join('; ')}`);
  } catch (err) {
    if (!err.status) console.error(err);
    res.status(err.status || 500).send(err.status ? err.message : 'Errore interno.');
  }
}
