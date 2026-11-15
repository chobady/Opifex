// Configurazione Firebase "fissa" nel codice.
// Se e' null, Opifex la legge dalla variabile d'ambiente VITE_FIREBASE_CONFIG su Vercel.
// La configurazione web di Firebase non e' un segreto: la protezione vera sono le regole di Firestore.
export const COMMITTED_FIREBASE_CONFIG = {
  apiKey: "AIzaSyC_4XjmfwxZGSgEy4W1X0i7pTjasDyoszs",
  authDomain: "opifex-5d153.firebaseapp.com",
  projectId: "opifex-5d153",
  storageBucket: "opifex-5d153.firebasestorage.app",
  messagingSenderId: "37572089993",
  appId: "1:37572089993:web:f10934e8cdf9c71c18ce58",
};
