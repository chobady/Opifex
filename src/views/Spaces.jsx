import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { ItemRow } from '../components/ItemRow.jsx';
import { AreaRing } from '../components/Rings.jsx';
import { Empty, SectionTitle } from '../components/ui.jsx';
import { SubHeader, Someday, Diary, Achievements, Stats, ArchiveView, MonthView, DeadlinesView } from './Extras.jsx';
import { TYPES, isDone, sortItems, areaStats } from '../lib/model.js';

const TILES = [
  { id: 'nota', text: 'Pensieri ancora da ordinare' },
  { id: 'impegno', text: 'Tutte le cose da fare' },
  { id: 'obiettivo', text: 'Mete a cui stai lavorando' },
  { id: 'abitudine', text: 'Cose da ripetere con costanza' },
  { id: 'problema', text: 'Cose che non vanno, da risolvere' },
  { id: 'oggetto', text: 'Cose che ti servono' },
];

const MORE = [
  { id: 'forse', icon: 'Hourglass', label: 'Un giorno, forse', text: 'Idee e desideri senza fretta' },
  { id: 'diario', icon: 'NotebookPen', label: 'Diario', text: 'Com’è andata, giorno per giorno' },
  { id: 'traguardi', icon: 'Medal', label: 'Traguardi', text: 'Le medaglie che hai sbloccato' },
  { id: 'statistiche', icon: 'ChartNoAxesColumn', label: 'Statistiche', text: 'Cosa stai davvero facendo' },
  { id: 'mese', icon: 'CalendarRange', label: 'Il tuo mese', text: 'Riepilogo di fine mese' },
  { id: 'archivio', icon: 'Archive', label: 'Archivio', text: 'Tutto ciò che hai fatto, da cercare' },
  { id: 'scadenze', icon: 'CalendarClock', label: 'Scadenze', text: 'Bollo, caldaia, bollette…' },
  { id: 'revisione', icon: 'ClipboardCheck', label: 'Revisione', text: 'La settimana in cinque minuti' },
];

const EMPTY_TEXT = {
  nota: 'Quando un pensiero non è né un impegno né altro, finisce qui.',
  impegno: 'Nessun impegno aperto.',
  obiettivo: 'Scrivi il primo traguardo a cui vuoi arrivare.',
  abitudine: 'Aggiungi una cosa che vuoi fare con regolarità.',
  problema: 'Nessun problema aperto. Bene così.',
  oggetto: 'La lista delle cose che ti servono è vuota.',
};

export function Spaces() {
  const { items, areas, today, actions, spaceTab } = useApp();
  const sub = spaceTab;
  const [showDone, setShowDone] = useState(false);
  const setSub = (s) => {
    sfx.nav();
    setShowDone(false);
    actions.go('spazi', s);
  };

  if (sub === 'forse') return <Someday onBack={() => setSub(null)} />;
  if (sub === 'diario') return <Diary onBack={() => setSub(null)} />;
  if (sub === 'traguardi') return <Achievements onBack={() => setSub(null)} />;
  if (sub === 'statistiche') return <Stats onBack={() => setSub(null)} />;
  if (sub === 'mese') return <MonthView onBack={() => setSub(null)} />;
  if (sub === 'archivio') return <ArchiveView onBack={() => setSub(null)} />;
  if (sub === 'scadenze') return <DeadlinesView onBack={() => setSub(null)} />;

  if (sub === 'aree') {
    const sorted = [...areas].sort((a, b) => (a.order || 0) - (b.order || 0));
    return (
      <div className="view spaces">
        <SubHeader title="Aree" kicker="Spazi" onBack={() => setSub(null)} onAdd={() => actions.newArea()} />
        <div className="list">
          {sorted.map((a) => {
            const st = areaStats(items, a.id, today);
            return (
              <div key={a.id} className="area-line">
                <AreaRing area={a} stats={st} label={false} onClick={() => actions.openArea(a)} />
                <button className="row-main" onClick={() => actions.openArea(a)}>
                  <span className="row-title">{a.name}</span>
                  <span className="row-meta">
                    <span className="meta-bit">{st.open} aperti</span>
                    <span className="meta-bit">{st.done} fatti in 7 giorni</span>
                  </span>
                </button>
                <button className="icon-btn" aria-label={`Modifica area ${a.name}`} onClick={() => actions.editArea(a)}>
                  <Icon name="Pencil" size={18} />
                </button>
              </div>
            );
          })}
        </div>
        {!sorted.length && (
          <Empty
            icon="LayoutGrid"
            title="Nessuna area"
            text="Le aree sono le parti della tua vita: casa, lavoro, salute… Creane una e scegli la sua icona."
            action={
              <button className="btn primary" onClick={() => actions.newArea()}>
                <Icon name="Plus" size={18} />
                Nuova area
              </button>
            }
          />
        )}
      </div>
    );
  }

  if (sub && TYPES[sub]) {
    const all = items.filter((it) => it.type === sub && !it.someday);
    const open = sortItems(all.filter((it) => !isDone(it)));
    const done = all.filter(isDone).sort((a, b) => ((a.doneAt || '') < (b.doneAt || '') ? 1 : -1));
    const closable = sub !== 'impegno' && sub !== 'abitudine';
    return (
      <div className="view spaces">
        <SubHeader title={TYPES[sub].plural} kicker="Spazi" onBack={() => setSub(null)} onAdd={() => actions.create({ type: sub })} />
        <div className="list">
          {open.map((it) => (
            <div key={it.id} className="with-action">
              <ItemRow item={it} star={sub === 'impegno'} />
              {sub === 'problema' && (
                <button className="btn ghost opinion-btn" aria-label={`Chiedi un’opinione: ${it.title}`} onClick={() => actions.advise(it)}>
                  <Icon name="Lightbulb" size={18} />
                  <span>Opinione</span>
                </button>
              )}
              {closable && (
                <button className="icon-btn boxed" aria-label={`${sub === 'oggetto' ? 'Segna comprato' : 'Segna chiuso'}: ${it.title}`} onClick={() => actions.toggleDone(it)}>
                  <Icon name="Check" size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!open.length && (
          <Empty
            icon={TYPES[sub].icon}
            title="Niente qui"
            text={EMPTY_TEXT[sub]}
            action={
              <button className="btn primary" onClick={() => actions.create({ type: sub })}>
                <Icon name="Plus" size={18} />
                Aggiungi
              </button>
            }
          />
        )}
        {done.length > 0 && (
          <section>
            <button className="collapse" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
              <Icon name={showDone ? 'ChevronDown' : 'ChevronRight'} size={16} />
              {sub === 'oggetto' ? 'Comprati' : sub === 'problema' ? 'Risolti' : 'Chiusi'} ({done.length})
            </button>
            {showDone && (
              <div className="list">
                {done.slice(0, 80).map((it) => (
                  <div key={it.id} className="with-action">
                    <ItemRow item={it} />
                    {closable && (
                      <button className="icon-btn boxed" aria-label={`Riapri: ${it.title}`} onClick={() => actions.toggleDone(it)}>
                        <Icon name="ArrowLeft" size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="view spaces">
      <header className="topbar">
        <div className="brand">
          <span className="kicker">Spazi</span>
          <h1>Tutto il resto</h1>
        </div>
        <button className="icon-btn boxed" aria-label="Impostazioni" onClick={() => actions.openSettings()}>
          <Icon name="Settings" />
        </button>
      </header>

      <div className="tiles">
        {TILES.map((t) => {
          const n = items.filter((it) => it.type === t.id && !isDone(it) && !it.someday).length;
          return (
            <button key={t.id} className="tile" onClick={() => setSub(t.id)}>
              <span className="tile-icon">
                <Icon name={TYPES[t.id].icon} size={22} />
              </span>
              <span className="tile-count">{n}</span>
              <strong>{TYPES[t.id].plural}</strong>
              <span className="tile-text">{t.text}</span>
            </button>
          );
        })}
        <button className="tile tile-areas" onClick={() => setSub('aree')}>
          <span className="tile-icon">
            <Icon name="LayoutGrid" size={22} />
          </span>
          <span className="tile-count">{areas.length}</span>
          <strong>Aree</strong>
          <span className="tile-text">Le parti della tua vita, con le loro icone</span>
        </button>
      </div>

      <SectionTitle>Per capire e ricordare</SectionTitle>
      <div className="tiles tiles-more">
        {MORE.map((m) => (
          <button key={m.id} className="tile" onClick={() => (m.id === 'revisione' ? actions.open('review') : setSub(m.id))}>
            <span className="tile-icon">
              <Icon name={m.icon} size={22} />
            </span>
            <strong>{m.label}</strong>
            <span className="tile-text">{m.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
