// Aggiunge (o aggiorna) una persona da Comandi Rapidi: "Seleziona contatto" → POST {token, name, phone, email}.
import { readBody } from './gemini.js';
import { fail, sameSecret, userDb, ownerUid } from './_lib/fs.js';
import { newItem } from '../src/lib/model.js';

export default async function handler(req, res) {
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  try {
    if (req.method !== 'POST') throw fail(405, 'Metodo non consentito.');
    const body = await readBody(req);
    if (!sameSecret(req.headers['x-opifex-token'] || body.token, process.env.CAPTURE_TOKEN)) throw fail(401, 'Codice non valido.');
    const one = (v) => String(Array.isArray(v) ? v[0] || '' : v || '').trim();
    const name = one(body.name).slice(0, 80);
    if (!name) throw fail(400, 'Manca il nome del contatto.');
    const phone = one(body.phone).slice(0, 40);
    const email = one(body.email).slice(0, 120);
    const db = await userDb(ownerUid());
    const people = (await db.list('items')).filter((it) => it.type === 'persona');
    const same = people.find((p) => (p.title || '').trim().toLowerCase() === name.toLowerCase());
    if (same) {
      await db.patch(`items/${same.id}`, { phone: phone || same.phone || '', email: email || same.email || '', updatedAt: Date.now() });
      res.status(200).send(`Aggiornato: ${name}`);
      return;
    }
    const p = newItem({ type: 'persona', title: name, phone, email });
    await db.put(`items/${p.id}`, p);
    res.status(200).send(`Aggiunto a Opifex: ${name}`);
  } catch (err) {
    if (!err.status) console.error(err);
    res.status(err.status || 500).send(err.status ? err.message : 'Errore interno.');
  }
}
