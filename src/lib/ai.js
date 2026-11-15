import { idToken } from './firebase.js';
import { todayStr, weekdayLong, isDone, PRIORITY } from './model.js';

async function call(payload) {
  const token = await idToken();
  let res;
  try {
    res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Assistente non raggiungibile: controlla la connessione.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* risposta non JSON (es. in sviluppo locale l'endpoint non esiste) */
  }
  if (!res.ok || !data) throw new Error(data?.error || "L'assistente non è disponibile in questo momento.");
  return data;
}

// Trasforma un pensiero (testo, foto o audio) in una o piu' proposte di elementi.
export async function captureThought({ text, image, audio, areas }) {
  const today = todayStr();
  const data = await call({
    mode: 'capture',
    text: text || '',
    image: image || null,
    audio: audio || null,
    today,
    weekday: weekdayLong(today),
    areas: areas.map((a) => a.name),
  });
  return Array.isArray(data.items) ? data.items : [];
}

function compactItems(items, areas, limit = 300) {
  const today = todayStr();
  const areaName = Object.fromEntries(areas.map((a) => [a.id, a.name]));
  return items
    .filter((it) => !isDone(it) || (it.doneAt && it.doneAt >= addDaysStr(today, -7)))
    .slice(0, limit)
    .map((it) => ({
      tipo: it.type,
      titolo: it.title,
      area: areaName[it.area] || null,
      importanza: PRIORITY[it.priority]?.label || 'Normale',
      stato: it.someday ? 'un giorno forse' : it.status,
      quando: it.when?.kind === 'asap' ? 'prima possibile' : it.when?.kind === 'date' ? `${it.when.date}${it.when.time ? ' ' + it.when.time : ''}` : null,
      ricorrenza: it.recur || (it.type === 'abitudine' ? it.habit?.mode || 'daily' : null),
      fattoIl: it.doneAt || null,
      umore: it.mood || undefined,
      note: it.notes ? it.notes.slice(0, 200) : undefined,
    }));
}

export async function askAssistant({ question, history, items, areas }) {
  const today = todayStr();
  const data = await call({ mode: 'chat', question, history: history.slice(-8), today, weekday: weekdayLong(today), data: compactItems(items, areas) });
  return data.text || '';
}

const problemPayload = (item, areas) => ({
  title: item.title,
  notes: item.notes || '',
  area: areas.find((a) => a.id === item.area)?.name || '',
});

// Soluzioni per un problema (con ricerca sul web lato server).
export async function solveProblem({ item, areas, items, extra }) {
  const today = todayStr();
  const others = items.filter((it) => it.id !== item.id && (it.type === 'impegno' || it.type === 'abitudine') && !it.someday);
  return call({
    mode: 'solve',
    problem: problemPayload(item, areas),
    extra: extra || '',
    today,
    weekday: weekdayLong(today),
    data: compactItems(others, areas, 120),
  });
}

// Trasforma la soluzione scelta in impegni e oggetti da proporre.
export async function planSolution({ item, solution, areas, items, extra }) {
  const today = todayStr();
  const others = items.filter((it) => it.id !== item.id && (it.type === 'impegno' || it.type === 'abitudine') && !it.someday);
  const data = await call({
    mode: 'plan',
    problem: problemPayload(item, areas),
    solution,
    extra: extra || '',
    areas: areas.map((a) => a.name),
    today,
    weekday: weekdayLong(today),
    data: compactItems(others, areas, 120),
  });
  return Array.isArray(data.items) ? data.items : [];
}

function addDaysStr(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/* ---------- media ---------- */
export function fileToResizedJpeg(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ mime: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.82).split(',')[1] });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Non riesco a leggere questa immagine.'));
    };
    img.src = url;
  });
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error("Non riesco a leggere l'audio."));
    r.readAsDataURL(blob);
  });
}
