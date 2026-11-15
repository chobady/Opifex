import { useEffect, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { askAssistant } from '../lib/ai.js';
import { cloudEnabled } from '../lib/firebase.js';
import { Empty } from '../components/ui.jsx';

const QUICK = [
  { label: 'Riepilogo di oggi', q: 'Fammi il riepilogo di oggi: cosa ho in programma, cosa è scaduto e da cosa conviene partire.' },
  { label: 'Revisione della settimana', q: 'Fammi la revisione della settimana: cosa ho chiuso negli ultimi 7 giorni, cosa è rimasto indietro e cosa mi aspetta nei prossimi 7.' },
  { label: 'Cosa ho in sospeso?', q: 'Cosa ho in sospeso, raggruppato per area?' },
  { label: 'Cosa sto aspettando?', q: 'Quali impegni sono in attesa di qualcuno o qualcosa?' },
];

export function Assistant() {
  const { items, areas, chat, setChat } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chat, busy]);

  async function ask(question) {
    const q = question.trim();
    if (!q || busy) return;
    const history = chat.filter((m) => !m.error);
    setChat((c) => [...c, { role: 'user', text: q }]);
    setText('');
    setBusy(true);
    sfx.send();
    try {
      const answer = await askAssistant({ question: q, history, items, areas });
      sfx.reply();
      setChat((c) => [...c, { role: 'model', text: answer }]);
    } catch (err) {
      sfx.error();
      setChat((c) => [...c, { role: 'model', text: err.message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="view assistant">
      <header className="topbar">
        <div className="brand">
          <span className="kicker">Assistente</span>
          <h1>Chiedi ai tuoi dati</h1>
        </div>
        {chat.length > 0 && (
          <button className="btn ghost" onClick={() => setChat([])}>
            Nuova chat
          </button>
        )}
      </header>

      {!cloudEnabled ? (
        <Empty icon="Sparkles" title="Assistente non collegato" text="L'assistente funziona dopo aver collegato Firebase e la chiave Gemini su Vercel (vedi README)." />
      ) : (
        <>
          <div className="chat">
            {!chat.length && (
              <div className="chat-intro">
                <span className="empty-icon">
                  <Icon name="Sparkles" size={26} />
                </span>
                <p>Conosco i tuoi impegni, obiettivi, problemi e oggetti. Chiedimi un riepilogo o un consiglio.</p>
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className={`bubble ${m.role} ${m.error ? 'error' : ''}`}>
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="bubble model typing" role="status" aria-label="L'assistente sta scrivendo">
                <i />
                <i />
                <i />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="chips scroll-x quick">
            {QUICK.map((p) => (
              <button key={p.label} className="chip" onClick={() => ask(p.q)} disabled={busy}>
                {p.label}
              </button>
            ))}
          </div>

          <form
            className="capture chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <label className="capture-input">
              <span className="sr-only">Domanda per l'assistente</span>
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi una domanda…" enterKeyHint="send" autoComplete="off" />
            </label>
            <button type="submit" className="capture-btn send" aria-label="Invia" disabled={busy || !text.trim()}>
              <Icon name="Send" size={20} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
