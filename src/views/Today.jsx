import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { Capture } from '../components/Capture.jsx';
import { Rings, RingsLegend, AreaRing } from '../components/Rings.jsx';
import { ItemRow } from '../components/ItemRow.jsx';
import { Empty, SectionTitle } from '../components/ui.jsx';
import { PRIORITIES, ringStats, stageStats, areaStats, isDoable, isDone, isDueToday, isOverdue, doneOn, sortItems, longDate, habitScheduled, upcoming, behind, startOfWeek, diffDays, relativeDate, monthLabel, addDays } from '../lib/model.js';
import { reviewWeek } from '../components/Review.jsx';
import { cloudEnabled } from '../lib/firebase.js';

export function Today() {
  const { items, areas, today, actions, ready, settings, itemById } = useApp();
  const stats = useMemo(() => ringStats(items, today), [items, today]);
  const stages = useMemo(() => stageStats(items, today), [items, today]);
  const [celebrate, setCelebrate] = useState(false);
  const party = useRef(null);
  useEffect(() => () => clearTimeout(party.current), []);
  const [showDone, setShowDone] = useState(false);
  const prev = useRef(null);

  // Quando tutti gli impegni di oggi arrivano al centro: festa.
  useEffect(() => {
    if (!ready) return undefined;
    const full = stages.total > 0 && stages.done.length === stages.total;
    if (prev.current === false && full) {
      setCelebrate(true);
      sfx.victory();
      navigator.vibrate?.([60, 40, 60, 40, 180]);
      // Il timer non dipende dall'effetto: se i dati cambiano durante la festa, si spegne comunque.
      clearTimeout(party.current);
      party.current = setTimeout(() => setCelebrate(false), 2600);
    }
    prev.current = full;
    return undefined;
  }, [stages, ready]);

  // "Giorno perfetto": tutti gli anelli in programma sono chiusi. Si ricorda nelle impostazioni.
  useEffect(() => {
    if (!ready) return;
    const active = PRIORITIES.filter((p) => stats[p.id].total > 0);
    const perfect = active.length > 0 && active.every((p) => stats[p.id].done >= stats[p.id].total);
    const days = settings.perfectDays || [];
    if (perfect && !days.includes(today)) actions.saveSettings({ perfectDays: [...days, today].slice(-400) });
  }, [stats, ready, today, settings.perfectDays, actions]);

  const doable = items.filter((it) => isDoable(it) && !it.someday && it.type !== 'abitudine');
  const habits = items.filter((it) => it.type === 'abitudine' && !it.someday && habitScheduled(it, today));
  const focus = sortItems(doable.filter((it) => it.focusDate === today && !isDone(it) && !doneOn(it, today)));
  const focusIds = new Set(focus.map((it) => it.id));
  const due = doable.filter((it) => isDueToday(it, today) && !focusIds.has(it.id));
  const late = sortItems(due.filter((it) => isOverdue(it, today)));
  const now = sortItems(due.filter((it) => it.when?.kind === 'date' && !isOverdue(it, today)));
  const asap = sortItems(due.filter((it) => it.when?.kind === 'asap'));
  const doneToday = doable.filter((it) => doneOn(it, today));
  const inbox = items.filter((it) => it.type === 'nota' && !isDone(it)).length;
  const sortedAreas = [...areas].sort((a, b) => (a.order || 0) - (b.order || 0));
  const soon = upcoming(items, today);
  const lateCount = behind(items, today).length;
  const weekday = new Date(`${today}T12:00:00`).getDay();
  const reviewDue = ready && (weekday === 0 || weekday === 1) && settings.lastReview !== reviewWeek(today);
  const weekGoals = settings.weekFocus?.week === startOfWeek(today) ? (settings.weekFocus.ids || []).map((id) => itemById[id]).filter(Boolean) : [];
  const lastMonth = addDays(today.slice(0, 8) + '01', -1).slice(0, 7);
  const monthDue = ready && Number(today.slice(8)) <= 5 && settings.monthSeen !== lastMonth && items.some((it) => (it.doneAt || '').startsWith(lastMonth));
  const nothing = !focus.length && !due.length && !doneToday.length && !habits.length;

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
            <Rings stats={stages} celebrate={celebrate} />
            <RingsLegend stats={stages} />
          </section>

          {asap.length > 0 && (
            <section className="asap-block">
              <SectionTitle>Prima possibile</SectionTitle>
              <div className="list">
                {asap.map((it) => (
                  <ItemRow key={it.id} item={it} star />
                ))}
              </div>
            </section>
          )}

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
          <div className="quick-actions">
            <button className="quick" onClick={() => actions.open('time')}>
              <Icon name="Timer" size={18} />
              Ho tempo
            </button>
            {lateCount > 0 && (
              <button className="quick warn" onClick={() => actions.open('catchup')}>
                <Icon name="CalendarClock" size={18} />
                Rimetti in ordine <span className="quick-n">{lateCount}</span>
              </button>
            )}
            <button className="quick" onClick={() => actions.open('review')}>
              <Icon name="ClipboardCheck" size={18} />
              Revisione
            </button>
          </div>

          {settings.morning?.date === today && settings.morning.text && (
            <div className="morning">
              <Icon name="Sunrise" size={20} />
              <p>{settings.morning.text}</p>
            </div>
          )}

          {reviewDue && (
            <button className="promo" onClick={() => actions.open('review')}>
              <Icon name="ClipboardCheck" size={22} />
              <span>
                <strong>È il momento della revisione della settimana</strong>
                <span>Cinque minuti: svuoti la Inbox, sistemi ciò che è indietro e scegli tre obiettivi.</span>
              </span>
              <Icon name="ChevronRight" size={18} />
            </button>
          )}

          {monthDue && (
            <button className="promo violet" onClick={() => actions.go('spazi', 'mese')}>
              <Icon name="CalendarRange" size={22} />
              <span>
                <strong>Il riepilogo di {monthLabel(lastMonth + '-01').split(' ')[0]} è pronto</strong>
                <span>Anelli chiusi, medaglie, abitudini e umore del mese.</span>
              </span>
              <Icon name="ChevronRight" size={18} />
            </button>
          )}

          {weekGoals.length > 0 && (
            <section>
              <SectionTitle right={<span className="section-note">{weekGoals.filter(isDone).length}/{weekGoals.length}</span>}>Obiettivi della settimana</SectionTitle>
              <div className="list">
                {weekGoals.map((it) => (
                  <ItemRow key={it.id} item={it} showType />
                ))}
              </div>
            </section>
          )}

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
              <SectionTitle
                right={
                  <button className="link-btn" onClick={() => actions.open('catchup')}>
                    Rimetti in ordine
                  </button>
                }
              >
                Scaduti
              </SectionTitle>
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

          {soon.length > 0 && (
            <section>
              <SectionTitle>In arrivo</SectionTitle>
              <div className="list">
                {soon.map((it) => (
                  <ItemRow key={it.id} item={it} showType />
                ))}
              </div>
            </section>
          )}

          {habits.length > 0 && (
            <section>
              <SectionTitle right={<span className="section-note">{habits.filter((h) => doneOn(h, today)).length}/{habits.length}</span>}>Abitudini</SectionTitle>
              <div className="list">
                {habits.map((it) => (
                  <ItemRow key={it.id} item={it} />
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
