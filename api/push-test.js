// "Prova notifica" dalle impostazioni: manda una notifica a tutti i tuoi dispositivi iscritti.
import { verifyUser } from './gemini.js';
import { userDb } from './_lib/fs.js';
import { sendAll } from './_lib/push.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw Object.assign(new Error('Metodo non consentito.'), { status: 405 });
    const user = await verifyUser(req);
    const db = await userDb(user.user_id || user.sub);
    const settings = await db.get('meta/settings');
    const r = await sendAll(settings.push || {}, { title: 'Opifex', body: 'Le notifiche funzionano. Ti avviso prima delle scadenze.', tag: 'test', url: '/' });
    if (r.dropped) await db.patch('meta/settings', { push: r.alive });
    res.status(200).json({ sent: r.sent, devices: r.devices });
  } catch (err) {
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Errore interno.' });
  }
}
