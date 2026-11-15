// Traguardi: medaglie che si sbloccano da sole in base a cio' che fai.
import { doneEvents, habitStreak, isDone } from './model.js';

// Ogni livello ha un colore diverso (vedi .medal.t1/.t2/.t3 nel CSS).
export const BADGES = [
  { id: 'first', icon: 'Rocket', tier: 1, name: 'Partenza', text: 'Completa la tua prima cosa', test: (s) => s.done >= 1 },
  { id: 'done10', icon: 'CircleCheck', tier: 1, name: 'Dieci', text: 'Completa 10 cose', test: (s) => s.done >= 10 },
  { id: 'done50', icon: 'Zap', tier: 2, name: 'Cinquanta', text: 'Completa 50 cose', test: (s) => s.done >= 50 },
  { id: 'done100', icon: 'Flame', tier: 2, name: 'Cento', text: 'Completa 100 cose', test: (s) => s.done >= 100 },
  { id: 'done250', icon: 'Medal', tier: 3, name: 'Duecentocinquanta', text: 'Completa 250 cose', test: (s) => s.done >= 250 },
  { id: 'done500', icon: 'Crown', tier: 3, name: 'Cinquecento', text: 'Completa 500 cose', test: (s) => s.done >= 500 },

  { id: 'crit1', icon: 'Shield', tier: 1, name: 'Sotto pressione', text: 'Chiudi un impegno critico', test: (s) => s.critical >= 1 },
  { id: 'crit10', icon: 'ShieldCheck', tier: 2, name: 'Nervi saldi', text: 'Chiudi 10 impegni critici', test: (s) => s.critical >= 10 },
  { id: 'crit30', icon: 'Crown', tier: 3, name: 'Imperturbabile', text: 'Chiudi 30 impegni critici', test: (s) => s.critical >= 30 },

  { id: 'goal1', icon: 'Target', tier: 1, name: 'Centro', text: 'Raggiungi il tuo primo obiettivo', test: (s) => s.goals >= 1 },
  { id: 'goal3', icon: 'Target', tier: 2, name: 'Tre bersagli', text: 'Raggiungi 3 obiettivi', test: (s) => s.goals >= 3 },
  { id: 'goal10', icon: 'Trophy', tier: 3, name: 'Cacciatore di traguardi', text: 'Raggiungi 10 obiettivi', test: (s) => s.goals >= 10 },

  { id: 'streak3', icon: 'Repeat', tier: 1, name: 'Ci siamo', text: 'Una serie di 3 giorni in un’abitudine', test: (s) => s.bestStreak >= 3 },
  { id: 'streak7', icon: 'Flame', tier: 1, name: 'Una settimana', text: 'Una serie di 7 giorni', test: (s) => s.bestStreak >= 7 },
  { id: 'streak14', icon: 'Flame', tier: 2, name: 'Due settimane', text: 'Una serie di 14 giorni', test: (s) => s.bestStreak >= 14 },
  { id: 'streak30', icon: 'Flame', tier: 2, name: 'Un mese', text: 'Una serie di 30 giorni', test: (s) => s.bestStreak >= 30 },
  { id: 'streak100', icon: 'Crown', tier: 3, name: 'Cento giorni', text: 'Una serie di 100 giorni', test: (s) => s.bestStreak >= 100 },

  { id: 'habit50', icon: 'Activity', tier: 2, name: 'Costanza', text: 'Fai 50 volte le tue abitudini', test: (s) => s.habitChecks >= 50 },
  { id: 'habit200', icon: 'Activity', tier: 3, name: 'Metodo', text: 'Fai 200 volte le tue abitudini', test: (s) => s.habitChecks >= 200 },

  { id: 'perfect1', icon: 'Orbit', tier: 1, name: 'Anelli chiusi', text: 'Chiudi tutti gli anelli in un giorno', test: (s) => s.perfectDays >= 1 },
  { id: 'perfect7', icon: 'Orbit', tier: 2, name: 'Sette giorni perfetti', text: 'Chiudi tutti gli anelli per 7 giorni', test: (s) => s.perfectDays >= 7 },
  { id: 'perfect30', icon: 'Orbit', tier: 3, name: 'Orbita stabile', text: 'Chiudi tutti gli anelli per 30 giorni', test: (s) => s.perfectDays >= 30 },

  { id: 'problem1', icon: 'Wrench', tier: 1, name: 'Aggiustatutto', text: 'Risolvi un problema', test: (s) => s.problems >= 1 },
  { id: 'problem5', icon: 'Wrench', tier: 2, name: 'Mano d’oro', text: 'Risolvi 5 problemi', test: (s) => s.problems >= 5 },
  { id: 'advice1', icon: 'Lightbulb', tier: 1, name: 'Seconda opinione', text: 'Chiedi un parere all’assistente su un problema', test: (s) => s.advised >= 1 },

  { id: 'buy1', icon: 'ShoppingBag', tier: 1, name: 'Procurato', text: 'Compra la prima cosa della lista', test: (s) => s.bought >= 1 },
  { id: 'buy10', icon: 'ShoppingCart', tier: 2, name: 'Lista svuotata', text: 'Compra 10 cose della lista', test: (s) => s.bought >= 10 },

  { id: 'areas3', icon: 'LayoutGrid', tier: 1, name: 'Mappa della vita', text: 'Crea 3 aree', test: (s) => s.areas >= 3 },
  { id: 'areas6', icon: 'LayoutGrid', tier: 2, name: 'Cartografo', text: 'Crea 6 aree', test: (s) => s.areas >= 6 },

  { id: 'diary1', icon: 'NotebookPen', tier: 1, name: 'Caro diario', text: 'Scrivi la prima pagina del diario', test: (s) => s.diary >= 1 },
  { id: 'diary7', icon: 'NotebookPen', tier: 2, name: 'Sette pagine', text: 'Scrivi 7 pagine di diario', test: (s) => s.diary >= 7 },
  { id: 'diary30', icon: 'Library', tier: 3, name: 'Cronista di sé', text: 'Scrivi 30 pagine di diario', test: (s) => s.diary >= 30 },

  { id: 'days7', icon: 'CalendarDays', tier: 1, name: 'Sette giorni attivi', text: 'Completa qualcosa in 7 giorni diversi', test: (s) => s.activeDays >= 7 },
  { id: 'days30', icon: 'CalendarDays', tier: 2, name: 'Trenta giorni attivi', text: 'Completa qualcosa in 30 giorni diversi', test: (s) => s.activeDays >= 30 },
  { id: 'days100', icon: 'CalendarDays', tier: 3, name: 'Cento giorni attivi', text: 'Completa qualcosa in 100 giorni diversi', test: (s) => s.activeDays >= 100 },
];

export function badgeStats(items, areas, settings = {}, today) {
  const events = doneEvents(items);
  const habits = items.filter((it) => it.type === 'abitudine');
  const bestStreak = habits.reduce((m, h) => {
    const st = habitStreak(h, today);
    return Math.max(m, h.habit?.mode === 'times' ? st.n * 7 : st.n);
  }, 0);
  return {
    done: events.length,
    critical: events.filter((e) => e.item.type === 'impegno' && e.item.priority === 'critico').length,
    goals: items.filter((it) => it.type === 'obiettivo' && isDone(it)).length,
    bestStreak,
    habitChecks: events.filter((e) => e.item.type === 'abitudine').length,
    perfectDays: (settings.perfectDays || []).length,
    problems: items.filter((it) => it.type === 'problema' && isDone(it)).length,
    advised: items.filter((it) => it.type === 'problema' && it.advice).length,
    bought: items.filter((it) => it.type === 'oggetto' && isDone(it)).length,
    areas: areas.length,
    diary: items.filter((it) => it.type === 'diario').length,
    activeDays: new Set(events.map((e) => e.day)).size,
  };
}

export const earnedBadges = (stats) => BADGES.filter((b) => b.test(stats)).map((b) => b.id);
