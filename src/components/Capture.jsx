import { useEffect, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { useApp } from '../lib/ctx.js';
import { sfx } from '../lib/sound.js';
import { captureThought, fileToResizedJpeg, blobToBase64 } from '../lib/ai.js';
import { cloudEnabled } from '../lib/firebase.js';

const MAX_SECONDS = 60;

export function Capture() {
  const { areas, actions } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(
    () => () => {
      clearInterval(timerRef.current);
      try {
        recRef.current?.stream?.getTracks().forEach((t) => t.stop());
      } catch {
        /* niente da fermare */
      }
    },
    [],
  );

  async function run(payload, fallbackText) {
    setBusy(true);
    sfx.send();
    try {
      const drafts = await captureThought({ ...payload, areas });
      if (!drafts.length) throw new Error('Non ho trovato niente da salvare in questo pensiero.');
      sfx.reply();
      actions.propose(drafts);
      setText('');
    } catch (err) {
      sfx.error();
      if (fallbackText) {
        // L'assistente non c'e': apro comunque la scheda, cosi' il pensiero non si perde.
        actions.create({ title: fallbackText }, { banner: cloudEnabled ? err.message : null });
        setText('');
      } else {
        actions.toast(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function submit(e) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    if (!cloudEnabled) {
      // Modalita' locale: niente assistente, apro direttamente la scheda.
      sfx.open();
      actions.create({ title: t });
      setText('');
      return;
    }
    run({ text: t }, t);
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!cloudEnabled) {
      actions.toast('Le foto funzionano con l’assistente: serve collegare Firebase e Gemini.');
      return;
    }
    try {
      const image = await fileToResizedJpeg(file);
      await run({ image, text: text.trim() }, null);
    } catch (err) {
      sfx.error();
      actions.toast(err.message);
    }
  }

  async function startRecording() {
    if (!cloudEnabled) {
      actions.toast('La dettatura funziona con l’assistente: serve collegare Firebase e Gemini.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      actions.toast('Registrazione non disponibile qui: usa il microfono della tastiera.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/mp4' });
        if (blob.size < 1500) return;
        try {
          const data = await blobToBase64(blob);
          await run({ audio: { mime: (blob.type || 'audio/mp4').split(';')[0], data } }, null);
        } catch (err) {
          sfx.error();
          actions.toast(err.message);
        }
      };
      recRef.current = rec;
      rec.start();
      sfx.open();
      setSeconds(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      sfx.error();
      actions.toast('Non ho il permesso di usare il microfono.');
    }
  }

  function stopRecording() {
    try {
      if (recRef.current?.state === 'recording') recRef.current.stop();
    } catch {
      setRecording(false);
    }
  }

  return (
    <form className={`capture ${busy ? 'thinking' : ''} ${recording ? 'recording' : ''}`} onSubmit={submit}>
      {recording ? (
        <div className="capture-rec" role="status">
          <span className="rec-dot" />
          <span>Ti ascolto… {seconds}s</span>
        </div>
      ) : (
        <label className="capture-input">
          <span className="sr-only">Pensiero veloce</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={busy ? 'Sto ordinando il pensiero…' : 'Scrivi o detta un pensiero…'}
            disabled={busy}
            enterKeyHint="send"
            autoComplete="off"
          />
        </label>
      )}
      {busy ? (
        <span className="capture-spin" aria-label="L'assistente sta pensando">
          <Icon name="LoaderCircle" size={22} />
        </span>
      ) : recording ? (
        <button type="button" className="capture-btn stop" aria-label="Ferma e invia" onClick={stopRecording}>
          <Icon name="Square" size={18} />
        </button>
      ) : text.trim() ? (
        <button type="submit" className="capture-btn send" aria-label="Invia">
          <Icon name="Send" size={20} />
        </button>
      ) : (
        <>
          <button type="button" className="capture-btn" aria-label="Detta" onClick={startRecording}>
            <Icon name="Mic" size={22} />
          </button>
          <button type="button" className="capture-btn" aria-label="Fotografa" onClick={() => fileRef.current?.click()}>
            <Icon name="Camera" size={22} />
          </button>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
    </form>
  );
}
