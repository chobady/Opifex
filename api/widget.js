// Dati per il widget (Scriptable su iPhone, visibile anche sul Mac). Protetto da CAPTURE_TOKEN.
import { fail, sameSecret, userDb, ownerUid, romeNow } from './_lib/fs.js';
import { stageStats, isDone, isDueToday, isOverdue, sortItems, habitScheduled, doneOn } from '../src/lib/model.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  try {
    const url = new URL(req.url, 'http://x');
    if (!sameSecret(req.headers['x-opifex-token'] || url.searchParams.get('token'), process.env.CAPTURE_TOKEN)) throw fail(401, 'Codice non valido.');
    const db = await userDb(ownerUid());
    const [items, settings] = await Promise.all([db.list('items'), db.get('meta/settings')]);
    const { date: today, time } = romeNow();
    const st = stageStats(items, today);
    const pick = (it) => ({ title: it.title, priority: it.priority || 'normale', time: it.when?.time || null, late: isOverdue(it, today), status: it.status });
    const open = items.filter((it) => it.type === 'impegno' && !it.someday && !isDone(it));
    const focus = sortItems(open.filter((it) => it.focusDate === today));
    const next = sortItems(open.filter((it) => isDueToday(it, today) && it.focusDate !== today));
    const habits = items.filter((it) => it.type === 'abitudine' && !it.someday && habitScheduled(it, today));
    res.status(200).json({
      today,
      time,
      theme: settings.theme || 'neon',
      rings: ['todo', 'doing', 'done'].map((k) => st[k].map((it) => it.priority || 'normale')),
      total: st.total,
      done: st.done.length,
      focus: focus.slice(0, 3).map(pick),
      next: next.slice(0, 6).map(pick),
      habits: { done: habits.filter((h) => doneOn(h, today)).length, total: habits.length },
      morning: settings.morning?.date === today ? settings.morning.text : null,
    });
  } catch (err) {
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Errore interno.' });
  }
}
