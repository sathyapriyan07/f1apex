// src/pages/AuthPage.jsx
import { useState } from 'react';
import { signIn, signUp } from '../lib/supabase';

export default function AuthPage({ onClose }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.email || !form.password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password);
        if (error) throw error;
      } else {
        if (!form.displayName) { setError('Display name is required.'); setLoading(false); return; }
        const { error } = await signUp(form.email, form.password, form.displayName);
        if (error) throw error;
        setSuccess('Account created. Check your email to confirm, then sign in.');
        setMode('login');
      }
    } catch (e) { setError(e.message || 'Something went wrong.'); }
    setLoading(false);
  };

  const inner = (
    <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 24, background: 'var(--red)', borderRadius: 2 }} />
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 28, letterSpacing: '-.02em' }}>
              F1<span style={{ color: 'var(--sub)', fontWeight: 600 }}>DB</span>
            </span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            Formula One Database
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
            {[['login','Sign In'],['register','Register']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '13px 0', background: 'none', border: 'none',
                  fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700,
                  color: mode === m ? 'var(--text)' : 'var(--muted)', cursor: 'pointer',
                  borderBottom: `2px solid ${mode === m ? 'var(--red)' : 'transparent'}`,
                  marginBottom: -1, transition: 'color .1s',
                  letterSpacing: '-.01em',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div>
                <label>Display name</label>
                <input type="text" placeholder="Max Verstappen" value={form.displayName} onChange={set('displayName')} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
            )}
            <div>
              <label>Email</label>
              <input type="email" placeholder="driver@f1.com" value={form.email} onChange={set('email')} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <div>
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>

            {error   && <div className="error-msg"  >{error}</div>}
            {success && <div className="success-msg">{success}</div>}

            <button className="btn btn-red" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={handleSubmit} disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            {mode === 'login' && (
              <p style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.6, marginTop: 4 }}>
                Admin access is granted by an existing admin.
              </p>
            )}
          </div>
        </div>
      </div>
  );

  if (onClose) {
    return (
      <div className="overlay" onMouseDown={onClose}>
        <div onMouseDown={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>Close</button>
          </div>
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)',
        backgroundSize: '48px 48px', opacity: .4,
      }} />
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--red)' }} />
      {inner}
    </div>
  );
}
