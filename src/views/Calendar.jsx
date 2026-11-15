import { useMemo, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { ItemRow } from '../components/ItemRow.jsx';
import { Chips, Empty, SectionTitle } from '../components/ui.jsx';
import { addDays, startOfWeek, fromStr, shortDate, weekdayShort, longDate, occursOn, doneOn, isDone, isOverdue, sortByTime, sortItems, monthLabel } from '../lib/model.js';

const MODES = [
  { id: 'week', label: 'Settimana' },
  { id: 'agenda', label: 'Agenda' },
];

export function Calendar() {
  const { items, today, actions } = useApp();
  const [mode, setMode] = useState('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dated = useMemo(() => items.filter((it) => it.when?.kind === 'date' && it.when.date), [items]);

  const forDay = (day) => {
    const list = dated.filter((it) => occursOn(it, day) || (it.recur && (it.doneLog || []).includes(day)));
    return sortByTime(list);
  };

  const move = (n) => {
    sfx.nav();
    setWeekStart((w) => addDays(w, n * 7));
  };

  return (
    <div className="view calendar">
      <header className="topbar">
        <div className="brand">
          <span className="kicker">Calendario</span>
          <h1>{mode === 'week' ? `${shortDate(days[0])} – ${shortDate(days[6])}` : 'Agenda'}</h1>
        </div>
        <Chips options={MODES} value={mode} onChange={setMode} className="segmented" label="Vista" />
      </header>

      {mode === 'week' ? (
        <>
          <div className="week-nav">
            <button className="icon-btn boxed" aria-label="Settimana precedente" onClick={() => move(-1)}>
              <Icon name="ChevronLeft" />
            </button>
            <button className="btn ghost" onClick={() => setWeekStart(startOfWeek(today))} disabled={weekStart === startOfWeek(today)}>
              Questa settimana
            </button>
            <span className="grow week-month">{monthLabel(days[3])}</span>
            <button className="icon-btn boxed" aria-label="Settimana successiva" onClick={() => move(1)}>
              <Icon name="ChevronRight" />
            </button>
          </div>
          <div className="week" key={weekStart}>
            {days.map((day) => {
              const list = forDay(day);
              return (
                <section key={day} className={`day ${day === today ? 'is-today' : ''} ${day < today ? 'is-past' : ''}`}>
                  <header className="day-head">
                    <span className="day-wd">{weekdayShort(day)}</span>
                    <span className="day-num">{fromStr(day).getDate()}</span>
                    <span className="grow" />
                    <button className="icon-btn small" aria-label={`Aggiungi ${longDate(day)}`} onClick={() => actions.create({ when: { kind: 'date', date: day } })}>
                      <Icon name="Plus" size={18} />
                    </button>
                  </header>
                  <div className="day-items">
                    {list.map((it) => {
                      const done = isDone(it) || doneOn(it, day);
                      return (
                        <button key={it.id} className={`mini p-${it.priority} ${done ? 'is-done' : ''}`} onClick={() => actions.edit(it)}>
                          <span className="mini-dot" />
                          {it.when.time && <span className="mini-time">{it.when.time}</span>}
                          <span className="mini-title">{it.title}</span>
                          {it.recur && <Icon name="Repeat" size={12} />}
                        </button>
                      );
                    })}
                    {!list.length && <span className="day-empty">—</span>}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <Agenda dated={dated} />
      )}
    </div>
  );
}

function Agenda({ dated }) {
  const { items, today, actions } = useApp();
  const open = items.filter((it) => !isDone(it));
  const late = sortItems(open.filter((it) => isOverdue(it, today)));
  const upcoming = useMemo(() => {
    const out = [];
    for (let i = 0; i < 60; i += 1) {
      const day = addDays(today, i);
      const list = sortByTime(dated.filter((it) => !isDone(it) && it.when.date === day));
      if (list.length) out.push({ day, list });
    }
    return out;
  }, [dated, today]);
  const asap = sortItems(open.filter((it) => it.when?.kind === 'asap'));
  const undated = sortItems(open.filter((it) => (it.when?.kind || 'none') === 'none' && it.type === 'impegno'));
  const empty = !late.length && !upcoming.length && !asap.length && !undated.length;

  return (
    <div className="agenda">
      {late.length > 0 && (
        <section>
          <SectionTitle>Scaduti</SectionTitle>
          <div className="list">
            {late.map((it) => (
              <ItemRow key={it.id} item={it} showType={it.type !== 'impegno'} />
            ))}
          </div>
        </section>
      )}
      {upcoming.map(({ day, list }) => (
        <section key={day}>
          <SectionTitle right={<span className="section-note">{day === today ? 'oggi' : day === addDays(today, 1) ? 'domani' : ''}</span>}>{longDate(day)}</SectionTitle>
          <div className="list">
            {list.map((it) => (
              <ItemRow key={it.id} item={it} showType={it.type !== 'impegno'} />
            ))}
          </div>
        </section>
      ))}
      {asap.length > 0 && (
        <section>
          <SectionTitle>Prima possibile</SectionTitle>
          <div className="list">
            {asap.map((it) => (
              <ItemRow key={it.id} item={it} showType={it.type !== 'impegno'} />
            ))}
          </div>
        </section>
      )}
      {undated.length > 0 && (
        <section>
          <SectionTitle>Senza data</SectionTitle>
          <div className="list">
            {undated.map((it) => (
              <ItemRow key={it.id} item={it} />
            ))}
          </div>
        </section>
      )}
      {empty && (
        <Empty
          icon="CalendarDays"
          title="Agenda vuota"
          text="Non c'è niente in programma."
          action={
            <button className="btn primary" onClick={() => actions.create({ when: { kind: 'date', date: today } })}>
              <Icon name="Plus" size={18} />
              Nuovo impegno
            </button>
          }
        />
      )}
    </div>
  );
}
