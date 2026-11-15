# Opifex

App personale per gestire impegni, obiettivi, problemi e cose da comprare.
Scura, neon, con gli anelli. Funziona su iPhone e computer.

**Stato: fase 1 (base).** Ci sono: cattura rapida con assistente, anelli di oggi, focus,
calendario (settimana e agenda), bacheca kanban, aree con icone, spazi per obiettivi /
abitudini / problemi / oggetti / inbox, collegamenti tra elementi, chat con l'assistente,
suoni e animazioni. In arrivo: notifiche iPhone, calendario Apple, traguardi, statistiche,
diario, collegamento con Salvadanaio.

## Come metterla online (una volta sola)

Finché Firebase non è collegato l'app funziona in **modalità locale**: i dati restano
solo sul dispositivo e l'assistente è spento. Puoi provarla subito dopo il passo 1.

### 1. Vercel
1. Vai su vercel.com → **Add New… → Project**.
2. Scegli il repository **Opifex** → **Import** → **Deploy**. Non serve toccare altro.

### 2. Firebase: crea il progetto
1. Vai su console.firebase.google.com → **Aggiungi progetto** → nome `opifex` → avanti fino alla fine
   (Google Analytics non serve).
2. Nella pagina del progetto clicca l'icona **`</>`** (app web) → nome `opifex` → **Registra app**.
3. Compare un blocco di codice con `const firebaseConfig = { ... }`.
   **Copia tutto il pezzo tra le graffe, graffe comprese.** Ti serve al passo 5.

### 3. Firebase: accendi il login
1. Menu a sinistra → **Authentication** → **Inizia**.
2. Scheda **Metodo di accesso** → **Email/password** → attiva il primo interruttore → **Salva**.

### 4. Firebase: accendi il database
1. Menu a sinistra → **Firestore Database** → **Crea database**.
2. Posizione: una europea (es. `europe-west1`) → **modalità di produzione** → **Crea**.
3. Scheda **Regole** → cancella tutto, incolla il contenuto del file `firestore.rules`
   di questo repository → **Pubblica**.

### 5. Vercel: le tre variabili
Su Vercel apri il progetto → **Settings → Environment Variables** e aggiungi:

| Nome | Valore |
| --- | --- |
| `VITE_FIREBASE_CONFIG` | il pezzo `{ apiKey: "...", ... }` copiato al passo 2 |
| `GEMINI_API_KEY` | la chiave Gemini (la stessa di Dimmispensa va bene) |
| `OWNER_EMAIL` | la tua email di accesso: solo quell'account potrà usare l'assistente |

Poi **Deployments → i tre puntini sull'ultimo → Redeploy**.

### 6. Primo accesso
Apri l'app → **Prima volta? Crea il tuo account** → email e password (almeno 6 caratteri).
Da quel momento usi le stesse credenziali su tutti i dispositivi.

### 7. iPhone
Apri l'app in **Safari** → tasto **Condividi** → **Aggiungi a Home**.
Usala sempre dall'icona: servirà anche per le notifiche.

## Note tecniche
- Vite + React, Firebase (Auth + Firestore), funzione serverless `api/gemini.js` su Vercel.
- La chiave Gemini resta solo sul server. Il modello predefinito è `gemini-3.6-flash`;
  si può cambiare con la variabile `GEMINI_MODEL`.
- Sviluppo: `npm install`, poi `npm run dev` (modalità locale, senza assistente).
