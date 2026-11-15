import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { ItemMeta } from '../components/ItemRow.jsx';
import { STATUSES, sortItems, addDays } from '../lib/model.js';

export function Board() {
  const { items, areas, today, actions } = useApp();
  const [area, setArea] = useState('');
  const [over, setOver] = useState(null);
  const recent = addDays(today, -14);
  const pool = items.filter((it) => it.type === 'impegno' && !it.someday && (!area || it.area === area));

  const column = (status) => {
    const list = pool.filter((it) => it.status === status);
    if (status === 'done') return list.filter((it) => (it.doneAt || '') >= recent).sort((a, b) => ((a.doneAt || '') < (b.doneAt || '') ? 1 : -1));
    return sortItems(list);
  };

  const drop = (e, status) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const it = items.find((x) => x.id === id);
    if (it && it.status !== status) actions.setStatus(it, status);
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
        {STATUSES.map((s, i) => {
          const list = column(s.id);
          return (
            <section
              key={s.id}
              className={`column col-${s.id} ${over === s.id ? 'is-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s.id);
              }}
              onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
              onDrop={(e) => drop(e, s.id)}
            >
              <header className="column-head">
                <h2>{s.label}</h2>
                <span className="column-count">{list.length}</span>
              </header>
              <div className="column-body">
                {list.map((it) => (
                  <article
                    key={it.id}
                    className={`card p-${it.priority} ${s.id === 'done' ? 'is-done' : ''}`}
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
                      <button
                        className="icon-btn small"
                        aria-label={i > 0 ? `Sposta in ${STATUSES[i - 1].label}` : 'Già nella prima colonna'}
                        disabled={i === 0}
                        onClick={() => actions.setStatus(it, STATUSES[i - 1].id)}
                      >
                        <Icon name="ArrowLeft" size={16} />
                      </button>
                      <button
                        className="icon-btn small"
                        aria-label={i < STATUSES.length - 1 ? `Sposta in ${STATUSES[i + 1].label}` : "Già nell'ultima colonna"}
                        disabled={i === STATUSES.length - 1}
                        onClick={() => actions.setStatus(it, STATUSES[i + 1].id)}
                      >
                        <Icon name="ArrowRight" size={16} />
                      </button>
                    </div>
                  </article>
                ))}
                {!list.length && <span className="column-empty">{s.id === 'done' ? 'Niente negli ultimi 14 giorni' : 'Vuoto'}</span>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
