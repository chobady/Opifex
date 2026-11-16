// Invio delle notifiche push con le chiavi VAPID.
import webpush from 'web-push';
import { VAPID_PUBLIC_KEY } from '../../shared/push.js';
import { fail } from './fs.js';

let ready = false;
function setup() {
  if (ready) return;
  const priv = (process.env.VAPID_PRIVATE_KEY || '').trim();
  if (!priv) throw fail(500, 'Manca VAPID_PRIVATE_KEY su Vercel.');
  webpush.setVapidDetails(`mailto:${process.env.OWNER_EMAIL || 'opifex@example.com'}`, VAPID_PUBLIC_KEY, priv);
  ready = true;
}

// Manda a tutti i dispositivi registrati; restituisce quanti hanno ricevuto e le iscrizioni ancora valide.
export async function sendAll(subsMap, payload) {
  setup();
  const entries = Object.entries(subsMap || {}).filter(([, s]) => s?.endpoint && s?.keys?.p256dh && s?.keys?.auth);
  const alive = {};
  let sent = 0;
  let dropped = 0;
  for (const [id, sub] of entries) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
      alive[id] = sub;
      sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) dropped += 1;
      else {
        console.error('push error', err.statusCode, String(err.body || err.message).slice(0, 200));
        alive[id] = sub;
      }
    }
  }
  return { sent, dropped, alive, devices: entries.length };
}
