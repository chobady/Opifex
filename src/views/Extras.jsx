import { useMemo, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { ItemRow } from '../components/ItemRow.jsx';
import { Empty, SectionTitle, Progress } from '../components/ui.jsx';
import { BADGES } from '../lib/badges.js';
import {
  TYPES, newItem, longDate, shortDate, addDays, startOfWeek, weekdayLong, fromStr, doneEvents, habitStreak, habitRate, goalProgress,
  isDone, isOverdue, parsePrice, money, diffDays, PRIORITIES,
} from '../lib/model.js';

export function SubHeader({ title, kicker = 'Spazi', onBack, onAdd, addLabel = 'Nuovo' }) {
  return (
    <header className="topbar">
      <button className="icon-btn boxed" aria-label="Indietro" onClick={onBack}>
        <Icon name="ChevronLeft" />
      </button>
      <div className="brand grow">
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
      </div>
      {onAdd && (
        <button className="btn primary" onClick={onAdd}>
          <Icon name="Plus" size={18} />
          {addLabel}
        </button>
      )}
    </header>
  );
}

/* ---------- un giorno, forse ---------- */
export function Someday({ onBack }) {
  const { items, actions } = useApp();
  const list = items.filter((it) => it.someday && it.type !== 'diario');
  const groups = Object.keys(TYPES)
    .map((t) => ({ type: t, list: list.filter((it) => it.type === t) }))
    .filter((g) => g.list.length);
  return (
    <div className="view spaces">
      <SubHeader title="Un giorno, forse" onBack={onBack} onAdd={() => actions.create({ someday: true })} />
      <p className="sheet-intro">Idee e desideri senza fretta. Non compaiono in Oggi né in Bacheca: quando sei pronto li riattivi.</p>
      {groups.map((g) => (
        <section key={g.type}>
          <SectionTitle right={<span className="section-note">{g.list.length}</span>}>{TYPES[g.type].plural}</SectionTitle>
          <div className="list">
            {g.list.map((it) => (
              <div key={it.id} className="with-action">
                <ItemRow item={it} />
                <button
                  className="icon-btn boxed"
                  aria-label={`Riattiva: ${it.title}`}
                  onClick={() => {
                    sfx.reply();
                    actions.save({ ...it, someday: false });
                    actions.toast('Riattivato.');
                  }}
                >
                  <Icon name="Undo2" size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
      {!list.length && (
        <Empty
          icon="Hourglass"
          title="Nessuna idea in attesa"
          text="Nell’editor di qualsiasi elemento scegli “Un giorno, forse” per parcheggiarlo qui."
          action={
            <button className="btn primary" onClick={() => actions.create({ someday: true })}>
              <Icon name="Plus" size={18} />
              Aggiungi un’idea
            </button>
          }
        />
      )}
    </div>
  );
}

/* ---------- diario ---------- */
const MOODS = [
  { v: 1, icon: 'Frown', label: 'Giornata dura' },
  { v: 2, icon: 'Meh', label: 'Così così' },
  { v: 3, icon: 'Smile', label: 'Bene' },
  { v: 4, icon: 'Laugh', label: 'Molto bene' },
  { v: 5, icon: 'Sparkles', label: 'Splendida' },
];

export function Diary({ onBack }) {
  const { items, actions, today } = useApp();
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState('');
  const [mood, setMood] = useState(3);
  const [day, setDay] = useState(today);
  const [confirm, setConfirm] = useState(null);
  const entries = useMemo(
    () =>
      items
        .filter((it) => it.type === 'diario')
        .sort((a, b) => ((a.day || '') === (b.day || '') ? (b.createdAt || 0) - (a.createdAt || 0) : (a.day || '') < (b.day || '') ? 1 : -1)),
    [items],
  );
  const last7 = entries.filter((e) => e.day >= addDays(today, -6) && e.mood);
  const avg = last7.length ? last7.reduce((n, e) => n + e.mood, 0) / last7.length : null;

  function reset() {
    setEditing(null);
    setText('');
    setMood(3);
    setDay(today);
  }
  function save() {
    const t = text.trim();
    if (!t) {
      sfx.error();
      actions.toast('Scrivi qualcosa, anche una riga.');
      return;
    }
    const base = editing || newItem({ type: 'diario' });
    actions.save({ ...base, type: 'diario', title: t.slice(0, 60), notes: t, mood, day });
    sfx.done();
    reset();
  }
  function edit(e) {
    sfx.open();
    setEditing(e);
    setText(e.notes || '');
    setMood(e.mood || 3);
    setDay(e.day || today);
    window.scrollTo(0, 0);
  }

  return (
    <div className="view spaces">
      <SubHeader title="Diario" onBack={onBack} />
      <section className="diary-composer">
        <div className="mood-row" role="group" aria-label="Com’è andata?">
          {MOODS.map((m) => (
            <button
              key={m.v}
              type="button"
              className={`mood m${m.v} ${mood === m.v ? 'on' : ''}`}
              aria-pressed={mood === m.v}
              aria-label={m.label}
              title={m.label}
              onClick={() => {
                sfx.tap();
                setMood(m.v);
              }}
            >
              <Icon name={m.icon} size={24} />
            </button>
          ))}
        </div>
        <textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Com’è andata oggi? Cosa ti porti dietro?" aria-label="Testo del diario" />
        <div className="diary-actions">
          <input className="input" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} aria-label="Giorno" />
          <span className="grow" />
          {editing && (
            <button className="btn ghost" onClick={reset}>
              Annulla
            </button>
          )}
          <button className="btn primary" onClick={save}>
            <Icon name="Check" size={18} />
            {editing ? 'Aggiorna' : 'Salva pagina'}
          </button>
        </div>
      </section>

      {avg != null && (
        <p className="hint-line">
          Umore medio negli ultimi 7 giorni: <strong>{MOODS[Math.round(avg) - 1].label.toLowerCase()}</strong> ({avg.toFixed(1)}/5).
        </p>
      )}

      <div className="list">
        {entries.map((e) => {
          const m = MOODS[(e.mood || 3) - 1];
          return (
            <article key={e.id} className={`diary-entry m${e.mood || 3}`}>
              <header>
                <span className="diary-mood">
                  <Icon name={m.icon} size={18} />
                </span>
                <strong>{longDate(e.day || today)}</strong>
                <span className="grow" />
                <button className="icon-btn small" aria-label="Modifica pagina" onClick={() => edit(e)}>
                  <Icon name="Pencil" size={16} />
                </button>
                {confirm === e.id ? (
                  <button
                    className="btn danger small-btn"
                    onClick={() => {
                      actions.remove(e);
                      setConfirm(null);
                    }}
                  >
                    Elimina
                  </button>
                ) : (
                  <button className="icon-btn small" aria-label="Elimina pagina" onClick={() => setConfirm(e.id)}>
                    <Icon name="Trash2" size={16} />
                  </button>
                )}
              </header>
              <p>{e.notes}</p>
            </article>
          );
        })}
      </div>
      {!entries.length && <Empty icon="NotebookPen" title="Il diario è vuoto" text="Scrivi la prima pagina qui sopra. Resta solo tua." />}
    </div>
  );
}

/* ---------- traguardi ---------- */
export function Achievements({ onBack }) {
  const { settings } = useApp();
  const known = settings.badges || {};
  const got = BADGES.filter((b) => known[b.id]).length;
  return (
    <div className="view spaces">
      <SubHeader title="Traguardi" onBack={onBack} />
      <div className="medal-summary">
        <strong>{got}</strong>
        <span>di {BADGES.length} medaglie</span>
        <Progress pct={got / BADGES.length} />
      </div>
      <div className="medals">
        {BADGES.map((b) => {
          const on = !!known[b.id];
          return (
            <div key={b.id} className={`medal t${b.tier} ${on ? 'on' : ''}`} title={b.text}>
              <span className="medal-art">
                <Icon name={on ? b.icon : 'Lock'} size={26} />
              </span>
              <strong>{b.name}</strong>
              <span className="medal-text">{b.text}</span>
              {on && <span className="medal-date">{shortDate(known[b.id])}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- statistiche ---------- */
const SPANS = [
  { id: 7, label: '7 giorni' },
  { id: 30, label: '30 giorni' },
  { id: 90, label: '90 giorni' },
];

export function Stats({ onBack }) {
  const { items, areas, today, itemById } = useApp();
  const [span, setSpan] = useState(30);
  const from = addDays(today, -(span - 1));

  const data = useMemo(() => {
    const events = doneEvents(items).filter((e) => e.day >= from && e.day <= today);
    const impegni = events.filter((e) => e.item.type === 'impegno');
    const byDay = {};
    events.forEach((e) => (byDay[e.day] = (byDay[e.day] || 0) + 1));
    // Fino a 31 giorni una barra al giorno, oltre una barra a settimana.
    const bars = [];
    if (span <= 31) for (let i = 0; i < span; i += 1) bars.push({ key: addDays(from, i), n: byDay[addDays(from, i)] || 0, label: String(fromStr(addDays(from, i)).getDate()) });
    else {
      const weeks = {};
      Object.entries(byDay).forEach(([d, n]) => (weeks[startOfWeek(d)] = (weeks[startOfWeek(d)] || 0) + n));
      for (let w = startOfWeek(from); w <= today; w = addDays(w, 7)) bars.push({ key: w, n: weeks[w] || 0, label: shortDate(w) });
    }
    const weekday = [0, 0, 0, 0, 0, 0, 0];
    events.forEach((e) => (weekday[(fromStr(e.day).getDay() + 6) % 7] += 1));
    const names = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
    const bestDay = Math.max(...weekday) > 0 ? names[weekday.indexOf(Math.max(...weekday))] : null;
    const byPrio = PRIORITIES.map((p) => ({ ...p, n: impegni.filter((e) => e.item.priority === p.id).length }));
    const areaCount = {};
    events.forEach((e) => (areaCount[e.item.area || ''] = (areaCount[e.item.area || ''] || 0) + 1));
    const byArea = Object.entries(areaCount)
      .map(([id, n]) => ({ id, n, name: areas.find((a) => a.id === id)?.name || 'Senza area', icon: areas.find((a) => a.id === id)?.icon || 'Circle' }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
    const habits = items.filter((it) => it.type === 'abitudine' && !it.someday).map((h) => ({ h, rate: habitRate(h, today, span), streak: habitStreak(h, today) }));
    const goals = items.filter((it) => it.type === 'obiettivo' && !isDone(it) && !it.someday).map((g) => ({ g, p: goalProgress(g, itemById) })).filter((x) => x.p);
    const open = items.filter((it) => it.type === 'impegno' && !isDone(it) && !it.someday);
    const oldest = open.reduce((o, it) => (!o || (it.createdAt || 0) < (o.createdAt || 0) ? it : o), null);
    const bought = items.filter((it) => it.type === 'oggetto' && isDone(it) && it.paidOn && it.paidOn >= from);
    const spent = bought.reduce((n, it) => n + (parsePrice(it.paid) || 0), 0);
    const diary = items.filter((it) => it.type === 'diario' && it.day >= from && it.day <= today && it.mood);
    const mood = diary.length ? diary.reduce((n, d) => n + d.mood, 0) / diary.length : null;
    return {
      total: events.length,
      avg: events.length / span,
      bars,
      max: Math.max(1, ...bars.map((b) => b.n)),
      bestDay,
      byPrio,
      byArea,
      maxArea: Math.max(1, ...byArea.map((a) => a.n)),
      habits,
      goals,
      open: open.length,
      late: open.filter((it) => isOverdue(it, today)).length,
      oldest: oldest ? { title: oldest.title, days: diffDays(today, new Date(oldest.createdAt || Date.now()).toISOString().slice(0, 10)) } : null,
      bought: bought.length,
      spent,
      mood,
    };
  }, [items, areas, today, from, span, itemById]);

  return (
    <div className="view spaces">
      <SubHeader title="Statistiche" onBack={onBack} />
      <div className="chips segmented" role="group" aria-label="Periodo">
        {SPANS.map((s) => (
          <button
            key={s.id}
            className={`chip ${span === s.id ? 'on' : ''}`}
            aria-pressed={span === s.id}
            onClick={() => {
              sfx.tap();
              setSpan(s.id);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-num">{data.total}</span>
          <span className="stat-label">cose completate</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{data.avg.toFixed(1)}</span>
          <span className="stat-label">al giorno</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{data.open}</span>
          <span className="stat-label">impegni aperti{data.late ? `, ${data.late} scaduti` : ''}</span>
        </div>
        <div className="stat-card">
          <span className="stat-num small">{data.bestDay || '—'}</span>
          <span className="stat-label">giorno più produttivo</span>
        </div>
      </div>

      <section>
        <SectionTitle>Completate nel tempo</SectionTitle>
        <div className="bar-chart" role="img" aria-label={`Cose completate: ${data.total} negli ultimi ${span} giorni`}>
          {data.bars.map((b) => (
            <span key={b.key} className="bar-col" title={`${b.label}: ${b.n}`}>
              <i style={{ height: `${Math.max(b.n ? 6 : 2, (b.n / data.max) * 100)}%` }} className={b.n ? 'on' : ''} />
              {(span <= 7 || data.bars.length <= 14) && <em>{b.label}</em>}
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Per importanza</SectionTitle>
        <div className="hbars">
          {data.byPrio.map((p) => (
            <div key={p.id} className={`hbar p-${p.id}`}>
              <span className="hbar-label">{p.label}</span>
              <span className="hbar-track">
                <i style={{ width: `${(p.n / Math.max(1, ...data.byPrio.map((x) => x.n))) * 100}%` }} />
              </span>
              <span className="hbar-n">{p.n}</span>
            </div>
          ))}
        </div>
      </section>

      {data.byArea.length > 0 && (
        <section>
          <SectionTitle>Per area</SectionTitle>
          <div className="hbars">
            {data.byArea.map((a) => (
              <div key={a.id || 'none'} className="hbar area">
                <span className="hbar-label">
                  <Icon name={a.icon} size={14} /> {a.name}
                </span>
                <span className="hbar-track">
                  <i style={{ width: `${(a.n / data.maxArea) * 100}%` }} />
                </span>
                <span className="hbar-n">{a.n}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.habits.length > 0 && (
        <section>
          <SectionTitle>Abitudini</SectionTitle>
          <div className="hbars">
            {data.habits.map(({ h, rate, streak }) => (
              <div key={h.id} className="hbar habit">
                <span className="hbar-label">{h.title}</span>
                <span className="hbar-track">
                  <i style={{ width: `${Math.round((rate || 0) * 100)}%` }} />
                </span>
                <span className="hbar-n">{rate == null ? '—' : `${Math.round(rate * 100)}%`}</span>
                {streak.n > 0 && (
                  <span className="hbar-streak">
                    <Icon name="Flame" size={12} /> {streak.n}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.goals.length > 0 && (
        <section>
          <SectionTitle>Obiettivi in corso</SectionTitle>
          <div className="hbars">
            {data.goals.map(({ g, p }) => (
              <div key={g.id} className="hbar goal">
                <span className="hbar-label">{g.title}</span>
                <span className="hbar-track">
                  <i style={{ width: `${Math.round(p.pct * 100)}%` }} />
                </span>
                <span className="hbar-n">{Math.round(p.pct * 100)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Altro</SectionTitle>
        <ul className="facts">
          {data.oldest && data.oldest.days > 0 && (
            <li>
              L’impegno aperto da più tempo è “{data.oldest.title}”: {data.oldest.days} {data.oldest.days === 1 ? 'giorno' : 'giorni'}.
            </li>
          )}
          {data.bought > 0 && (
            <li>
              Hai comprato {data.bought} {data.bought === 1 ? 'cosa' : 'cose'} dalla lista{data.spent > 0 ? `, per ${money(data.spent)}` : ''}.
            </li>
          )}
          {data.mood != null && <li>Umore medio nel diario: {data.mood.toFixed(1)} su 5.</li>}
          {!data.oldest && !data.bought && data.mood == null && <li>Più usi Opifex, più cose compaiono qui.</li>}
        </ul>
      </section>
    </div>
  );
}
