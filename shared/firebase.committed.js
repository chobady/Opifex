// Configurazione Firebase "fissa" nel codice.
// Se e' null, Opifex la legge dalla variabile d'ambiente VITE_FIREBASE_CONFIG su Vercel.
// La configurazione web di Firebase non e' un segreto: la protezione vera sono le regole di Firestore.
export const COMMITTED_FIREBASE_CONFIG = null;
