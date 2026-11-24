// Parte leggera di Firebase: configurazione e funzioni che caricano l'SDK
// (Auth + Firestore, ~900 KB) solo quando serve, cosi' la Home si apre subito.
import { parseFirebaseConfig } from '../../shared/parseConfig.js';
import { COMMITTED_FIREBASE_CONFIG } from '../../shared/firebase.committed.js';

export const firebaseConfig =
  parseFirebaseConfig(COMMITTED_FIREBASE_CONFIG) ||
  parseFirebaseConfig(import.meta.env.VITE_FIREBASE_CONFIG);

export const cloudEnabled = !!firebaseConfig;

let sdk = null;
export const loadFirebase = () => (sdk ||= import('./firebase-sdk.js'));

// Ultimo utente entrato: permette di mostrare subito l'app mentre l'SDK si carica.
const USER_KEY = 'opifex.user.v1';
export function lastUser() {
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return u && u.uid ? u : null;
  } catch {
    return null;
  }
}
function rememberUser(u) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify({ uid: u.uid, email: u.email || null }));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage non disponibile */
  }
}

export function onAuth(cb) {
  let off = null;
  let stopped = false;
  loadFirebase().then((m) => {
    if (stopped) return;
    off = m.onAuth((u) => {
      rememberUser(u);
      cb(u ? { uid: u.uid, email: u.email || null } : null);
    });
  });
  return () => {
    stopped = true;
    if (off) off();
  };
}
export const login = async (email, pass) => (await loadFirebase()).login(email, pass);
export const register = async (email, pass) => (await loadFirebase()).register(email, pass);
export const resetPassword = async (email) => (await loadFirebase()).resetPassword(email);
export const logout = async () => {
  rememberUser(null);
  try {
    localStorage.removeItem('opifex.cache.v1');
  } catch {
    /* niente */
  }
  return (await loadFirebase()).logout();
};
export const idToken = async () => (cloudEnabled ? (await loadFirebase()).idToken() : null);

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
