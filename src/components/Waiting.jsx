import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { Sheet } from './ui.jsx';
import { Avatar } from './People.jsx';

// Se il nome corrisponde a una persona salvata, la collega all'impegno.
export function withWaiting(item, name, items) {
  const who = name.trim();
  const person = items.find((p) => p.type === 'persona' && (p.title || '').trim().toLowerCase() === who.toLowerCase());
  const links = person && !(item.links || []).includes(person.id) ? [...(item.links || []), person.id] : item.links || [];
  return { ...item, status: 'waiting', waitingFor: who, doneAt: null, links };
}

// "In attesa di chi?": obbligatorio quando metti un impegno in attesa.
export function WaitingSheet({ item, onClose }) {
  const { items, actions } = useApp();
  const [name, setName] = useState(item.waitingFor || '');
  const people = items.filter((p) => p.type === 'persona').sort((a, b) => (a.title || '').localeCompare(b.title || '', 'it'));
  const ok = name.trim().length > 0;

  function confirm(who = name) {
    if (!who.trim()) {
      sfx.error();
      return;
    }
    actions.save(withWaiting(item, who, items));
    sfx.tap();
    onClose();
  }

  return (
    <Sheet
      title="In attesa di chi?"
      kicker={item.title}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <span className="grow" />
          <button className="btn primary" disabled={!ok} onClick={() => confirm()}>
            <Icon name="Hourglass" size={18} />
            Metti in attesa
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">Nome</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && confirm()}
          placeholder="es. Marco, il commercialista, l’idraulico…"
          autoFocus
        />
      </label>
      {people.length > 0 && (
        <div className="people-pick">
          {people.map((p) => (
            <button key={p.id} className={`person-chip ${name.trim().toLowerCase() === (p.title || '').toLowerCase() ? 'on' : ''}`} onClick={() => confirm(p.title)}>
              <Avatar person={p} size={26} />
              {p.title}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
