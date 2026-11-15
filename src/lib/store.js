// Livello dati: Firestore quando Firebase e' configurato, altrimenti localStorage
// (modalita' locale: utile per provare l'app prima di collegare Firebase).
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { cloudEnabled, db } from './firebase.js';

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
};

/* ---------- cloud ---------- */
const cloudStore = {
  subscribe(uid, cb, onError) {
    const state = { items: [], areas: [], settings: {}, got: { items: false, areas: false, settings: false } };
    const push = () =>
      cb({
        items: state.items,
        areas: state.areas,
        settings: state.settings,
        ready: state.got.items && state.got.areas && state.got.settings,
      });
    const fail = (err) => onError && onError(err);
    const u1 = onSnapshot(
      collection(db, 'users', uid, 'items'),
      (snap) => {
        state.items = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        state.got.items = true;
        push();
      },
      fail,
    );
    const u2 = onSnapshot(
      collection(db, 'users', uid, 'areas'),
      (snap) => {
        state.areas = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        state.got.areas = true;
        push();
      },
      fail,
    );
    const u3 = onSnapshot(
      doc(db, 'users', uid, 'meta', 'settings'),
      (snap) => {
        state.settings = snap.data() || {};
        state.got.settings = true;
        push();
      },
      fail,
    );
    return () => {
      u1();
      u2();
      u3();
    };
  },
  saveItem: (uid, item) => setDoc(doc(db, 'users', uid, 'items', item.id), clean(item)),
  removeItem: (uid, id) => deleteDoc(doc(db, 'users', uid, 'items', id)),
  saveArea: (uid, area) => setDoc(doc(db, 'users', uid, 'areas', area.id), clean(area)),
  removeArea: (uid, id) => deleteDoc(doc(db, 'users', uid, 'areas', id)),
  saveSettings: (uid, patch) => setDoc(doc(db, 'users', uid, 'meta', 'settings'), clean(patch), { merge: true }),
};

export const store = cloudEnabled ? cloudStore : localStore;
