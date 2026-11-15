import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { Bars } from './ui.jsx';
import { TYPES, PRIORITY, isDone, isDoable, isOverdue, doneOn, whenLabel, relativeDate } from '../lib/model.js';

export function ItemMeta({ item, showType = false, showArea = true }) {
  const { areaById, today } = useApp();
  const area = areaById[item.area];
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
      {item.status === 'waiting' && <span className="meta-bit">in attesa{item.waitingFor ? `: ${item.waitingFor}` : ''}</span>}
      {item.type === 'oggetto' && item.price && <span className="meta-bit">{item.price}</span>}
    </span>
  );
}

export function ItemRow({ item, star = false, showType = false, showArea = true, day = null }) {
  const { today, actions } = useApp();
  const [pop, setPop] = useState(false);
  const done = isDone(item) || (day ? doneOn(item, day) : false);
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
      </button>
      {star && doable && !done && (
        <button
          className={`star ${focused ? 'on' : ''}`}
          aria-label={focused ? 'Togli dal focus di oggi' : 'Metti nel focus di oggi'}
          aria-pressed={focused}
          onClick={() => actions.toggleFocus(item)}
        >
          <Icon name="Star" size={18} />
        </button>
      )}
      <span className="prio-tag">{PRIORITY[item.priority]?.label}</span>
    </div>
  );
}
