import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { Sheet, Empty, SectionTitle } from './ui.jsx';
import { ItemRow } from './ItemRow.jsx';
import { newItem, personItems, phoneDigits, isDone, sortItems } from '../lib/model.js';

const initials = (n) =>
  String(n || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

export function Avatar({ person, size = 40 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(person.title)}
    </span>
  );
}

// Scheda di una persona: contatti, cosa aspetti da lei, cose collegate.
export function PersonSheet({ person, onClose }) {
  const { items, actions } = useApp();
  const isNew = !items.some((it) => it.id === person.id);
  const [d, setD] = useState({ phone: '', email: '', ...person });
  const [confirm, setConfirm] = useState(false);
  const related = personItems(person, items);
  const waiting = sortItems(related.filter((it) => !isDone(it) && it.status === 'waiting'));
  const other = sortItems(related.filter((it) => !isDone(it) && it.status !== 'waiting'));
  const tel = phoneDigits(d.phone);
  const wa = tel.replace(/^\+/, '').replace(/^(?=3\d{8,9}$)/, '39');

  function save(close = true) {
    const title = (d.title || '').trim();
    if (!title) {
      sfx.error();
      actions.toast('Scrivi il nome.');
      return;
    }
    actions.save({ ...d, title, type: 'persona' });
    sfx.done();
    if (close) onClose();
  }

  return (
    <Sheet
      title={isNew ? 'Nuova persona' : d.title}
      kicker="Persona"
      onClose={onClose}
      footer={
        <>
          {!isNew &&
            (confirm ? (
              <button
                className="btn danger"
                onClick={() => {
                  actions.remove(person);
                  onClose();
                }}
              >
                Elimina davvero
              </button>
            ) : (
              <button className="icon-btn boxed" aria-label="Elimina persona" onClick={() => setConfirm(true)}>
                <Icon name="Trash2" size={18} />
              </button>
            ))}
          <span className="grow" />
          <button className="btn primary" onClick={() => save()}>
            <Icon name="Check" size={18} />
            Salva
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">Nome</span>
        <input className="input" value={d.title || ''} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="es. Marco Rossi" autoFocus={isNew} />
      </label>
      <div className="when-grid">
        <label className="field">
          <span className="field-label">Telefono</span>
          <input className="input" type="tel" value={d.phone || ''} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="+39 …" />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input className="input" type="email" value={d.email || ''} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="nome@…" />
        </label>
      </div>
      {(tel || d.email) && (
        <div className="contact-actions">
          {tel && (
            <a className="btn ghost" href={`tel:${tel}`}>
              <Icon name="Phone" size={18} />
              Chiama
            </a>
          )}
          {tel && (
            <a className="btn ghost" href={`sms:${tel}`}>
              <Icon name="MessageCircle" size={18} />
              Messaggio
            </a>
          )}
          {wa && (
            <a className="btn ghost" href={`https://wa.me/${wa.replace(/\D/g, '')}`} target="_blank" rel="noreferrer noopener">
              <Icon name="Send" size={18} />
              WhatsApp
            </a>
          )}
          {d.email && (
            <a className="btn ghost" href={`mailto:${d.email}`}>
              <Icon name="Mail" size={18} />
              Email
            </a>
          )}
        </div>
      )}
      <label className="field">
        <span className="field-label">Note</span>
        <textarea className="input" rows={2} value={d.notes || ''} onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="Chi è, cosa ricordare…" />
      </label>

      {!isNew && (
        <>
          <SectionTitle right={<span className="section-note">{waiting.length}</span>}>Aspetti da {d.title?.split(' ')[0]}</SectionTitle>
          {waiting.length ? (
            <div className="list">
              {waiting.map((it) => (
                <ItemRow key={it.id} item={it} />
              ))}
            </div>
          ) : (
            <p className="hint-line">Niente. Metti un impegno “in attesa” e scrivi il suo nome, oppure collegalo.</p>
          )}
          {other.length > 0 && (
            <>
              <SectionTitle>Cose con {d.title?.split(' ')[0]}</SectionTitle>
              <div className="list">
                {other.map((it) => (
                  <ItemRow key={it.id} item={it} showType />
                ))}
              </div>
            </>
          )}
          <button
            className="btn ghost wide"
            onClick={() => {
              save(false);
              onClose();
              actions.create({ links: [person.id], status: 'waiting', waitingFor: d.title }, { banner: `Collegato a ${d.title}` });
            }}
          >
            <Icon name="Plus" size={18} />
            Aspetto qualcosa da {d.title?.split(' ')[0]}
          </button>
        </>
      )}
    </Sheet>
  );
}

export function PeopleList() {
  const { items, actions } = useApp();
  const people = items.filter((it) => it.type === 'persona').sort((a, b) => (a.title || '').localeCompare(b.title || '', 'it'));
  if (!people.length)
    return (
      <Empty
        icon="Users"
        title="Nessuna persona"
        text="Aggiungi le persone da cui aspetti qualcosa o con cui hai cose in sospeso. Puoi importarle dai contatti dell’iPhone con un Comando rapido (Impostazioni)."
        action={
          <button className="btn primary" onClick={() => actions.edit(newItem({ type: 'persona' }))}>
            <Icon name="Plus" size={18} />
            Aggiungi persona
          </button>
        }
      />
    );
  return (
    <div className="list">
      {people.map((p) => {
        const rel = personItems(p, items).filter((it) => !isDone(it));
        const wait = rel.filter((it) => it.status === 'waiting').length;
        return (
          <button key={p.id} className="person-row" onClick={() => actions.edit(p)}>
            <Avatar person={p} />
            <span className="time-main">
              <strong>{p.title}</strong>
              <span className="behind-meta">
                {wait ? `aspetti ${wait} ${wait === 1 ? 'cosa' : 'cose'}` : rel.length ? `${rel.length} ${rel.length === 1 ? 'cosa' : 'cose'} in sospeso` : p.phone || 'nessuna cosa in sospeso'}
              </span>
            </span>
            {wait > 0 && <span className="quick-n">{wait}</span>}
            <Icon name="ChevronRight" size={18} />
          </button>
        );
      })}
    </div>
  );
}
