// Notifiche push: iscrizione del dispositivo e prova.
import { VAPID_PUBLIC_KEY } from '../../shared/push.js';
import { idToken } from './firebase.js';

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function keyBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function hash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf).slice(0, 10), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Chiede il permesso (va chiamata dal tocco di un pulsante) e restituisce {id, sub} da salvare.
export async function subscribePush() {
  if (!pushSupported()) throw new Error(isIOS() && !isStandalone() ? 'Su iPhone apri Opifex dall’icona sulla schermata Home, non da Safari.' : 'Questo browser non supporta le notifiche.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permesso negato. Puoi riattivarlo nelle Impostazioni dell’iPhone, alla voce Notifiche → Opifex.');
  const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
  const json = sub.toJSON();
  const id = await hash(json.endpoint);
  return { id, sub: { endpoint: json.endpoint, keys: json.keys, device: isIOS() ? 'iPhone' : navigator.platform || 'computer', at: Date.now() } };
}

export async function currentPushId() {
  if (!pushSupported() || Notification.permission !== 'granted') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? hash(sub.endpoint) : null;
}

export async function testPush() {
  const token = await idToken();
  const res = await fetch('/api/push-test', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Prova non riuscita.');
  return data;
}
