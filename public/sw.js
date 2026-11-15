// Service worker minimo: serve a rendere Opifex installabile e, piu' avanti, a ricevere le notifiche.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
