import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { ItemMeta } from '../components/ItemRow.jsx';
import { sortItems, addDays } from '../lib/model.js';

// Tre colonne: "In attesa" vive dentro "In corso", nella sua metà bassa.
const COLS = [
  { id: 'todo', label: 'Da fare' },
  { id: 'doing', label: 'In corso' },
  { id: 'done', label: 'Fatto' },
];
const colOf = (status) => (status === 'waiting' ? 'doing' : status);

export function Board() {
  const { items, areas, today, actions } = useApp();
  const [area, setArea] = useState('');
  const [over, setOver] = useState(null);
  const recent = addDays(today, -14);
  const pool = items.filter((it) => it.type === 'impegno' && !it.someday && (!area || it.area === area));

  const list = (status) => {
    const l = pool.filter((it) => it.status === status);
    if (status === 'done') return l.filter((it) => (it.doneAt || '') >= recent).sort((a, b) => ((a.doneAt || '') < (b.doneAt || '') ? 1 : -1));
    return sortItems(l);
  };

  const dropZone = (status) => ({
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(status);
    },
    onDragLeave: () => setOver((o) => (o === status ? null : o)),
    onDrop: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(null);
      const it = items.find((x) => x.id === e.dataTransfer.getData('text/plain'));
      if (it && it.status !== status) actions.setStatus(it, status);
    },
  });

  const card = (it) => {
    const ci = COLS.findIndex((c) => c.id === colOf(it.status));
    const prev = COLS[ci - 1];
    const next = COLS[ci + 1];
    const inDoing = ci === 1;
    return (
      <article
        key={it.id}
        className={`card p-${it.priority} ${it.status === 'done' ? 'is-done' : ''} ${it.status === 'waiting' ? 'is-waiting' : ''}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', it.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        <button className="card-main" onClick={() => actions.edit(it)}>
          <span className="card-title">{it.title}</span>
          <ItemMeta item={it} />
        </button>
        <div className="card-moves">
          <button className="icon-btn small" aria-label={prev ? `Sposta in ${prev.label}` : 'Già nella prima colonna'} disabled={!prev} onClick={() => actions.setStatus(it, prev.id)}>
            <Icon name="ArrowLeft" size={16} />
          </button>
          {inDoing && (
            <button
              className="icon-btn small"
              aria-label={it.status === 'waiting' ? 'Riprendi: torna in corso' : 'Metti in attesa'}
              title={it.status === 'waiting' ? 'Riprendi' : 'Metti in attesa'}
              onClick={() => actions.setStatus(it, it.status === 'waiting' ? 'doing' : 'waiting')}
            >
              <Icon name={it.status === 'waiting' ? 'ArrowUp' : 'ArrowDown'} size={16} />
            </button>
          )}
          <button className="icon-btn small" aria-label={next ? `Sposta in ${next.label}` : "Già nell'ultima colonna"} disabled={!next} onClick={() => actions.setStatus(it, next.id)}>
            <Icon name="ArrowRight" size={16} />
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="view board">
      <header className="topbar">
        <div className="brand">
          <span className="kicker">Bacheca</span>
          <h1>Impegni</h1>
        </div>
        <button className="btn primary" onClick={() => actions.create({ area: area || null })}>
          <Icon name="Plus" size={18} />
          Nuovo
        </button>
      </header>

      {areas.length > 0 && (
        <div className="chips scroll-x" role="group" aria-label="Filtra per area">
          <button className={`chip ${!area ? 'on' : ''}`} aria-pressed={!area} onClick={() => setArea('')}>
            Tutte
          </button>
          {areas.map((a) => (
            <button
              key={a.id}
              className={`chip ${area === a.id ? 'on' : ''}`}
              aria-pressed={area === a.id}
              onClick={() => {
                sfx.tap();
                setArea(a.id);
              }}
            >
              <Icon name={a.icon} size={16} />
              {a.name}
            </button>
          ))}
        </div>
      )}

      <div className="columns">
        {COLS.map((c) => {
          const main = list(c.id);
          const waiting = c.id === 'doing' ? list('waiting') : [];
          return (
            <section key={c.id} className={`column col-${c.id} ${over === c.id ? 'is-over' : ''}`} {...dropZone(c.id)}>
              <header className="column-head">
                <h2>{c.label}</h2>
                <span className="column-count">{main.length + waiting.length}</span>
              </header>
              <div className="column-body">
                {main.map(card)}
                {!main.length && <span className="column-empty">{c.id === 'done' ? 'Niente negli ultimi 14 giorni' : 'Vuoto'}</span>}
              </div>
              {c.id === 'doing' && (
                <div className={`waiting-zone ${over === 'waiting' ? 'is-over' : ''}`} {...dropZone('waiting')}>
                  <header className="waiting-head">
                    <Icon name="Hourglass" size={14} />
                    <h3>In attesa</h3>
                    <span className="column-count">{waiting.length}</span>
                  </header>
                  <div className="column-body">
                    {waiting.map(card)}
                    {!waiting.length && <span className="column-empty">Niente in attesa di altri</span>}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
