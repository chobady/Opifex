// Livello dati: Firestore quando Firebase e' configurato, altrimenti localStorage
// (modalita' locale: utile per provare l'app prima di collegare Firebase).
import { cloudEnabled, loadFirebase } from './firebase.js';

const LOCAL_KEY = 'opifex.local.v1';

const clean = (obj) => JSON.parse(JSON.stringify(obj));

/* ---------- locale ---------- */
const listeners = new Set();
function readLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    return { items: raw.items || {}, areas: raw.areas || {}, settings: raw.settings || {} };
  } catch {
    return { items: {}, areas: {}, settings: {} };
  }
}
function writeLocal(next) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    /* spazio pieno o storage non disponibile: i dati restano in memoria */
  }
  memory = next;
  emitLocal();
}
let memory = readLocal();
function emitLocal() {
  const snap = {
    items: Object.values(memory.items),
    areas: Object.values(memory.areas),
    settings: memory.settings,
    ready: true,
  };
  listeners.forEach((cb) => cb(snap));
}

const localStore = {
  subscribe(_uid, cb) {
    listeners.add(cb);
    emitLocal();
    return () => listeners.delete(cb);
  },
  async saveItem(_uid, item) {
    writeLocal({ ...memory, items: { ...memory.items, [item.id]: clean(item) } });
  },
  async removeItem(_uid, id) {
    const items = { ...memory.items };
    delete items[id];
    writeLocal({ ...memory, items });
  },
  async saveArea(_uid, area) {
    writeLocal({ ...memory, areas: { ...memory.areas, [area.id]: clean(area) } });
  },
  async removeArea(_uid, id) {
    const areas = { ...memory.areas };
    delete areas[id];
    writeLocal({ ...memory, areas });
  },
  async saveSettings(_uid, patch) {
    writeLocal({ ...memory, settings: { ...memory.settings, ...patch } });
  },
  async savePhoto(_uid, id, data) {
    const all = readPhotos();
    all[id] = data;
    localStorage.setItem(PHOTO_KEY, JSON.stringify(all));
  },
  async getPhoto(_uid, id) {
    return readPhotos()[id] || null;
  },
  async removePhoto(_uid, id) {
    const all = readPhotos();
    delete all[id];
    localStorage.setItem(PHOTO_KEY, JSON.stringify(all));
  },
};
const PHOTO_KEY = 'opifex.photos.v1';
function readPhotos() {
  try {
    return JSON.parse(localStorage.getItem(PHOTO_KEY) || '{}');
  } catch {
    return {};
  }
}

/* ---------- cloud ---------- */
// L'SDK di Firestore arriva dopo: intanto mostro l'ultima copia salvata sul telefono
// (con ready: false, cosi' nessun calcolo automatico scrive dati vecchi).
const CACHE_KEY = 'opifex.cache.v1';
function readCache(uid) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return c && c.uid === uid ? c : null;
  } catch {
    return null;
  }
}
let cacheTimer = null;
function writeCache(uid, snap) {
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ uid, items: snap.items, areas: snap.areas, settings: snap.settings }));
    } catch {
      /* spazio pieno: pazienza, la prossima apertura sara' solo un po' piu' lenta */
    }
  }, 800);
}
const cloud = () => loadFirebase().then((m) => m.cloudStore);
const lazyStore = {
  subscribe(uid, cb, onError) {
    const cached = readCache(uid);
    if (cached) cb({ items: cached.items || [], areas: cached.areas || [], settings: cached.settings || {}, ready: false, cached: true });
    let off = null;
    let stopped = false;
    cloud().then((cs) => {
      if (stopped) return;
      off = cs.subscribe(
        uid,
        (snap) => {
          if (!snap.ready && cached) return; // finche' Firestore non ha tutto, tengo la copia
          cb(snap);
          if (snap.ready) writeCache(uid, snap);
        },
        onError,
      );
    });
    return () => {
      stopped = true;
      if (off) off();
    };
  },
};
for (const k of ['saveItem', 'removeItem', 'saveArea', 'removeArea', 'saveSettings', 'savePhoto', 'getPhoto', 'removePhoto'])
  lazyStore[k] = (...args) => cloud().then((cs) => cs[k](...args));

export const store = cloudEnabled ? lazyStore : localStore;
