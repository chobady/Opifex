import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { Capture } from '../components/Capture.jsx';
import { Rings, RingsLegend, AreaRing } from '../components/Rings.jsx';
import { ItemRow } from '../components/ItemRow.jsx';
import { Empty, SectionTitle } from '../components/ui.jsx';
import { PRIORITIES, ringStats, areaStats, isDoable, isDone, isDueToday, isOverdue, doneOn, sortItems, longDate } from '../lib/model.js';
import { cloudEnabled } from '../lib/firebase.js';

export function Today() {
  const { items, areas, today, actions, ready } = useApp();
  const stats = useMemo(() => ringStats(items, today), [items, today]);
  const [celebrate, setCelebrate] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const prev = useRef(null);

  // Quando un anello si chiude: festa.
  useEffect(() => {
    if (!ready) return;
    const full = Object.fromEntries(PRIORITIES.map((p) => [p.id, stats[p.id].total > 0 && stats[p.id].done >= stats[p.id].total]));
    if (prev.current && PRIORITIES.some((p) => full[p.id] && !prev.current[p.id])) {
      setCelebrate(true);
      sfx.ring();
      const t = setTimeout(() => setCelebrate(false), 1600);
      prev.current = full;
      return () => clearTimeout(t);
    }
    prev.current = full;
    return undefined;
  }, [stats, ready]);

  const doable = items.filter(isDoable);
  const focus = sortItems(doable.filter((it) => it.focusDate === today && !isDone(it) && !doneOn(it, today)));
  const focusIds = new Set(focus.map((it) => it.id));
  const due = doable.filter((it) => isDueToday(it, today) && !focusIds.has(it.id));
  const late = sortItems(due.filter((it) => isOverdue(it, today)));
  const now = sortItems(due.filter((it) => it.when?.kind === 'date' && !isOverdue(it, today)));
  const asap = sortItems(due.filter((it) => it.when?.kind === 'asap'));
  const doneToday = doable.filter((it) => doneOn(it, today));
  const inbox = items.filter((it) => it.type === 'nota' && !isDone(it)).length;
  const sortedAreas = [...areas].sort((a, b) => (a.order || 0) - (b.order || 0));
  const nothing = !focus.length && !due.length && !doneToday.length;

  return (
    <>
    <div className="view today">
      <header className="topbar">
        <div className="brand">
          <span className="wordmark">OPIFEX</span>
          <span className="date">{longDate(today)}</span>
        </div>
        <div className="topbar-actions">
          {!cloudEnabled && (
            <button className="pill" onClick={() => actions.openSettings()}>
              <Icon name="HardDrive" size={14} />
              Locale
            </button>
          )}
          <button className="icon-btn boxed" aria-label="Cerca" onClick={() => actions.openSearch()}>
            <Icon name="Search" />
          </button>
          <button className="icon-btn boxed" aria-label={`Inbox, ${inbox} pensieri da ordinare`} onClick={() => actions.go('spazi', 'nota')}>
            <Icon name="Inbox" />
            {inbox > 0 && <span className="badge">{inbox}</span>}
          </button>
        </div>
      </header>

      <div className="today-grid">
        <div className="today-side">
          <Capture />

          <section className="rings-block">
            <Rings stats={stats} celebrate={celebrate} />
            <RingsLegend stats={stats} />
          </section>

          <section className="areas-block">
            <SectionTitle>Aree</SectionTitle>
            <div className="areas-row">
              {sortedAreas.map((a) => (
                <AreaRing key={a.id} area={a} stats={areaStats(items, a.id, today)} onClick={() => actions.openArea(a)} />
              ))}
              <button className="area-ring add" onClick={() => actions.newArea()}>
                <span className="area-ring-art dashed">
                  <Icon name="Plus" size={20} />
                </span>
                <span className="area-name">Nuova</span>
              </button>
            </div>
          </section>
        </div>

        <div className="today-main">
          <section>
            <SectionTitle right={<span className="section-note">{focus.length}/3</span>}>Focus di oggi</SectionTitle>
            <div className="list">
              {focus.map((it) => (
                <ItemRow key={it.id} item={it} star />
              ))}
            </div>
            {!focus.length && <p className="hint-line">Tocca la stella accanto a un impegno per metterlo qui. Massimo tre.</p>}
          </section>

          {late.length > 0 && (
            <section>
              <SectionTitle>Scaduti</SectionTitle>
              <div className="list">
                {late.map((it) => (
                  <ItemRow key={it.id} item={it} star />
                ))}
              </div>
            </section>
          )}

          {now.length > 0 && (
            <section>
              <SectionTitle>Oggi</SectionTitle>
              <div className="list">
                {now.map((it) => (
                  <ItemRow key={it.id} item={it} star />
                ))}
              </div>
            </section>
          )}

          {asap.length > 0 && (
            <section>
              <SectionTitle>Prima possibile</SectionTitle>
              <div className="list">
                {asap.map((it) => (
                  <ItemRow key={it.id} item={it} star />
                ))}
              </div>
            </section>
          )}

          {nothing && ready && (
            <Empty
              icon="Orbit"
              title="Giornata libera"
              text="Scrivi un pensiero qui sopra, oppure aggiungi un impegno."
              action={
                <button className="btn primary" onClick={() => actions.create({ when: { kind: 'date', date: today } })}>
                  <Icon name="Plus" size={18} />
                  Nuovo impegno
                </button>
              }
            />
          )}

          {doneToday.length > 0 && (
            <section>
              <button className="collapse" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
                <Icon name={showDone ? 'ChevronDown' : 'ChevronRight'} size={16} />
                Fatti oggi ({doneToday.length})
              </button>
              {showDone && (
                <div className="list">
                  {doneToday.map((it) => (
                    <ItemRow key={it.id} item={it} day={today} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

    </div>
      <button className="fab" aria-label="Nuovo elemento" onClick={() => actions.create({})}>
        <Icon name="Plus" size={26} />
      </button>
    </>
  );
}
