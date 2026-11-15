import { useMemo, useState } from 'react';
import { Icon, ICON_GROUPS, AREA_SUGGESTIONS } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx, soundEnabled, setSoundEnabled } from '../lib/sound.js';
import { cloudEnabled, logout } from '../lib/firebase.js';
import { Sheet, Field, Empty } from './ui.jsx';
import { ItemRow, ItemMeta } from './ItemRow.jsx';
import { TYPES, isDone, matches, sortItems, uid, parsePrice, money, todayStr } from '../lib/model.js';

/* ---------- proposte dell'assistente ---------- */
export function Proposals({ drafts, onEdit, onDiscard, onSaveAll, onClose }) {
  return (
    <Sheet
      title={`${drafts.length} proposte`}
      kicker="Assistente"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Annulla
          </button>
          <span className="grow" />
          <button className="btn primary" onClick={onSaveAll} disabled={!drafts.length}>
            Salva tutto
          </button>
        </>
      }
    >
      <p className="sheet-intro">Ho trovato più cose nel tuo pensiero. Tocca una riga per sistemarla prima di salvare.</p>
      {drafts.map((it, i) => (
        <div key={it.id} className={`row p-${it.priority}`}>
          <span className="type-badge">
            <Icon name={TYPES[it.type]?.icon} size={18} />
          </span>
          <button className="row-main" onClick={() => onEdit(i)}>
            <span className="row-title">{it.title}</span>
            <ItemMeta item={it} showType />
          </button>
          <button className="icon-btn small" aria-label={`Scarta: ${it.title}`} onClick={() => onDiscard(i)}>
            <Icon name="X" size={16} />
          </button>
        </div>
      ))}
    </Sheet>
  );
}

/* ---------- ricerca ---------- */
export function SearchSheet({ onClose }) {
  const { items } = useApp();
  const [q, setQ] = useState('');
  const results = useMemo(() => (q.trim() ? sortItems(items.filter((it) => it.type !== 'diario' && matches(it, q))).slice(0, 60) : []), [items, q]);
  return (
    <Sheet title="Cerca" onClose={onClose}>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca in tutto Opifex" aria-label="Cerca" autoFocus />
      <div className="list">
        {results.map((it) => (
          <ItemRow key={it.id} item={it} showType />
        ))}
      </div>
      {q.trim() && !results.length && <Empty icon="Search" title="Nessun risultato" text="Prova con un'altra parola." />}
    </Sheet>
  );
}

function CopyLine({ label, value }) {
  const { actions } = useApp();
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      actions.toast('Copiato.');
    } catch {
      actions.toast('Non sono riuscito a copiare: selezionalo a mano.');
    }
  }
  return (
    <div className="copy-line">
      <span className="field-label sub">{label}</span>
      <div className="copy-row">
        <code>{value}</code>
        <button type="button" className="icon-btn boxed" aria-label={`Copia: ${label}`} onClick={copy}>
          <Icon name="Copy" size={18} />
        </button>
      </div>
    </div>
  );
}

/* ---------- oggetto comprato ---------- */
export function BoughtSheet({ item, onClose }) {
  const { actions, settings, today } = useApp();
  const guess = parsePrice(item.price);
  const [paid, setPaid] = useState(guess != null ? String(guess).replace('.', ',') : '');
  const url = (settings.salvadanaioUrl || '').trim();

  function confirm() {
    const n = parsePrice(paid);
    actions.save({
      ...item,
      status: 'done',
      doneAt: today || todayStr(),
      paid: n != null ? String(n) : '',
      paidOn: today || todayStr(),
    });
    sfx.done();
    onClose();
    return n;
  }
  async function copyForSalvadanaio() {
    const n = confirm();
    const line = `${item.title}${n != null ? ` - ${money(n)}` : ''}`;
    try {
      await navigator.clipboard.writeText(line);
      actions.toast('Comprato. Ho copiato la spesa: incollala in Salvadanaio.');
    } catch {
      actions.toast('Comprato. Non sono riuscito a copiare la spesa.');
    }
    if (url) window.open(url, '_blank', 'noopener');
  }

  return (
    <Sheet title="Comprato" kicker={item.title} onClose={onClose}>
      <label className="field">
        <span className="field-label">Quanto l’hai pagato? (facoltativo)</span>
        <input className="input" value={paid} onChange={(e) => setPaid(e.target.value)} inputMode="decimal" placeholder="es. 24,90" autoFocus />
      </label>
      <button className="btn primary wide" onClick={confirm}>
        <Icon name="Check" size={18} />
        Segna comprato
      </button>
      <button className="btn ghost wide" onClick={copyForSalvadanaio}>
        <Icon name="Wallet" size={18} />
        Comprato e copia la spesa per Salvadanaio
      </button>
      {!url && <p className="field-hint">Nelle impostazioni puoi indicare l’indirizzo di Salvadanaio: lo apro dopo aver copiato la spesa.</p>}
    </Sheet>
  );
}

/* ---------- area: contenuto ---------- */
export function AreaSheet({ area, onClose, onEditArea }) {
  const { items, actions } = useApp();
  const open = sortItems(items.filter((it) => it.area === area.id && !isDone(it)));
  return (
    <Sheet
      title={area.name}
      kicker="Area"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={() => onEditArea(area)}>
            <Icon name="Pencil" size={18} />
            Modifica area
          </button>
          <span className="grow" />
          <button className="btn primary" onClick={() => actions.create({ area: area.id })}>
            <Icon name="Plus" size={18} />
            Aggiungi
          </button>
        </>
      }
    >
      <div className="list">
        {open.map((it) => (
          <ItemRow key={it.id} item={it} showType showArea={false} />
        ))}
      </div>
      {!open.length && <Empty icon={area.icon} title="Niente di aperto" text="In quest'area è tutto a posto." />}
    </Sheet>
  );
}

/* ---------- area: crea / modifica ---------- */
export function AreaEditor({ area, onClose }) {
  const { areas, actions } = useApp();
  const isNew = !area;
  const [name, setName] = useState(area?.name || '');
  const [icon, setIcon] = useState(area?.icon || 'House');
  const [confirm, setConfirm] = useState(false);
  const taken = areas.map((a) => a.name.toLowerCase());
  const suggestions = AREA_SUGGESTIONS.filter((s) => !taken.includes(s.name.toLowerCase()));

  function save() {
    const n = name.trim();
    if (!n) {
      sfx.error();
      actions.toast('Dai un nome all’area.');
      return;
    }
    actions.saveArea({ id: area?.id || uid(), name: n, icon, order: area?.order ?? Date.now() });
    sfx.done();
    onClose();
  }

  return (
    <Sheet
      title={isNew ? 'Nuova area' : 'Modifica area'}
      onClose={onClose}
      footer={
        <>
          {!isNew &&
            (confirm ? (
              <button
                className="btn danger"
                onClick={() => {
                  actions.removeArea(area);
                  onClose();
                }}
              >
                Conferma eliminazione
              </button>
            ) : (
              <button className="btn ghost" aria-label="Elimina area" onClick={() => setConfirm(true)}>
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
      <div className="area-preview">
        <span className="area-preview-icon">
          <Icon name={icon} size={30} />
        </span>
        <label className="field grow">
          <span className="field-label">Nome</span>
          <input className="input title-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Casa" autoFocus={isNew} />
        </label>
      </div>
      {isNew && suggestions.length > 0 && (
        <Field label="Idee veloci">
          <div className="chips">
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                className="chip"
                onClick={() => {
                  sfx.tap();
                  setName(s.name);
                  setIcon(s.icon);
                }}
              >
                <Icon name={s.icon} size={16} />
                {s.name}
              </button>
            ))}
          </div>
        </Field>
      )}
      {confirm && <p className="field-hint">Gli elementi di quest’area non vengono cancellati: restano senza area.</p>}
      {ICON_GROUPS.map((g) => (
        <Field key={g.label} label={g.label}>
          <div className="icon-grid">
            {g.icons.map((n) => (
              <button
                key={n}
                type="button"
                className={`icon-pick ${icon === n ? 'on' : ''}`}
                aria-label={`Icona ${n}`}
                aria-pressed={icon === n}
                onClick={() => {
                  sfx.tap();
                  setIcon(n);
                }}
              >
                <Icon name={n} size={22} />
              </button>
            ))}
          </div>
        </Field>
      ))}
    </Sheet>
  );
}

/* ---------- impostazioni ---------- */
export function SettingsSheet({ onClose }) {
  const { user, settings, actions } = useApp();
  const [sound, setSound] = useState(soundEnabled());
  const [sal, setSal] = useState(settings.salvadanaioUrl || '');
  return (
    <Sheet title="Impostazioni" onClose={onClose}>
      <button
        className="setting"
        aria-pressed={sound}
        onClick={() => {
          setSoundEnabled(!sound);
          setSound(!sound);
        }}
      >
        <Icon name={sound ? 'Volume2' : 'VolumeX'} size={20} />
        <span className="setting-text">
          <strong>Suoni</strong>
          <span>{sound ? 'Attivi' : 'Disattivati'}</span>
        </span>
        <span className={`switch ${sound ? 'on' : ''}`} />
      </button>

      <div className="setting static">
        <Icon name={cloudEnabled ? 'Cloud' : 'HardDrive'} size={20} />
        <span className="setting-text">
          <strong>{cloudEnabled ? 'Sincronizzazione attiva' : 'Modalità locale'}</strong>
          <span>
            {cloudEnabled
              ? `Accesso come ${user.email}. I dati si aggiornano su tutti i tuoi dispositivi.`
              : 'I dati restano solo su questo dispositivo finché non colleghi Firebase (vedi README).'}
          </span>
        </span>
      </div>

      <label className="setting static">
        <Icon name="Wallet" size={20} />
        <span className="setting-text">
          <strong>Indirizzo di Salvadanaio</strong>
          <input
            className="input"
            type="url"
            value={sal}
            onChange={(e) => setSal(e.target.value)}
            onBlur={() => actions.saveSettings({ salvadanaioUrl: sal.trim() })}
            placeholder="https://…"
            aria-label="Indirizzo di Salvadanaio"
          />
        </span>
      </label>

      <section className="shortcut-box">
        <h3>
          <Icon name="Mic" size={18} /> Comandi Rapidi (dettatura)
        </h3>
        <p className="sheet-intro">
          Un pulsante sulla Home dell’iPhone: lo tocchi, detti, e Opifex fa ordinare il pensiero a Gemini e lo salva da solo. Funziona anche sull’Apple Watch.
        </p>
        <CopyLine label="Indirizzo da usare nel comando" value={`${window.location.origin}/api/capture`} />
        {user?.uid && <CopyLine label="Il tuo codice utente (va in OWNER_UID su Vercel)" value={user.uid} />}
        <ol className="solution-steps">
          <li>Su Vercel aggiungi le variabili CAPTURE_TOKEN (un codice segreto che inventi), OWNER_UID (quello qui sopra) e FIREBASE_SERVICE_ACCOUNT (la chiave di servizio di Firebase), poi Redeploy.</li>
          <li>Nell’app Comandi crea un comando nuovo con l’azione “Detta testo” (lingua italiana).</li>
          <li>Aggiungi “Ottieni contenuto di URL”: indirizzo qui sopra, metodo POST, corpo JSON con due campi di testo: text = il testo dettato, token = il tuo CAPTURE_TOKEN.</li>
          <li>Aggiungi “Mostra notifica” con il risultato dell’azione precedente.</li>
          <li>Chiama il comando “Opifex”, tocca i tre puntini in alto e scegli “Aggiungi alla schermata Home”.</li>
        </ol>
      </section>

      <div className="setting static">
        <Icon name="Bell" size={20} />
        <span className="setting-text">
          <strong>Notifiche su iPhone</strong>
          <span>In arrivo. Intanto aggiungi Opifex alla schermata Home: in Safari tocca Condividi, poi “Aggiungi a Home”.</span>
        </span>
      </div>

      {cloudEnabled && (
        <button className="setting" onClick={() => logout()}>
          <Icon name="LogOut" size={20} />
          <span className="setting-text">
            <strong>Esci</strong>
            <span>Chiude la sessione su questo dispositivo.</span>
          </span>
        </button>
      )}
      <p className="version">Opifex 0.2.0</p>
    </Sheet>
  );
}
