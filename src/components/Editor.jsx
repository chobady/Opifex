import { useMemo, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { Sheet, Chips, Field } from './ui.jsx';
import { TYPES, TYPE_IDS, PRIORITIES, STATUSES, RECURS, isDoable, uid, matches, todayStr, addDays } from '../lib/model.js';

const WHEN = [
  { id: 'none', label: 'Nessuna data' },
  { id: 'asap', label: 'Prima possibile', icon: 'Zap' },
  { id: 'date', label: 'Data', icon: 'CalendarDays' },
];

export function Editor({ item, isNew, banner, onSave, onDelete, onClose }) {
  const { areas, items, itemById, actions, today } = useApp();
  const [d, setD] = useState(item);
  const [step, setStep] = useState('');
  const [linking, setLinking] = useState(false);
  const [q, setQ] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch) => setD((cur) => ({ ...cur, ...patch }));
  const setWhen = (patch) => setD((cur) => ({ ...cur, when: { ...cur.when, ...patch } }));
  const doable = isDoable(d);
  const linked = (d.links || []).map((id) => itemById[id]).filter(Boolean);
  const candidates = useMemo(
    () =>
      linking
        ? items.filter((it) => it.id !== d.id && !(d.links || []).includes(it.id) && matches(it, q)).slice(0, 30)
        : [],
    [linking, items, d.id, d.links, q],
  );

  function save() {
    const title = d.title.trim();
    if (!title) {
      sfx.error();
      actions.toast('Scrivi almeno un titolo.');
      return;
    }
    const when = { ...d.when };
    if (when.kind !== 'date') {
      when.date = null;
      when.time = null;
    } else if (!when.date) {
      when.date = todayStr();
    }
    onSave({ ...d, title, when, recur: when.kind === 'date' ? d.recur : '' });
  }

  function addStep() {
    const t = step.trim();
    if (!t) return;
    set({ checklist: [...(d.checklist || []), { id: uid(), t, done: false }] });
    setStep('');
    sfx.tap();
  }

  const typeOptions = TYPE_IDS.map((id) => ({ id, label: TYPES[id].label, icon: TYPES[id].icon }));
  const prioOptions = PRIORITIES.map((p) => ({ id: p.id, label: p.label, className: `p-${p.id} prio-chip` }));
  const areaOptions = [{ id: '', label: 'Nessuna' }, ...areas.map((a) => ({ id: a.id, label: a.name, icon: a.icon }))];

  return (
    <Sheet
      title={isNew ? `Nuovo: ${TYPES[d.type].label.toLowerCase()}` : TYPES[d.type].label}
      kicker={banner ? null : isNew ? 'Nuovo elemento' : 'Modifica'}
      onClose={onClose}
      footer={
        <>
          {!isNew &&
            (confirmDelete ? (
              <button className="btn danger" onClick={() => onDelete(d)}>
                Conferma eliminazione
              </button>
            ) : (
              <button className="btn ghost" aria-label="Elimina" onClick={() => setConfirmDelete(true)}>
                <Icon name="Trash2" size={18} />
              </button>
            ))}
          <span className="grow" />
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <button className="btn primary" onClick={save}>
            Salva
          </button>
        </>
      }
    >
      {banner && (
        <div className="banner">
          <Icon name="Sparkles" size={18} />
          <span>{banner}</span>
        </div>
      )}

      <label className="field">
        <span className="field-label">Titolo</span>
        <input
          className="input title-input"
          value={d.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Cosa c'è da fare?"
          autoFocus={isNew && !d.title}
        />
      </label>

      <Field label="Tipo">
        <Chips options={typeOptions} value={d.type} onChange={(type) => set({ type })} label="Tipo" />
      </Field>

      <Field label="Importanza">
        <Chips options={prioOptions} value={d.priority} onChange={(priority) => set({ priority })} label="Importanza" />
      </Field>

      <Field label="Area" hint={areas.length ? null : 'Non hai ancora aree: le crei da Spazi › Aree.'}>
        <Chips options={areaOptions} value={d.area || ''} onChange={(area) => set({ area: area || null })} label="Area" />
      </Field>

      <Field label="Quando">
        <Chips options={WHEN} value={d.when.kind} onChange={(kind) => setWhen({ kind, date: kind === 'date' ? d.when.date || today : d.when.date })} label="Quando" />
        {d.when.kind === 'date' && (
          <>
            <div className="when-grid">
              <label>
                <span className="sr-only">Giorno</span>
                <input className="input" type="date" value={d.when.date || ''} onChange={(e) => setWhen({ date: e.target.value })} />
              </label>
              <label>
                <span className="sr-only">Ora (facoltativa)</span>
                <input className="input" type="time" value={d.when.time || ''} onChange={(e) => setWhen({ time: e.target.value || null })} />
              </label>
            </div>
            <div className="quick-dates">
              <button type="button" className="link-btn" onClick={() => setWhen({ date: today })}>
                Oggi
              </button>
              <button type="button" className="link-btn" onClick={() => setWhen({ date: addDays(today, 1) })}>
                Domani
              </button>
              <button type="button" className="link-btn" onClick={() => setWhen({ date: addDays(today, 7) })}>
                Tra una settimana
              </button>
              {d.when.time && (
                <button type="button" className="link-btn" onClick={() => setWhen({ time: null })}>
                  Togli l’ora
                </button>
              )}
            </div>
            <span className="field-label sub">Si ripete</span>
            <Chips options={RECURS} value={d.recur || ''} onChange={(recur) => set({ recur })} label="Ripetizione" />
          </>
        )}
      </Field>

      {doable && (
        <Field label="Stato">
          <Chips options={STATUSES} value={d.status} onChange={(status) => set({ status })} label="Stato" />
          {d.status === 'waiting' && (
            <input
              className="input"
              value={d.waitingFor || ''}
              onChange={(e) => set({ waitingFor: e.target.value })}
              placeholder="In attesa di chi o di cosa?"
              aria-label="In attesa di"
            />
          )}
        </Field>
      )}

      {d.type === 'oggetto' && (
        <div className="when-grid">
          <label className="field">
            <span className="field-label">Prezzo</span>
            <input className="input" value={d.price || ''} onChange={(e) => set({ price: e.target.value })} placeholder="es. 25 €" inputMode="decimal" />
          </label>
          <label className="field">
            <span className="field-label">Link o negozio</span>
            <input className="input" value={d.url || ''} onChange={(e) => set({ url: e.target.value })} placeholder="dove comprarlo" />
          </label>
        </div>
      )}

      <label className="field">
        <span className="field-label">Note</span>
        <textarea className="input" rows={3} value={d.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Dettagli, idee, cosa hai già provato…" />
      </label>

      <Field label="Passi">
        {(d.checklist || []).map((c) => (
          <div key={c.id} className={`step ${c.done ? 'done' : ''}`}>
            <button
              type="button"
              className="step-check"
              aria-pressed={c.done}
              aria-label={c.done ? `Segna da fare: ${c.t}` : `Segna fatto: ${c.t}`}
              onClick={() => {
                sfx.tap();
                set({ checklist: d.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) });
              }}
            >
              <Icon name={c.done ? 'SquareCheck' : 'Square'} size={20} />
            </button>
            <span className="step-text">{c.t}</span>
            <button type="button" className="icon-btn small" aria-label={`Togli: ${c.t}`} onClick={() => set({ checklist: d.checklist.filter((x) => x.id !== c.id) })}>
              <Icon name="X" size={16} />
            </button>
          </div>
        ))}
        <div className="step-add">
          <input
            className="input"
            value={step}
            onChange={(e) => setStep(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addStep();
              }
            }}
            placeholder="Aggiungi un passo"
            aria-label="Nuovo passo"
          />
          <button type="button" className="btn ghost" onClick={addStep} aria-label="Aggiungi passo">
            <Icon name="Plus" size={18} />
          </button>
        </div>
      </Field>

      <Field label="Collegati" hint={isNew ? 'Potrai collegare altri elementi dopo aver salvato.' : null}>
        {linked.map((it) => (
          <div key={it.id} className="linked">
            <Icon name={TYPES[it.type]?.icon} size={18} />
            <span className="linked-title">{it.title}</span>
            <span className="linked-type">{TYPES[it.type]?.label}</span>
            <button type="button" className="icon-btn small" aria-label={`Scollega: ${it.title}`} onClick={() => set({ links: d.links.filter((x) => x !== it.id) })}>
              <Icon name="Unlink" size={16} />
            </button>
          </div>
        ))}
        {!isNew &&
          (linking ? (
            <div className="link-picker">
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un elemento da collegare" aria-label="Cerca elemento" autoFocus />
              <div className="link-results">
                {candidates.map((it) => (
                  <button
                    type="button"
                    key={it.id}
                    className="linked pick"
                    onClick={() => {
                      sfx.tap();
                      set({ links: [...(d.links || []), it.id] });
                      setLinking(false);
                      setQ('');
                    }}
                  >
                    <Icon name={TYPES[it.type]?.icon} size={18} />
                    <span className="linked-title">{it.title}</span>
                    <span className="linked-type">{TYPES[it.type]?.label}</span>
                  </button>
                ))}
                {!candidates.length && <span className="field-hint">Nessun elemento trovato.</span>}
              </div>
            </div>
          ) : (
            <button type="button" className="btn ghost wide" onClick={() => setLinking(true)}>
              <Icon name="Link2" size={18} />
              Collega a un altro elemento
            </button>
          ))}
      </Field>
    </Sheet>
  );
}
