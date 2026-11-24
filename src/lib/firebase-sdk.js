import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig, cloudEnabled } from './firebase.js';

let app = null;
export let auth = null;
export let db = null;

if (cloudEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  }
}

export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const login = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const register = (email, pass) => createUserWithEmailAndPassword(auth, email, pass);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const logout = () => signOut(auth);
export const idToken = async () => (auth?.currentUser ? auth.currentUser.getIdToken() : null);


/* ---------- dati su Firestore ---------- */
const clean = (obj) => JSON.parse(JSON.stringify(obj));
export const cloudStore = {
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
  // Le foto stanno in documenti separati (max ~1 MB ciascuno), cosi' la lista resta leggera.
  savePhoto: (uid, id, data) => setDoc(doc(db, 'users', uid, 'photos', id), { data, at: Date.now() }),
  getPhoto: async (uid, id) => (await getDoc(doc(db, 'users', uid, 'photos', id))).data()?.data || null,
  removePhoto: (uid, id) => deleteDoc(doc(db, 'users', uid, 'photos', id)),
};

