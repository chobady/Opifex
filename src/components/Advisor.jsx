import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { Sheet } from './ui.jsx';
import { solveProblem, planSolution } from '../lib/ai.js';
import { loadPhoto } from './Photos.jsx';

const EFFORT = { bassa: 'Poca fatica', media: 'Fatica media', alta: 'Molta fatica' };

// "Chiedi un'opinione": soluzioni per un problema, poi il piano che diventa impegni.
export function Advisor({ item, onClose }) {
  const { items, areas, actions, user } = useApp();
  const [extra, setExtra] = useState(item.advice?.extra || '');
  const [phase, setPhase] = useState('idle'); // idle | solving | planning
  const [error, setError] = useState('');
  const advice = item.advice;
  const busy = phase !== 'idle';

  async function ask() {
    setError('');
    setPhase('solving');
    sfx.send();
    try {
      const images = (await Promise.all((item.photos || []).slice(0, 3).map((id) => loadPhoto(user.uid, id).catch(() => null)))).filter(Boolean);
      const out = await solveProblem({ item, areas, items, extra, images });
      actions.save({
        ...item,
        advice: { at: Date.now(), extra, summary: out.summary, solutions: out.solutions, sources: out.sources || [], chosen: null },
      });
      sfx.reply();
    } catch (e) {
      sfx.error();
      setError(e.message || 'Qualcosa è andato storto. Riprova.');
    } finally {
      setPhase('idle');
    }
  }

  async function choose(index) {
    const solution = advice.solutions[index];
    setError('');
    setPhase('planning');
    sfx.send();
    try {
      const drafts = await planSolution({ item, solution, areas, items, extra: advice.extra || '' });
      if (!drafts.length) throw new Error('Non sono riuscito a fare il piano. Riprova.');
      actions.save({ ...item, advice: { ...advice, chosen: index } });
      sfx.reply();
      onClose();
      actions.propose(drafts, { linkTo: item.id, banner: `Piano per: ${solution.title}. Controlla e salva.` });
    } catch (e) {
      sfx.error();
      setError(e.message || 'Qualcosa è andato storto. Riprova.');
      setPhase('idle');
    }
  }

  return (
    <Sheet
      title="Chiedi un’opinione"
      kicker={item.title}
      onClose={onClose}
      footer={
        advice && !busy ? (
          <>
            <button className="btn ghost" onClick={ask}>
              <Icon name="Repeat" size={18} />
              Cerca di nuovo
            </button>
            <span className="grow" />
            <button className="btn ghost" onClick={onClose}>
              Chiudi
            </button>
          </>
        ) : null
      }
    >
      {busy && (
        <div className="thinking" role="status">
          <span className="thinking-orb" />
          <strong>{phase === 'solving' ? 'Sto cercando soluzioni…' : 'Sto preparando il piano…'}</strong>
          <span>{phase === 'solving' ? 'Cerco anche sul web come si risolve e dove comprare quello che serve.' : 'Trasformo la soluzione in cose da fare.'}</span>
        </div>
      )}

      {!busy && !advice && (
        <>
          <p className="sheet-intro">
            Leggo il problema, cerco sul web come si risolve e ti propongo alcune strade con pro, contro e costi. Poi scegli e ne faccio un piano.
          </p>
          <label className="field">
            <span className="field-label">Vuoi aggiungere qualcosa? (facoltativo)</span>
            <textarea className="input" rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Cosa hai già provato, quanto vuoi spendere, che tempo hai…" />
          </label>
          <button className="btn primary wide" onClick={ask}>
            <Icon name="Sparkles" size={18} />
            Trova soluzioni
          </button>
        </>
      )}

      {error && (
        <div className="banner error" role="alert">
          <Icon name="TriangleAlert" size={18} />
          <span>{error}</span>
        </div>
      )}

      {!busy && advice && (
        <>
          {advice.summary && (
            <div className="advice-summary">
              <Icon name="Lightbulb" size={20} />
              <p>{advice.summary}</p>
            </div>
          )}
          {advice.solutions.map((s, i) => (
            <article key={i} className={`solution ${advice.chosen === i ? 'chosen' : ''} ${i === 0 ? 'best' : ''}`}>
              <header>
                {i === 0 && <span className="solution-flag">Consigliata</span>}
                {advice.chosen === i && <span className="solution-flag chosen">Scelta</span>}
                <h3>{s.title}</h3>
                <span className="solution-meta">
                  <span className="meta-bit">
                    <Icon name="Gauge" size={13} strokeWidth={1.8} />
                    {EFFORT[s.effort]}
                  </span>
                  {s.cost && (
                    <span className="meta-bit">
                      <Icon name="Euro" size={13} strokeWidth={1.8} />
                      {s.cost}
                    </span>
                  )}
                </span>
              </header>
              {s.why && <p className="solution-why">{s.why}</p>}
              {(s.pros.length > 0 || s.cons.length > 0) && (
                <div className="proscons">
                  <ul className="pros">
                    {s.pros.map((x, k) => (
                      <li key={k}>{x}</li>
                    ))}
                  </ul>
                  <ul className="cons">
                    {s.cons.map((x, k) => (
                      <li key={k}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {s.steps.length > 0 && (
                <ol className="solution-steps">
                  {s.steps.map((x, k) => (
                    <li key={k}>{x}</li>
                  ))}
                </ol>
              )}
              <button className={`btn ${i === 0 ? 'primary' : 'ghost'} wide`} onClick={() => choose(i)}>
                <Icon name="Rocket" size={18} />
                {advice.chosen === i ? 'Rifai il piano' : 'Scegli questa e fai il piano'}
              </button>
            </article>
          ))}
          {advice.sources?.length > 0 && (
            <div className="sources">
              <span className="field-label">Fonti trovate sul web</span>
              {advice.sources.map((src) => (
                <a key={src.url} href={src.url} target="_blank" rel="noreferrer noopener" className="source">
                  <Icon name="ExternalLink" size={14} />
                  <span>{src.title}</span>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
