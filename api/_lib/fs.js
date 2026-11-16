// Accesso al Firestore di Opifex dal server, con la chiave di servizio (FIREBASE_SERVICE_ACCOUNT).
import { timingSafeEqual } from 'node:crypto';
import { SignJWT, importPKCS8 } from 'jose';

export const TZ = 'Europe/Rome';

export function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function sameSecret(a, b) {
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

let cached = null;
async function accessToken(sa) {
  if (cached && cached.exp > Date.now() + 60000) return cached.token;
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
  cached = { token: data.access_token, exp: Date.now() + 3000 * 1000 };
  return cached.token;
}

export const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: encFields(v) } };
};
export const encFields = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)]));

export function dec(v) {
  if (!v || 'nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return decFields(v.mapValue.fields || {});
  return null;
}
export const decFields = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, x]) => [k, dec(x)]));

// Piccolo client REST per i documenti di un utente.
export async function userDb(uid) {
  const sa = serviceAccount();
  const token = await accessToken(sa);
  const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/users/${uid}`;
  const auth = { authorization: `Bearer ${token}` };
  async function list(coll) {
    const out = [];
    let page = '';
    for (let i = 0; i < 20; i += 1) {
      const res = await fetch(`${base}/${coll}?pageSize=300${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`, { headers: auth });
      if (!res.ok) throw fail(502, `Non riesco a leggere ${coll} da Firebase.`);
      const data = await res.json();
      for (const d of data.documents || []) out.push({ id: d.name.split('/').pop(), ...decFields(d.fields) });
      if (!data.nextPageToken) break;
      page = data.nextPageToken;
    }
    return out;
  }
  async function get(path) {
    const res = await fetch(`${base}/${path}`, { headers: auth });
    if (res.status === 404) return {};
    if (!res.ok) throw fail(502, 'Non riesco a leggere da Firebase.');
    return decFields((await res.json()).fields);
  }
  // Scrive solo i campi indicati (gli altri restano come sono).
  async function patch(path, obj) {
    const mask = Object.keys(obj)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');
    const res = await fetch(`${base}/${path}?${mask}`, {
      method: 'PATCH',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ fields: encFields(obj) }),
    });
    if (!res.ok) throw fail(502, 'Non sono riuscito a salvare in Firebase.');
  }
  async function put(path, obj) {
    const res = await fetch(`${base}/${path}`, {
      method: 'PATCH',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ fields: encFields(obj) }),
    });
    if (!res.ok) throw fail(502, 'Non sono riuscito a salvare in Opifex.');
  }
  return { list, get, patch, put };
}

export function ownerUid() {
  const owner = (process.env.OWNER_UID || '').trim();
  if (!owner) throw fail(500, 'Manca OWNER_UID su Vercel.');
  return owner;
}

// Data e ora attuali a Roma.
export function romeNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// "2026-11-16" + "10:00" a Roma -> millisecondi.
export function romeToMs(date, time = '00:00') {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const shown = romeNow(new Date(guess));
  const [sy, sm, sd] = shown.date.split('-').map(Number);
  const [sh, smin] = shown.time.split(':').map(Number);
  const offset = Date.UTC(sy, sm - 1, sd, sh, smin) - guess;
  return guess - offset;
}
