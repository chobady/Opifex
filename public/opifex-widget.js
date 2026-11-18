// Opifex — widget per Scriptable (iPhone; visibile anche sulla scrivania del Mac).
// Il codice segreto (CAPTURE_TOKEN) va nel "Parametro" del widget: tieni premuto il widget → Modifica widget → Parametro.
const SITE = '__SITE__';
const TOKEN = (args.widgetParameter || '').trim();

const THEMES = {
  neon: '#3DD6FF', terminale: '#39FF88', glaciale: '#8AB4FF', aurora: '#2FF5D8', solare: '#FFD84D',
};
const BG = new Color('#07090D');
const TRACK = new Color('#1A212C');
const TEXT = new Color('#E8EDF5');
const MUTED = new Color('#8C97A8');

async function load() {
  if (!TOKEN) throw new Error('Metti il codice segreto nel Parametro del widget.');
  const req = new Request(`${SITE}/api/widget`);
  req.headers = { 'x-opifex-token': TOKEN };
  req.timeoutInterval = 20;
  const data = await req.loadJSON();
  if (data.error) throw new Error(data.error);
  return data;
}

function colors(theme) {
  return {
    critico: new Color('#FF3DA5'),
    importante: new Color(theme === 'solare' ? '#FF7A3D' : '#FFB020'),
    normale: new Color(THEMES[theme] || THEMES.neon),
  };
}

// Anelli a spicchi: esterno = da fare, medio = in corso, interno = fatto.
function drawRings(data, size) {
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const pal = colors(data.theme);
  const c = size / 2;
  const w = size * 0.075;
  const radii = [size * 0.44, size * 0.33, size * 0.22];
  const total = Math.max(1, data.total);
  radii.forEach((r, ring) => {
    const list = data.rings[ring] || [];
    const slots = data.slots || null;
    const gapDeg = data.total > 1 ? Math.min(7, (360 / total) * 0.3) : 0;
    for (let i = 0; i < Math.max(data.total, 1); i += 1) {
      const a0 = -90 + (i * 360) / total + gapDeg / 2;
      const a1 = -90 + ((i + 1) * 360) / total - gapDeg / 2;
      const pts = [];
      for (let k = 0; k <= 24; k += 1) {
        const a = ((a0 + ((a1 - a0) * k) / 24) * Math.PI) / 180;
        pts.push(new Point(c + r * Math.cos(a), c + r * Math.sin(a)));
      }
      const p = new Path();
      p.addLines(pts);
      ctx.addPath(p);
      ctx.setLineWidth(w);
      const on = slots ? slots[i] && slots[i].ring === ring : i < list.length;
      const prio = slots ? slots[i] && slots[i].p : list[i];
      ctx.setStrokeColor(on ? pal[prio] || pal.normale : TRACK);
      ctx.strokePath();
    }
  });
  ctx.setFont(Font.boldRoundedSystemFont(size * 0.13));
  ctx.setTextColor(TEXT);
  ctx.setTextAlignedCenter();
  const label = data.total ? `${data.done}/${data.total}` : '—';
  ctx.drawTextInRect(label, new Rect(0, c - size * 0.085, size, size * 0.2));
  return ctx.getImage();
}

function addLine(stack, it, pal, fontSize) {
  const row = stack.addStack();
  row.centerAlignContent();
  const dot = row.addText('●');
  dot.font = Font.systemFont(fontSize - 3);
  dot.textColor = pal[it.priority] || pal.normale;
  row.addSpacer(5);
  const t = row.addText(it.title);
  t.font = Font.mediumSystemFont(fontSize);
  t.textColor = it.late ? pal.critico : TEXT;
  t.lineLimit = 1;
  if (it.time) {
    row.addSpacer(4);
    const tm = row.addText(it.time);
    tm.font = Font.systemFont(fontSize - 2);
    tm.textColor = MUTED;
  }
}

async function build() {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.url = SITE;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60000);
  let data;
  try {
    data = await load();
  } catch (e) {
    const t = w.addText(`Opifex\n${e.message}`);
    t.textColor = TEXT;
    t.font = Font.systemFont(12);
    return w;
  }
  const pal = colors(data.theme);
  const fam = config.widgetFamily || 'medium';
  if (fam === 'small' || fam === 'accessoryCircular') {
    w.setPadding(8, 8, 8, 8);
    const img = w.addImage(drawRings(data, 300));
    img.centerAlignImage();
    return w;
  }
  w.setPadding(12, 12, 12, 14);
  const top = w.addStack();
  top.centerAlignContent();
  const img = top.addImage(drawRings(data, 300));
  img.imageSize = new Size(fam === 'large' ? 120 : 110, fam === 'large' ? 120 : 110);
  top.addSpacer(12);
  const col = top.addStack();
  col.layoutVertically();
  const head = col.addText('OPIFEX');
  head.font = Font.boldSystemFont(11);
  head.textColor = pal.normale;
  col.addSpacer(4);
  const list = [...data.focus, ...data.next].slice(0, fam === 'large' ? 4 : 4);
  if (!list.length) {
    const t = col.addText('Giornata libera');
    t.font = Font.systemFont(13);
    t.textColor = MUTED;
  }
  list.forEach((it) => {
    addLine(col, it, pal, 13);
    col.addSpacer(3);
  });
  if (data.habits.total) {
    const h = col.addText(`Abitudini ${data.habits.done}/${data.habits.total}`);
    h.font = Font.systemFont(11);
    h.textColor = MUTED;
  }
  if (fam === 'large') {
    w.addSpacer(12);
    if (data.morning) {
      const m = w.addText(data.morning);
      m.font = Font.systemFont(13);
      m.textColor = TEXT;
      w.addSpacer(8);
    }
    data.next.slice(4, 9).forEach((it) => {
      addLine(w, it, pal, 13);
      w.addSpacer(4);
    });
  }
  return w;
}

const widget = await build();
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
