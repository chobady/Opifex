import { useMemo, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { Sheet, Chips, Empty } from './ui.jsx';
import { ItemRow, ItemMeta } from './ItemRow.jsx';
import { planSolution } from '../lib/ai.js';
import {
  behind, postpone, fitsIn, addDays, diffDays, isDone, sortItems, startOfWeek, longDate, newItem, durationLabel, PRIORITY,
} from '../lib/model.js';

export const reviewWeek = (today) => (new Date(`${today}T12:00:00`).getDay() === 0 ? addDays(today, 1) : startOfWeek(today));

/* ---------- rimetti in ordine ---------- */
function BehindRow({ item }) {
  const { actions, today, areas, items } = useApp();
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const late = diffDays(today, item.when.date);

  const move = (date) => {
    sfx.done();
    actions.save(postpone(item, date));
  };
  async function split() {
    setBusy(true);
    sfx.send();
    try {
      const drafts = await planSolution({
        item,
        solution: { title: 'Spezzare in passi piccoli e concreti', why: `È rimasto indietro (rimandato ${item.slips || 0} volte): va diviso in azioni brevi da fare una alla volta.`, steps: [] },
        areas,
        items,
      });
      if (!drafts.length) throw new Error('Non sono riuscito a spezzarlo. Riprova.');
      // L'originale diventa un obiettivo: i passi nuovi sono le sue tappe e il progresso si calcola da solo.
      actions.save({ ...item, type: 'obiettivo', when: { kind: 'none', date: null, time: null }, recur: '', status: 'todo' });
      actions.propose(drafts, { linkTo: item.id, banner: `Passi per: ${item.title}. Controlla e salva.` });
    } catch (e) {
      sfx.error();
      actions.toast(e.message || 'Qualcosa è andato storto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`behind p-${item.priority}`}>
      <button className="behind-main" onClick={() => actions.edit(item)}>
        <strong>{item.title}</strong>
        <span className="behind-meta">
          {late === 1 ? 'da ieri' : `da ${late} giorni`}
          {item.slips > 0 && ` · rimandato ${item.slips} ${item.slips === 1 ? 'volta' : 'volte'}`}
          {' · '}
          {PRIORITY[item.priority]?.label}
        </span>
      </button>
      <div className="behind-actions">
        <button className="chip" onClick={() => move(today)}>
          Oggi
        </button>
        <button className="chip" onClick={() => move(addDays(today, 1))}>
          Domani
        </button>
        <button className="chip" onClick={() => setPick((v) => !v)} aria-expanded={pick}>
          <Icon name="CalendarDays" size={14} />
          Data
        </button>
        <button className={`chip ${item.slips >= 2 ? 'hot' : ''}`} disabled={busy} onClick={split}>
          <Icon name={busy ? 'LoaderCircle' : 'Scissors'} size={14} className={busy ? 'spin' : ''} />
          Spezza
        </button>
        <button
          className="chip"
          onClick={() => {
            sfx.tap();
            actions.save({ ...item, someday: true });
          }}
        >
          <Icon name="Hourglass" size={14} />
          Forse
        </button>
        <button className="chip danger" onClick={() => actions.remove(item)} aria-label={`Elimina: ${item.title}`}>
          <Icon name="Trash2" size={14} />
        </button>
      </div>
      {pick && <input className="input" type="date" min={today} defaultValue={addDays(today, 2)} onChange={(e) => e.target.value && move(e.target.value)} aria-label="Nuova data" />}
    </article>
  );
}

export function BehindList() {
  const { items, today } = useApp();
  const list = sortItems(behind(items, today));
  if (!list.length) return <Empty icon="ShieldCheck" title="Niente indietro" text="Tutti gli impegni sono in pari." />;
  return (
    <div className="list">
      {list.map((it) => (
        <BehindRow key={it.id} item={it} />
      ))}
    </div>
  );
}

export function CatchUp({ onClose }) {
  const { items, today } = useApp();
  const n = behind(items, today).length;
  return (
    <Sheet title="Rimetti in ordine" kicker={n ? `${n} rimasti indietro` : 'Tutto in pari'} onClose={onClose}>
      <p className="sheet-intro">Per ognuno scegli: lo rifai oggi o domani, gli dai una data, lo spezzi in passi più piccoli con l’assistente, lo parcheggi in “un giorno, forse” o lo elimini.</p>
      <BehindList />
    </Sheet>
  );
}

/* ---------- ho tempo ---------- */
const SPANS = [10, 15, 30, 60, 120];
export function TimeSheet({ onClose }) {
  const { items, today, actions } = useApp();
  const [min, setMin] = useState(30);
  const { fit, unknown } = useMemo(() => fitsIn(items, min, today), [items, min, today]);
  const start = (it) => {
    onClose();
    actions.focus(it);
  };
  const Row = ({ it }) => (
    <button className={`time-row p-${it.priority}`} onClick={() => start(it)}>
      <span className="time-dur">{it.minutes ? durationLabel(it.minutes) : '?'}</span>
      <span className="time-main">
        <strong>{it.title}</strong>
        <ItemMeta item={it} />
      </span>
      <Icon name="Play" size={18} />
    </button>
  );
  return (
    <Sheet title="Quanto tempo hai?" kicker="Ho tempo" onClose={onClose}>
      <Chips options={SPANS.map((m) => ({ id: String(m), label: durationLabel(m) }))} value={String(min)} onChange={(v) => setMin(Number(v))} label="Tempo libero" />
      {fit.length > 0 ? (
        <div className="list">
          {fit.map((it) => (
            <Row key={it.id} it={it} />
          ))}
        </div>
      ) : (
        <p className="hint-line">Nessun impegno con una durata che ci sta. Dai una durata agli impegni dall’editor (“Quanto ci vuole”).</p>
      )}
      {unknown.length > 0 && (
        <>
          <span className="field-label sub">Senza durata</span>
          <div className="list">
            {unknown.slice(0, 8).map((it) => (
              <Row key={it.id} it={it} />
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

/* ---------- revisione della settimana ---------- */
const STEPS = ['Inbox', 'Rimasti indietro', 'La settimana che arriva', 'Tre obiettivi', 'Com’è andata'];

export function WeeklyReview({ onClose }) {
  const { items, today, actions, settings } = useApp();
  const week = reviewWeek(today);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(settings.weekFocus?.week === week ? settings.weekFocus.ids || [] : []);
  const [text, setText] = useState('');
  const inbox = items.filter((it) => it.type === 'nota' && !isDone(it));
  const coming = sortItems(
    items.filter((it) => !isDone(it) && !it.someday && it.type !== 'diario' && it.when?.kind === 'date' && it.when.date >= week && it.when.date <= addDays(week, 6)),
  ).sort((a, b) => (a.when.date < b.when.date ? -1 : a.when.date > b.when.date ? 1 : 0));
  const candidates = sortItems(items.filter((it) => (it.type === 'impegno' || it.type === 'obiettivo') && !isDone(it) && !it.someday));

  function finish() {
    if (text.trim()) actions.save(newItem({ type: 'diario', title: 'Revisione della settimana', notes: text.trim(), mood: 3, day: today }));
    actions.saveSettings({ lastReview: week, weekFocus: { week, ids: picked } });
    sfx.ring();
    actions.toast('Revisione fatta. Buona settimana.');
    onClose();
  }

  const toggle = (id) => {
    sfx.tap();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  };

  return (
    <Sheet
      title={STEPS[step]}
      kicker={`Revisione · passo ${step + 1} di ${STEPS.length}`}
      onClose={onClose}
      footer={
        <>
          {step > 0 && (
            <button className="btn ghost" onClick={() => setStep(step - 1)}>
              <Icon name="ArrowLeft" size={18} />
              Indietro
            </button>
          )}
          <span className="grow" />
          {step < STEPS.length - 1 ? (
            <button
              className="btn primary"
              onClick={() => {
                sfx.nav();
                setStep(step + 1);
              }}
            >
              Avanti
              <Icon name="ArrowRight" size={18} />
            </button>
          ) : (
            <button className="btn primary" onClick={finish}>
              <Icon name="Check" size={18} />
              Chiudi la settimana
            </button>
          )}
        </>
      }
    >
      <div className="review-steps" aria-hidden="true">
        {STEPS.map((s, i) => (
          <i key={s} className={i < step ? 'past' : i === step ? 'now' : ''} />
        ))}
      </div>

      {step === 0 &&
        (inbox.length ? (
          <>
            <p className="sheet-intro">Svuota la Inbox: apri ogni pensiero e trasformalo in un impegno, un obiettivo, un oggetto… oppure eliminalo.</p>
            <div className="list">
              {inbox.map((it) => (
                <ItemRow key={it.id} item={it} />
              ))}
            </div>
          </>
        ) : (
          <Empty icon="Inbox" title="Inbox vuota" text="Niente da ordinare. Avanti." />
        ))}

      {step === 1 && <BehindList />}

      {step === 2 &&
        (coming.length ? (
          <div className="list">
            {coming.map((it, i) => (
              <div key={it.id}>
                {(i === 0 || coming[i - 1].when.date !== it.when.date) && <span className="field-label sub day-label">{longDate(it.when.date)}</span>}
                <ItemRow item={it} />
              </div>
            ))}
          </div>
        ) : (
          <Empty icon="CalendarDays" title="Settimana libera" text={`Niente in calendario dal ${longDate(week).toLowerCase()}.`} />
        ))}

      {step === 3 && (
        <>
          <p className="sheet-intro">Scegli fino a tre cose che vuoi davvero portare a casa questa settimana. Le vedrai in cima a Oggi.</p>
          <div className="list">
            {candidates.slice(0, 40).map((it) => (
              <button key={it.id} className={`pick-row p-${it.priority} ${picked.includes(it.id) ? 'on' : ''}`} aria-pressed={picked.includes(it.id)} onClick={() => toggle(it.id)}>
                <span className="pick-box">{picked.includes(it.id) && <Icon name="Check" size={14} strokeWidth={3} />}</span>
                <span className="time-main">
                  <strong>{it.title}</strong>
                  <ItemMeta item={it} showType />
                </span>
              </button>
            ))}
          </div>
          <p className="field-hint">{picked.length}/3 scelti</p>
        </>
      )}

      {step === 4 && (
        <>
          <p className="sheet-intro">Due righe sulla settimana passata: cosa è andato bene, cosa cambieresti. Finiscono nel diario (puoi anche lasciarlo vuoto).</p>
          <textarea className="input" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Questa settimana…" aria-label="Riflessione" />
        </>
      )}
    </Sheet>
  );
}
