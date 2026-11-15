import { useState } from 'react';
import { login, register, resetPassword, authErrorMessage } from '../lib/firebase.js';
import { sfx } from '../lib/sound.js';

export function Logo({ size = 96 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <g transform="rotate(-90 100 100)" strokeLinecap="round" strokeWidth="13">
        <circle cx="100" cy="100" r="88" stroke="#1A212C" />
        <circle cx="100" cy="100" r="66" stroke="#1A212C" />
        <circle cx="100" cy="100" r="44" stroke="#1A212C" />
        <circle className="logo-ring r1" cx="100" cy="100" r="88" stroke="#FF3DA5" strokeDasharray="400 553" />
        <circle className="logo-ring r2" cx="100" cy="100" r="66" stroke="#FFB020" strokeDasharray="270 415" />
        <circle className="logo-ring r3" cx="100" cy="100" r="44" stroke="#3DD6FF" strokeDasharray="140 277" />
      </g>
    </svg>
  );
}

export function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), pass);
      else await register(email.trim(), pass);
      sfx.ring();
    } catch (err) {
      sfx.error();
      setMsg({ kind: 'error', text: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.trim()) {
      setMsg({ kind: 'error', text: 'Scrivi prima la tua email qui sopra.' });
      return;
    }
    try {
      await resetPassword(email.trim());
      setMsg({ kind: 'ok', text: 'Ti ho mandato una email per reimpostare la password.' });
    } catch (err) {
      setMsg({ kind: 'error', text: authErrorMessage(err) });
    }
  }

  return (
    <div className="login">
      <Logo />
      <h1 className="wordmark big">OPIFEX</h1>
      <p className="login-tag">Impegni, obiettivi e problemi. Tutto in un posto.</p>
      <form className="login-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </label>
        {msg && (
          <p className={`login-msg ${msg.kind}`} role="alert">
            {msg.text}
          </p>
        )}
        <button className="btn primary wide" type="submit" disabled={busy}>
          {busy ? 'Un attimo…' : mode === 'login' ? 'Accedi' : 'Crea account'}
        </button>
      </form>
      <div className="login-links">
        <button className="link-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Prima volta? Crea il tuo account' : 'Hai già un account? Accedi'}
        </button>
        {mode === 'login' && (
          <button className="link-btn" onClick={reset}>
            Password dimenticata
          </button>
        )}
      </div>
    </div>
  );
}
