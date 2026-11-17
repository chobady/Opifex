import { useEffect, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { store } from '../lib/store.js';
import { sfx } from '../lib/sound.js';
import { uid } from '../lib/model.js';
import { fileToResizedJpeg } from '../lib/ai.js';

const cache = new Map();
export async function loadPhoto(userId, id) {
  if (cache.has(id)) return cache.get(id);
  const data = await store.getPhoto(userId, id);
  if (data) cache.set(id, data);
  return data;
}

function Thumb({ id, onOpen, onRemove }) {
  const { user } = useApp();
  const [src, setSrc] = useState(cache.get(id) || null);
  useEffect(() => {
    let alive = true;
    if (!src) loadPhoto(user.uid, id).then((d) => alive && d && setSrc(d)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, src, user.uid]);
  return (
    <div className="photo-thumb">
      <button type="button" className="photo-open" aria-label="Apri la foto" onClick={() => src && onOpen(src)}>
        {src ? <img src={`data:image/jpeg;base64,${src}`} alt="" /> : <span className="photo-wait" />}
      </button>
      {onRemove && (
        <button type="button" className="photo-x" aria-label="Togli la foto" onClick={onRemove}>
          <Icon name="X" size={14} />
        </button>
      )}
    </div>
  );
}

// Foto di un elemento: si salvano subito, l'elemento tiene solo gli id.
export function PhotoStrip({ ids = [], onChange }) {
  const { user, actions } = useApp();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);

  async function add(files) {
    const list = Array.from(files || []).slice(0, Math.max(0, 6 - ids.length));
    if (!list.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const f of list) {
        const img = await fileToResizedJpeg(f, 1024);
        const id = uid();
        await store.savePhoto(user.uid, id, img.data);
        cache.set(id, img.data);
        added.push(id);
      }
      sfx.done();
      onChange([...ids, ...added]);
    } catch (e) {
      sfx.error();
      actions.toast(e.message || 'Non sono riuscito a salvare la foto.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="photos">
      {ids.map((id) => (
        <Thumb
          key={id}
          id={id}
          onOpen={setView}
          onRemove={() => {
            sfx.remove();
            store.removePhoto(user.uid, id).catch(() => {});
            onChange(ids.filter((x) => x !== id));
          }}
        />
      ))}
      {ids.length < 6 && (
        <button type="button" className="photo-add" disabled={busy} onClick={() => input.current?.click()}>
          <Icon name={busy ? 'LoaderCircle' : 'Camera'} size={20} className={busy ? 'spin' : ''} />
          <span>{busy ? 'Salvo…' : 'Foto'}</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      {view && (
        <button type="button" className="photo-full" aria-label="Chiudi la foto" onClick={() => setView(null)}>
          <img src={`data:image/jpeg;base64,${view}`} alt="" />
        </button>
      )}
    </div>
  );
}
