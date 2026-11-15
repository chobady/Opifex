import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppCtx } from './lib/ctx.js';
import { Icon } from './lib/icons.jsx';
import { sfx } from './lib/sound.js';
import { store } from './lib/store.js';
import { cloudEnabled, onAuth } from './lib/firebase.js';
import { newItem, complete, reopen, isDone, todayStr, relativeDate, uid, toggleHabitDay, habitStreak, doneOn } from './lib/model.js';
import { BADGES, badgeStats, earnedBadges } from './lib/badges.js';
import { Today } from './views/Today.jsx';
import { Calendar } from './views/Calendar.jsx';
import { Board } from './views/Board.jsx';
import { Spaces } from './views/Spaces.jsx';
import { Assistant } from './views/Assistant.jsx';
import { Login, Logo } from './views/Login.jsx';
import { Editor } from './components/Editor.jsx';
import { Proposals, SearchSheet, AreaSheet, AreaEditor, SettingsSheet, BoughtSheet } from './components/Sheets.jsx';
import { Advisor } from './components/Advisor.jsx';

const NAV = [
  { id: 'oggi', label: 'Oggi', icon: 'CircleDot' },
  { id: 'calendario', label: 'Calendario', icon: 'CalendarDays' },
  { id: 'bacheca', label: 'Bacheca', icon: 'Columns3' },
  { id: 'spazi', label: 'Spazi', icon: 'LayoutGrid' },
  { id: 'assistente', label: 'Assistente', icon: 'Sparkles' },
];

export default function App() {
  const [user, setUser] = useState(cloudEnabled ? undefined : { uid: 'local', email: null });
  useEffect(() => (cloudEnabled ? onAuth((u) => setUser(u || null)) : undefined), []);
  if (user === undefined)
    return (
      <div className="splash">
        <Logo size={88} />
      </div>
    );
  if (!user) return <Login />;
  return <Shell key={user.uid} user={user} />;
}

function useToday() {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const tick = () => setToday((t) => (t === todayStr() ? t : todayStr()));
    const id = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}

function Shell({ user }) {
  const [data, setData] = useState({ items: [], areas: [], settings: {}, ready: false });
  const [syncError, setSyncError] = useState(false);
  const [view, setView] = useState('oggi');
  const [spaceTab, setSpaceTab] = useState(null);
  const [editor, setEditor] = useState(null);
  const [proposals, setProposals] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [chat, setChat] = useState([]);
  const today = useToday();
  const toastTimer = useRef(null);

  useEffect(() => store.subscribe(user.uid, setData, () => setSyncError(true)), [user.uid]);

  const { items, areas } = data;
  const announced = useRef(new Set());
  const itemById = useMemo(() => Object.fromEntries(items.map((it) => [it.id, it])), [items]);
  const areaById = useMemo(() => Object.fromEntries(areas.map((a) => [a.id, a])), [areas]);

  const showToast = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);

  // Medaglie: si sbloccano da sole e si ricordano nelle impostazioni.
  useEffect(() => {
    if (!data.ready) return;
    const known = data.settings.badges || {};
    const fresh = earnedBadges(badgeStats(items, areas, data.settings, today)).filter((id) => !known[id] && !announced.current.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => announced.current.add(id));
    store.saveSettings(user.uid, { badges: { ...known, ...Object.fromEntries(fresh.map((id) => [id, today])) } }).catch(() => {});
    sfx.ring();
    const first = BADGES.find((b) => b.id === fresh[0]);
    showToast(fresh.length === 1 ? `Nuovo traguardo: ${first.name}.` : `${fresh.length} nuovi traguardi sbloccati.`);
  }, [items, areas, data.settings, data.ready, today, user.uid, showToast]);


  const persist = useCallback(
    (item) =>
      store.saveItem(user.uid, { ...item, updatedAt: Date.now() }).catch(() => {
        sfx.error();
        showToast('Non sono riuscito a salvare. Controlla la connessione.');
      }),
    [user.uid, showToast],
  );

  const actions = useMemo(() => {
    const draftToItem = (d, linkTo = null) => {
      const area = areas.find((a) => a.name.toLowerCase() === String(d.area || '').toLowerCase());
      const habit = d.type === 'abitudine';
      const mode = d.recur === 'weekdays' ? 'weekdays' : d.recur === 'weekly' || d.recur === 'monthly' ? 'times' : 'daily';
      return newItem({
        type: d.type,
        title: d.title,
        notes: d.notes || '',
        area: area?.id || null,
        priority: d.priority,
        when: habit ? { kind: 'none', date: null, time: null } : { kind: d.whenKind, date: d.date || null, time: d.time || null },
        recur: habit ? '' : d.recur || '',
        habit: habit ? { mode, perWeek: mode === 'times' ? (d.recur === 'monthly' ? 1 : 1) : 3 } : null,
        links: linkTo ? [linkTo] : [],
        checklist: (d.checklist || []).map((t) => ({ id: uid(), t, done: false })),
        price: d.price || '',
      });
    };
    return {
      toast: showToast,
      go(v, sub = null) {
        sfx.nav();
        setView(v);
        if (v === 'spazi') setSpaceTab(sub);
        window.scrollTo(0, 0);
      },
      edit(item) {
        sfx.open();
        setEditor({ item, isNew: false });
      },
      create(partial = {}, opts = {}) {
        sfx.open();
        setEditor({ item: newItem(partial), isNew: true, banner: opts.banner || null });
      },
      propose(drafts, opts = {}) {
        const list = drafts.map((d) => draftToItem(d, opts.linkTo || null));
        if (list.length === 1) setEditor({ item: list[0], isNew: true, banner: opts.banner || 'Proposta dell’assistente: controlla e salva.' });
        else setProposals(list);
      },
      save: persist,
      saveSettings(patch) {
        return store.saveSettings(user.uid, patch).catch(() => showToast('Non sono riuscito a salvare le impostazioni.'));
      },
      remove(item) {
        sfx.remove();
        (item.links || []).forEach((id) => {
          const other = itemById[id];
          if (other) persist({ ...other, links: (other.links || []).filter((x) => x !== item.id) });
        });
        store.removeItem(user.uid, item.id).catch(() => showToast('Non sono riuscito a eliminare.'));
      },
      advise(item) {
        sfx.open();
        setSheet({ kind: 'advisor', itemId: item.id });
      },
      toggleDone(item) {
        if (item.type === 'abitudine') {
          const wasDone = doneOn(item, today);
          const next = toggleHabitDay(item, today);
          if (wasDone) sfx.undo();
          else sfx.done();
          persist(next);
          if (!wasDone) {
            const st = habitStreak(next, today);
            if (st.n >= 2) showToast(`Serie: ${st.n} ${st.unit}. Continua così.`);
          }
          return;
        }
        if (isDone(item)) {
          sfx.undo();
          persist(reopen(item));
          return;
        }
        if (item.type === 'oggetto') {
          sfx.open();
          setSheet({ kind: 'bought', itemId: item.id });
          return;
        }
        const next = complete(item, today);
        sfx.done();
        persist(next);
        if (item.recur && next.when?.date) showToast(`Fatto. Prossima volta: ${relativeDate(next.when.date, today)}.`);
      },
      toggleFocus(item) {
        if (item.focusDate === today) {
          sfx.tap();
          persist({ ...item, focusDate: null });
          return;
        }
        const count = items.filter((it) => it.focusDate === today && !isDone(it)).length;
        if (count >= 3) {
          sfx.error();
          showToast('Il focus di oggi è già pieno: massimo tre cose.');
          return;
        }
        sfx.reply();
        persist({ ...item, focusDate: today });
      },
      setStatus(item, status) {
        if (status === 'done') {
          sfx.done();
          persist(complete(item, today));
        } else {
          sfx.tap();
          persist({ ...item, status, doneAt: null });
        }
      },
      saveArea(area) {
        store.saveArea(user.uid, area).catch(() => showToast('Non sono riuscito a salvare l’area.'));
      },
      removeArea(area) {
        sfx.remove();
        items.filter((it) => it.area === area.id).forEach((it) => persist({ ...it, area: null }));
        store.removeArea(user.uid, area.id).catch(() => showToast('Non sono riuscito a eliminare l’area.'));
        setSheet(null);
      },
      newArea() {
        sfx.open();
        setSheet({ kind: 'areaEditor', area: null });
      },
      editArea(area) {
        sfx.open();
        setSheet({ kind: 'areaEditor', area });
      },
      openArea(area) {
        sfx.open();
        setSheet({ kind: 'area', areaId: area.id });
      },
      openSettings() {
        sfx.open();
        setSheet({ kind: 'settings' });
      },
      openSearch() {
        sfx.open();
        setSheet({ kind: 'search' });
      },
    };
  }, [areas, items, itemById, today, persist, showToast, user.uid]);

  function saveFromEditor(next) {
    if (editor.draftIndex != null) {
      setProposals((p) => p.map((x, i) => (i === editor.draftIndex ? next : x)));
      setEditor(null);
      sfx.tap();
      return;
    }
    commit(next);
    sfx.done();
    setEditor(null);
  }

  function commit(next) {
    const prev = itemById[next.id];
    let out = next;
    if (next.status === 'done' && prev?.status !== 'done') out = complete({ ...next, status: 'todo' }, today);
    else if (next.status !== 'done') out = { ...next, doneAt: null };
    persist(out);
    // I collegamenti valgono in entrambe le direzioni.
    const before = new Set(prev?.links || []);
    const after = new Set(out.links || []);
    after.forEach((id) => {
      const other = itemById[id];
      if (other && !before.has(id) && !(other.links || []).includes(out.id)) persist({ ...other, links: [...(other.links || []), out.id] });
    });
    before.forEach((id) => {
      const other = itemById[id];
      if (other && !after.has(id)) persist({ ...other, links: (other.links || []).filter((x) => x !== out.id) });
    });
    return out;
  }

  function editorAction(next, kind) {
    const out = commit(next);
    if (kind === 'advise') {
      setEditor(null);
      sfx.open();
      setSheet({ kind: 'advisor', itemId: out.id });
    } else if (kind === 'newLinked') {
      sfx.open();
      setEditor({ item: newItem({ links: [out.id], area: out.area }), isNew: true, banner: `Collegato a: ${out.title}` });
    }
  }

  function deleteFromEditor(item) {
    sfx.remove();
    (item.links || []).forEach((id) => {
      const other = itemById[id];
      if (other) persist({ ...other, links: (other.links || []).filter((x) => x !== item.id) });
    });
    store.removeItem(user.uid, item.id).catch(() => showToast('Non sono riuscito a eliminare.'));
    setEditor(null);
  }

  function saveAllProposals() {
    proposals.forEach((it) => persist(it));
    // Gli elementi nati da un altro (es. il piano di un problema) vanno collegati anche nell'altro verso.
    const parents = {};
    proposals.forEach((it) => (it.links || []).forEach((pid) => (parents[pid] = [...(parents[pid] || []), it.id])));
    Object.entries(parents).forEach(([pid, ids]) => {
      const parent = itemById[pid];
      if (parent) persist({ ...parent, links: [...new Set([...(parent.links || []), ...ids])] });
    });
    sfx.ring();
    showToast(`${proposals.length} elementi salvati.`);
    setProposals(null);
  }

  const closeSheet = useCallback(() => {
    sfx.close();
    setSheet(null);
  }, []);
  const closeEditor = useCallback(() => {
    sfx.close();
    setEditor(null);
  }, []);
  const closeProposals = useCallback(() => {
    sfx.close();
    setProposals(null);
  }, []);

  const ctx = { user, items, areas, itemById, areaById, settings: data.settings, ready: data.ready, today, actions, spaceTab, chat, setChat };
  const sheetArea = sheet?.kind === 'area' ? areaById[sheet.areaId] : null;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        <nav className="nav" aria-label="Sezioni">
          <div className="nav-brand">
            <Logo size={34} />
            <span className="wordmark">OPIFEX</span>
          </div>
          {NAV.map((n) => (
            <button key={n.id} className={`nav-btn ${view === n.id ? 'on' : ''}`} aria-current={view === n.id ? 'page' : undefined} onClick={() => actions.go(n.id)}>
              <Icon name={n.icon} size={22} strokeWidth={view === n.id ? 1.9 : 1.6} />
              <span>{n.label}</span>
            </button>
          ))}
          <button className="nav-btn nav-settings" onClick={() => actions.openSettings()}>
            <Icon name="Settings" size={22} />
            <span>Impostazioni</span>
          </button>
        </nav>

        <main className="main">
          {syncError && (
            <div className="banner error" role="alert">
              <Icon name="CloudOff" size={18} />
              <span>Sincronizzazione bloccata: controlla le regole di Firestore (README, passo 4).</span>
            </div>
          )}
          {view === 'oggi' && <Today />}
          {view === 'calendario' && <Calendar />}
          {view === 'bacheca' && <Board />}
          {view === 'spazi' && <Spaces />}
          {view === 'assistente' && <Assistant />}
        </main>
      </div>

      {sheet?.kind === 'settings' && <SettingsSheet onClose={closeSheet} />}
      {sheet?.kind === 'search' && <SearchSheet onClose={closeSheet} />}
      {sheet?.kind === 'bought' && itemById[sheet.itemId] && <BoughtSheet item={itemById[sheet.itemId]} onClose={closeSheet} />}
      {sheet?.kind === 'advisor' && itemById[sheet.itemId] && <Advisor item={itemById[sheet.itemId]} onClose={closeSheet} />}
      {sheetArea && <AreaSheet area={sheetArea} onClose={closeSheet} onEditArea={(a) => setSheet({ kind: 'areaEditor', area: a })} />}
      {sheet?.kind === 'areaEditor' && <AreaEditor area={sheet.area} onClose={closeSheet} />}
      {proposals && (
        <Proposals
          drafts={proposals}
          onClose={closeProposals}
          onSaveAll={saveAllProposals}
          onDiscard={(i) => {
            sfx.remove();
            setProposals((p) => p.filter((_, j) => j !== i));
          }}
          onEdit={(i) => {
            sfx.open();
            setEditor({ item: proposals[i], isNew: true, draftIndex: i, banner: 'Sistema la proposta, poi salvala insieme alle altre.' });
          }}
        />
      )}
      {editor && (
        <Editor
          key={editor.item.id}
          item={editor.item}
          isNew={editor.isNew}
          banner={editor.banner}
          onSave={saveFromEditor}
          onAction={editorAction}
          onDelete={deleteFromEditor}
          onClose={closeEditor}
        />
      )}
      {toast && (
        <div key={toast.id} className="toast" role="status">
          {toast.text}
        </div>
      )}
    </AppCtx.Provider>
  );
}
