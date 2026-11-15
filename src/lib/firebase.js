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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { parseFirebaseConfig } from '../../shared/parseConfig.js';
import { COMMITTED_FIREBASE_CONFIG } from '../../shared/firebase.committed.js';

export const firebaseConfig =
  parseFirebaseConfig(COMMITTED_FIREBASE_CONFIG) ||
  parseFirebaseConfig(import.meta.env.VITE_FIREBASE_CONFIG);

export const cloudEnabled = !!firebaseConfig;

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

export function authErrorMessage(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Email o password non corretti.';
  if (code.includes('email-already-in-use')) return 'Esiste già un account con questa email. Prova ad accedere.';
  if (code.includes('weak-password')) return 'La password deve avere almeno 6 caratteri.';
  if (code.includes('invalid-email')) return "L'indirizzo email non sembra valido.";
  if (code.includes('too-many-requests')) return 'Troppi tentativi. Aspetta qualche minuto e riprova.';
  if (code.includes('network')) return 'Connessione assente. Controlla la rete e riprova.';
  if (code.includes('operation-not-allowed'))
    return 'Il login con email e password non è attivo nel progetto Firebase (vedi README, passo 3).';
  return 'Qualcosa non ha funzionato. Riprova.';
}
