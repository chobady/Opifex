import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { Bars, Progress } from './ui.jsx';
import { TYPES, PRIORITY, isDone, isDoable, isOverdue, doneOn, whenLabel, relativeDate, goalProgress, habitStreak, habitOf, weekCount, addDays, money, parsePrice, durationLabel } from '../lib/model.js';

export function ItemMeta({ item, showType = false, showArea = true }) {
  const { areaById, today, itemById } = useApp();
  const area = areaById[item.area];
  const isHabit = item.type === 'abitudine';
  const streak = isHabit ? habitStreak(item, today) : null;
  const habit = isHabit ? habitOf(item) : null;
  const progress = item.type === 'obiettivo' ? goalProgress(item, itemById) : null;
  const overdue = isOverdue(item, today);
  const w = item.when || {};
  const check = item.checklist || [];
  const links = (item.links || []).length;
  return (
    <span className="row-meta">
      <Bars priority={item.priority} />
      {showType && <span className="meta-bit">{TYPES[item.type]?.label}</span>}
      {showArea && area && (
        <span className="meta-bit meta-area">
          <Icon name={area.icon} size={13} strokeWidth={1.8} />
          {area.name}
        </span>
      )}
      {w.kind === 'asap' && (
        <span className="meta-bit">
          <Icon name="Zap" size={13} strokeWidth={1.8} />
          prima possibile
        </span>
      )}
      {w.kind === 'date' && w.date && (
        <span className={`meta-bit ${overdue ? 'meta-late' : ''}`}>
          <Icon name={w.time ? 'Clock' : 'CalendarDays'} size={13} strokeWidth={1.8} />
          {overdue ? `scaduto ${relativeDate(w.date, today)}` : whenLabel(item, today)}
        </span>
      )}
      {item.recur && (
        <span className="meta-bit" title="Si ripete">
          <Icon name="Repeat" size={13} strokeWidth={1.8} />
        </span>
      )}
      {check.length > 0 && (
        <span className="meta-bit">
          <Icon name="ListTodo" size={13} strokeWidth={1.8} />
          {check.filter((c) => c.done).length}/{check.length}
        </span>
      )}
      {links > 0 && (
        <span className="meta-bit">
          <Icon name="Link2" size={13} strokeWidth={1.8} />
          {links}
        </span>
      )}
      {isHabit && streak.n > 0 && (
        <span className="meta-bit meta-streak" title="Serie attuale">
          <Icon name="Flame" size={13} strokeWidth={1.8} />
          {streak.n} {streak.unit}
        </span>
      )}
      {isHabit && habit.mode === 'times' && (
        <span className="meta-bit">
          {weekCount(item, today)}/{habit.perWeek} questa settimana
        </span>
      )}
      {isHabit && habit.mode === 'weekdays' && <span className="meta-bit">Lun–Ven</span>}
      {progress && (
        <span className="meta-bit meta-goal">
          <Icon name={progress.mode === 'measure' ? 'Gauge' : 'ListTodo'} size={13} strokeWidth={1.8} />
          {progress.label}
        </span>
      )}
      {item.minutes > 0 && (
        <span className="meta-bit">
          <Icon name="Timer" size={13} strokeWidth={1.8} />
          {durationLabel(item.minutes)}
        </span>
      )}
      {(item.photos || []).length > 0 && (
        <span className="meta-bit">
          <Icon name="Camera" size={13} strokeWidth={1.8} />
          {item.photos.length}
        </span>
      )}
      {item.someday && (
        <span className="meta-bit">
          <Icon name="Hourglass" size={13} strokeWidth={1.8} />
          un giorno, forse
        </span>
      )}
      {item.status === 'waiting' && <span className="meta-bit">in attesa{item.waitingFor ? `: ${item.waitingFor}` : ''}</span>}
      {item.type === 'oggetto' && (item.paid ? <span className="meta-bit">pagato {money(parsePrice(item.paid) ?? 0)}</span> : item.price ? <span className="meta-bit">{item.price}</span> : null)}
    </span>
  );
}

// Gli ultimi sette giorni di un'abitudine: pallino pieno = fatto.
function HabitDots({ item }) {
  const { today } = useApp();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <span className="habit-dots" aria-hidden="true">
      {days.map((d) => (
        <i key={d} className={doneOn(item, d) ? 'on' : ''} />
      ))}
    </span>
  );
}

export function ItemRow({ item, star = false, showType = false, showArea = true, day = null }) {
  const { today, actions } = useApp();
  const [pop, setPop] = useState(false);
  const done = isDone(item) || (item.type === 'abitudine' ? doneOn(item, day || today) : day ? doneOn(item, day) : false);
  const { itemById } = useApp();
  const progress = item.type === 'obiettivo' ? goalProgress(item, itemById) : null;
  const doable = isDoable(item);
  const focused = item.focusDate === today;
  return (
    <div className={`row p-${item.priority} ${done ? 'is-done' : ''} ${pop ? 'pop' : ''} ${star ? 'has-star' : ''}`}>
      {doable ? (
        <button
          className="check"
          aria-label={`${done ? 'Riapri' : 'Completa'}: ${item.title}`}
          aria-pressed={done}
          onClick={() => {
            if (!done) {
              setPop(true);
              setTimeout(() => setPop(false), 520);
            }
            actions.toggleDone(item);
          }}
        >
          <span className="check-ring">{done && <Icon name="Check" size={14} strokeWidth={3} />}</span>
        </button>
      ) : (
        <span className="type-badge">
          <Icon name={TYPES[item.type]?.icon} size={18} />
        </span>
      )}
      <button className="row-main" onClick={() => actions.edit(item)}>
        <span className="row-title">{item.title || 'Senza titolo'}</span>
        <ItemMeta item={item} showType={showType} showArea={showArea} />
        {progress && <Progress pct={progress.pct} />}
        {item.type === 'abitudine' && <HabitDots item={item} />}
      </button>
      {star && doable && item.type !== 'abitudine' && !done && (
        <button
          className={`star ${focused ? 'on' : ''}`}
          aria-label={focused ? 'Togli dal focus di oggi' : 'Metti nel focus di oggi'}
          aria-pressed={focused}
          onClick={() => actions.toggleFocus(item)}
        >
          <Icon name="Star" size={18} />
        </button>
      )}
      {item.type === 'abitudine' && (item.checklist || []).length > 0 && !done && (
        <button className="star play" aria-label={`Avvia la routine: ${item.title}`} onClick={() => actions.focus(item)}>
          <Icon name="Play" size={18} />
        </button>
      )}
      <span className="prio-tag">{PRIORITY[item.priority]?.label}</span>
    </div>
  );
}
