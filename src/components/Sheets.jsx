import { useEffect, useMemo, useState } from 'react';
import { CAL_COLORS } from '../lib/calendars.js';
import { subscribePush, currentPushId, testPush, pushSupported, isIOS, isStandalone } from '../lib/push.js';
import { Icon, ICON_GROUPS, AREA_SUGGESTIONS } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx, soundEnabled, setSoundEnabled } from '../lib/sound.js';
import { cloudEnabled, logout } from '../lib/firebase.js';
import { Sheet, Field, Empty, Chips } from './ui.jsx';
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

const SALVADANAIO_URL = 'https://salvadanaio11.vercel.app';

/* ---------- oggetto comprato ---------- */
export function BoughtSheet({ item, onClose }) {
  const { actions, settings, today } = useApp();
  const guess = parsePrice(item.price);
  const [paid, setPaid] = useState(guess != null ? String(guess).replace('.', ',') : '');
  const url = ((settings.salvadanaioUrl || '').trim() || SALVADANAIO_URL).replace(/\/+$/, '');

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
  // Apre Salvadanaio con la spesa già compilata (lì scegli la categoria e salvi).
  function toSalvadanaio() {
    const n = confirm();
    const q = new URLSearchParams({ nuova: '1', cosa: item.title, data: today || todayStr(), da: 'opifex' });
    if (n != null) q.set('importo', String(n));
    const where = (item.url || '').trim();
    if (where && !/^https?:/i.test(where)) q.set('dove', where);
    window.open(`${url}/?${q}`, '_blank', 'noopener');
    actions.toast('Comprato. Conferma la spesa in Salvadanaio.');
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
      <button className="btn ghost wide" onClick={toSalvadanaio}>
        <Icon name="Wallet" size={18} />
        Comprato e registra in Salvadanaio
      </button>
      <p className="field-hint">Salvadanaio si apre con la spesa già compilata: scegli la categoria e salva.</p>
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

/* ---------- notifiche ---------- */
const LEADS = [
  { id: '60', label: '1 ora' },
  { id: '120', label: '2 ore' },
  { id: '180', label: '3 ore' },
  { id: '1440', label: '1 giorno' },
];

function NotificationsBox() {
  const { settings, actions } = useApp();
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const devices = Object.keys(settings.push || {}).length;
  const on = !!(mine && settings.push?.[mine]);
  const lead = String(settings.notifyLead || 60);

  useEffect(() => {
    currentPushId().then(setMine).catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMsg('');
    try {
      const { id, sub } = await subscribePush();
      await actions.saveSettings({ push: { [id]: sub } });
      setMine(id);
      sfx.done();
      setMsg('Attivate. Ora tocca “Prova” per controllare che arrivino.');
    } catch (e) {
      sfx.error();
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setMsg('');
    try {
      const r = await testPush();
      setMsg(r.sent ? `Inviata a ${r.sent} ${r.sent === 1 ? 'dispositivo' : 'dispositivi'}: dovrebbe arrivare tra pochi secondi.` : 'Nessun dispositivo l’ha ricevuta: riattiva le notifiche.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const needsHome = isIOS() && !isStandalone();
  return (
    <section className="shortcut-box">
      <h3>
        <Icon name="Bell" size={18} /> Notifiche
      </h3>
      {!cloudEnabled ? (
        <p className="sheet-intro">Servono il login e il cloud.</p>
      ) : needsHome ? (
        <p className="sheet-intro">Su iPhone le notifiche funzionano solo aprendo Opifex dall’icona sulla schermata Home: in Safari tocca Condividi → “Aggiungi alla schermata Home”, poi apri Opifex da lì e torna qui.</p>
      ) : !pushSupported() ? (
        <p className="sheet-intro">Questo browser non supporta le notifiche.</p>
      ) : (
        <>
          <p className="sheet-intro">
            {on ? 'Attive su questo dispositivo.' : 'Non ancora attive su questo dispositivo.'}
            {devices > 0 && ` Dispositivi iscritti: ${devices}.`} Gli impegni con data senza orario e quelli “prima possibile” te li ricordo alle 9 del mattino.
          </p>
          <div className="row-btns">
            <button className="btn primary" disabled={busy} onClick={enable}>
              <Icon name="BellRing" size={18} />
              {on ? 'Riattiva' : 'Attiva notifiche'}
            </button>
            {devices > 0 && (
              <button className="btn ghost" disabled={busy} onClick={test}>
                <Icon name="Send" size={18} />
                Prova
              </button>
            )}
          </div>
        </>
      )}
      <span className="field-label sub">Riepilogo del mattino (notifica e in cima a Oggi)</span>
      <Chips
        options={[{ id: 'off', label: 'No' }, ...['06:30', '07:00', '07:30', '08:00', '08:30'].map((t) => ({ id: t, label: t }))]}
        value={settings.morningOff ? 'off' : settings.morningAt || '07:00'}
        onChange={(v) => actions.saveSettings(v === 'off' ? { morningOff: true } : { morningOff: false, morningAt: v })}
        label="Riepilogo del mattino"
      />
      <span className="field-label sub">Avvisami prima di un impegno con orario</span>
      <Chips options={LEADS} value={LEADS.some((l) => l.id === lead) ? lead : '60'} onChange={(v) => actions.saveSettings({ notifyLead: Number(v) })} label="Anticipo" />
      {msg && <p className="field-hint">{msg}</p>}
    </section>
  );
}

/* ---------- calendari Apple ---------- */
function CalendarsBox() {
  const { settings, actions } = useApp();
  const cals = settings.calendars || [];
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const save = (next) => actions.saveSettings({ calendars: next });
  function add() {
    const u = url.trim();
    if (!/^(webcals?|https):\/\//i.test(u)) {
      sfx.error();
      actions.toast('Incolla il link pubblico del calendario (inizia con webcal:// o https://).');
      return;
    }
    sfx.done();
    save([...cals, { id: uid(), name: name.trim() || `Calendario ${cals.length + 1}`, url: u, color: CAL_COLORS[cals.length % CAL_COLORS.length], on: true }]);
    setName('');
    setUrl('');
  }
  return (
    <section className="shortcut-box">
      <h3>
        <Icon name="CalendarDays" size={18} /> Calendari Apple
      </h3>
      <p className="sheet-intro">I tuoi eventi di iCloud compaiono nel Calendario di Opifex, in sola lettura e con il loro colore.</p>
      {!cloudEnabled && <p className="field-hint">Servono il login e il cloud.</p>}
      {cals.map((c) => (
        <div key={c.id} className="cal-line" style={{ '--cc': c.color }}>
          <i />
          <span className="grow">{c.name}</span>
          <button
            className={`chip ${c.on !== false ? 'on' : ''}`}
            aria-pressed={c.on !== false}
            onClick={() => save(cals.map((x) => (x.id === c.id ? { ...x, on: x.on === false } : x)))}
          >
            {c.on !== false ? 'Visibile' : 'Nascosto'}
          </button>
          <button className="icon-btn small" aria-label={`Togli ${c.name}`} onClick={() => (sfx.remove(), save(cals.filter((x) => x.id !== c.id)))}>
            <Icon name="Trash2" size={16} />
          </button>
        </div>
      ))}
      <div className="when-grid">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (es. Lavoro)" aria-label="Nome del calendario" />
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="webcal://p…icloud.com/…" aria-label="Link del calendario" />
      </div>
      <button className="btn ghost" onClick={add}>
        <Icon name="Plus" size={18} />
        Aggiungi calendario
      </button>
      <ol className="solution-steps">
        <li>Sull’iPhone apri Calendario → Calendari in basso → tocca la (i) accanto al calendario.</li>
        <li>Attiva “Calendario pubblico”, tocca “Condividi link…” → Copia, e incollalo qui sopra. Ripeti per ogni calendario.</li>
        <li>Chi ha il link può vedere gli eventi di quel calendario: tienilo per te.</li>
      </ol>
    </section>
  );
}

/* ---------- widget e contatti ---------- */
function WidgetBox() {
  const { actions } = useApp();
  async function copyScript() {
    try {
      const code = (await (await fetch('/opifex-widget.js', { cache: 'no-store' })).text()).replace('__SITE__', window.location.origin);
      await navigator.clipboard.writeText(code);
      sfx.done();
      actions.toast('Script copiato: incollalo in Scriptable.');
    } catch {
      sfx.error();
      actions.toast('Non sono riuscito a copiarlo.');
    }
  }
  return (
    <section className="shortcut-box">
      <h3>
        <Icon name="LayoutGrid" size={18} /> Widget (iPhone e Mac)
      </h3>
      <ol className="solution-steps">
        <li>Installa l’app gratuita Scriptable dall’App Store.</li>
        <li>
          Tocca qui sotto “Copia lo script”, poi in Scriptable tocca + , incolla e chiama lo script “Opifex”.
        </li>
        <li>Sulla Home tieni premuto → + → Scriptable → scegli la misura → aggiungi. Poi tieni premuto il widget → Modifica widget: Script = Opifex, Parametro = il tuo CAPTURE_TOKEN.</li>
        <li>Sul Mac (macOS Sonoma o successivo, stesso account Apple): clic destro sulla scrivania → Modifica widget → cerca Scriptable tra i widget dell’iPhone.</li>
      </ol>
      <button className="btn primary" onClick={copyScript}>
        <Icon name="Copy" size={18} />
        Copia lo script
      </button>
    </section>
  );
}

function ContactsBox() {
  return (
    <section className="shortcut-box">
      <h3>
        <Icon name="Users" size={18} /> Persone dai contatti
      </h3>
      <p className="sheet-intro">Un Comando rapido che ti fa scegliere un contatto della rubrica e lo aggiunge alle Persone di Opifex.</p>
      <CopyLine label="Indirizzo da usare nel comando" value={`${window.location.origin}/api/person`} />
      <ol className="solution-steps">
        <li>Nuovo comando → azione “Seleziona contatto”.</li>
        <li>“Ottieni contenuto di URL”: indirizzo qui sopra, metodo POST, corpo JSON con: name = Contatto › Nome, phone = Contatto › Numeri di telefono, email = Contatto › Indirizzi email, token = il tuo CAPTURE_TOKEN.</li>
        <li>“Mostra notifica” con il risultato. Chiamalo “Persona in Opifex”.</li>
      </ol>
    </section>
  );
}

/* ---------- temi ---------- */
const THEMES = [
  { id: 'neon', label: 'Neon', c: '#3dd6ff' },
  { id: 'terminale', label: 'Terminale', c: '#39ff88' },
  { id: 'glaciale', label: 'Glaciale', c: '#8ab4ff' },
  { id: 'aurora', label: 'Aurora', c: '#2ff5d8' },
  { id: 'solare', label: 'Solare', c: '#ffd84d' },
];
function ThemeBox() {
  const { settings, actions } = useApp();
  const cur = settings.theme || 'neon';
  return (
    <section className="shortcut-box">
      <h3>
        <Icon name="Palette" size={18} /> Tema
      </h3>
      <div className="themes" role="radiogroup" aria-label="Tema">
        {THEMES.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={cur === t.id}
            className={`theme-swatch ${cur === t.id ? 'on' : ''}`}
            style={{ '--sw': t.c }}
            onClick={() => {
              sfx.tap();
              document.documentElement.dataset.theme = t.id;
              actions.saveSettings({ theme: t.id });
            }}
          >
            <i />
            {t.label}
          </button>
        ))}
      </div>
      <p className="field-hint">Cambia il colore guida (e quello degli impegni normali). Critico e importante restano magenta e ambra.</p>
    </section>
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
            placeholder={SALVADANAIO_URL}
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

      <ThemeBox />

      <CalendarsBox />

      <WidgetBox />

      <ContactsBox />

      <NotificationsBox />

      {cloudEnabled && (
        <button className="setting" onClick={() => logout()}>
          <Icon name="LogOut" size={20} />
          <span className="setting-text">
            <strong>Esci</strong>
            <span>Chiude la sessione su questo dispositivo.</span>
          </span>
        </button>
      )}
      <p className="version">Opifex 0.6.0</p>
    </Sheet>
  );
}
