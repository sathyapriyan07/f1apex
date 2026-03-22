// src/components/Layout.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';
import MobileMenu from './ModernMobileMenu';

export default function Layout({ tab, setTab, children, onSignIn, theme = 'dark', toggleTheme }) {
  const { session, profile, isAdmin } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSetTab = (nextTab) => {
    setTab?.(nextTab);
    setMobileNavOpen(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const userLinks = [
    { id: 'dashboard', label: 'Home' },
    { id: 'races', label: 'Schedule' },
    { id: 'results', label: 'Results' },
    { id: 'replay', label: 'Replay' },
    { id: 'standings', label: 'Standings' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'teams', label: 'Teams' },
    { id: 'circuits', label: 'Circuits' },
  ];
  const adminLinks = isAdmin ? [
    { id: 'import', label: 'Import', isAdmin: true },
    { id: 'users', label: 'Users', isAdmin: true },
  ] : [];
  const navLinks = [...userLinks, ...adminLinks];

  const displayName = profile?.display_name || profile?.email || 'Guest';
  const initial = (displayName || '?')[0]?.toUpperCase() || '?';

  return (
    <div className="tv-theme" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header
        className="top-nav"
        style={{
          height: 52,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          borderBottom: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, minWidth: 0 }}>
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            style={{
              appearance: 'none',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--text)',
              cursor: 'pointer',
              width: 34,
              height: 34,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ☰
          </button>

          <span
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 900,
              fontSize: 20,
              fontStyle: 'italic',
              letterSpacing: '-0.03em',
              cursor: 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
            onClick={() => handleSetTab('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSetTab('dashboard');
            }}
            aria-label="Go to Home"
          >
            <span style={{ color: 'var(--red)' }}>F1</span>
            <span style={{ color: 'var(--text)' }}>DB</span>
          </span>

          <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="desktop-nav" aria-label="Primary">
            {navLinks.map((link) => (
              <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {link.id === 'import' ? (
                  <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} aria-hidden="true" />
                ) : null}
                <button
                  type="button"
                  onClick={() => handleSetTab(link.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: tab === link.id ? 'var(--text)' : (link.isAdmin ? 'var(--muted)' : 'var(--sub)'),
                    transition: 'color 0.15s',
                    padding: '4px 0',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = tab === link.id ? 'var(--text)' : (link.isAdmin ? 'var(--muted)' : 'var(--sub)');
                  }}
                >
                  {link.label}
                </button>
              </div>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={() => toggleTheme?.()}
            title={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
            aria-label="Toggle theme"
            style={{
              appearance: 'none',
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--sub)',
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              fontSize: 12,
              padding: '5px 12px',
              borderRadius: 980,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--line2)';
              e.currentTarget.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--sub)';
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1 }}>{theme === 'dark' ? '☀' : '◑'}</span>
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="user-info">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isAdmin ? 'var(--red)' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--sans)',
                fontWeight: 700,
                fontSize: 12,
                color: 'var(--text)',
              }}
              aria-hidden="true"
            >
              {initial}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }} className="user-text">
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--sub)', lineHeight: 1, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1, letterSpacing: '0.04em' }}>
                {session ? (isAdmin ? 'ADMIN' : 'USER') : 'GUEST'}
              </span>
            </div>
          </div>

          {session ? (
            <button
              type="button"
              onClick={signOut}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--muted)',
                transition: 'color 0.15s',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--muted)',
                transition: 'color 0.15s',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {mobileNavOpen ? (
        <div className="mobile-sidebar-overlay" role="presentation" onClick={() => setMobileNavOpen(false)}>
          <aside
            className="mobile-sidebar"
            role="dialog"
            aria-label="Navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sidebar__top">
              <div className="mobile-sidebar__brand" role="button" tabIndex={0} onClick={() => handleSetTab('dashboard')}>F1DB</div>
              <button type="button" className="mobile-sidebar__close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">×</button>
            </div>
            <div className="mobile-sidebar__list" role="navigation" aria-label="Tabs">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className={`mobile-sidebar__item ${tab === link.id ? 'is-active' : ''}`}
                  onClick={() => handleSetTab(link.id)}
                >
                  <span>{link.label}</span>
                  {tab === link.id ? <span aria-hidden="true">›</span> : null}
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      <main className="app-main" style={{ flex: 1 }}>
        <div className="container">{children}</div>
      </main>

      <MobileMenu tab={tab} setTab={handleSetTab} accentColor="var(--red)" />
    </div>
  );
}
