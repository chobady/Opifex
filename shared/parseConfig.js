// Accetta sia JSON vero sia il pezzo "const firebaseConfig = { apiKey: "...", ... }"
// copiato cosi' com'e' dalla console di Firebase.
export function parseFirebaseConfig(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw.apiKey && raw.projectId ? raw : null;
  const out = {};
  const re = /["']?(\w+)["']?\s*:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(String(raw)))) out[m[1]] = m[2];
  return out.apiKey && out.projectId ? out : null;
}
