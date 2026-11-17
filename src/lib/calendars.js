// Eventi dei calendari Apple/esterni (sola lettura), letti dal server e tenuti in memoria qualche minuto.
import { useEffect, useState } from 'react';
import { cloudEnabled, idToken } from './firebase.js';

export const CAL_COLORS = ['#a78bfa', '#5be3a1', '#ff8a5b', '#f472b6', '#facc15'];
const cache = new Map();

export function useExternalEvents(calendars, from, to) {
  const list = (calendars || []).filter((c) => c?.url && c.on !== false);
  const key = `${from}|${to}|${list.map((c) => c.id + c.url).join(',')}`;
  const [state, setState] = useState(() => cache.get(key)?.data || { events: [], errors: [] });
  useEffect(() => {
    if (!cloudEnabled || !list.length) {
      setState({ events: [], errors: [] });
      return undefined;
    }
    const hit = cache.get(key);
    if (hit) setState(hit.data);
    if (hit && hit.at > Date.now() - 5 * 60000) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${await idToken()}` },
          body: JSON.stringify({ from, to, calendars: list.map((c) => ({ id: c.id, url: c.url })) }),
        });
        const data = await res.json().catch(() => ({}));
        const out = res.ok ? { events: data.events || [], errors: data.errors || [] } : { events: [], errors: [{ error: data.error || 'Calendari non raggiungibili.' }] };
        cache.set(key, { at: Date.now(), data: out });
        if (alive) setState(out);
      } catch {
        if (alive) setState((s) => ({ ...s, errors: [{ error: 'Calendari non raggiungibili.' }] }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const byId = Object.fromEntries(list.map((c, i) => [c.id, { ...c, color: c.color || CAL_COLORS[i % CAL_COLORS.length] }]));
  return { ...state, events: state.events.filter((e) => byId[e.cal]).map((e) => ({ ...e, calendar: byId[e.cal] })) };
}
