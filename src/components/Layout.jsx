// src/components/Layout.jsx
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';
import MobileMenu from './ModernMobileMenu';

export default function Layout({ tab, setTab, children, onSignIn, theme = 'dark', toggleTheme }) {
  const { session, profile, isAdmin } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isFullBleed = tab === 'dashboard' || tab === 'drivers' || tab === 'teams' || tab === 'results';

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
      {/* Mobile header (pixel layout spec) */}
      <header
        className="mobile-header"
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: '#000',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          role="button"
          tabIndex={0}
          onClick={() => handleSetTab('dashboard')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleSetTab('dashboard');
          }}
          aria-label="Go to Home"
        >
          F1<span style={{ color: 'var(--red)' }}>DB</span>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 980,
              padding: '8px 16px',
              flex: 1,
              maxWidth: 200,
            }}
          >
            <Search size={13} color="rgba(255,255,255,0.4)" aria-hidden="true" />
            <input
              placeholder="Search..."
              aria-label="Search"
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 13,
                color: 'var(--text)',
                width: '100%',
                fontFamily: 'var(--sans)',
              }}
            />
          </div>

          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--sans)',
              fontWeight: 800,
              fontSize: 14,
              color: '#fff',
              cursor: 'pointer',
            }}
            role="button"
            tabIndex={0}
            onClick={() => (session ? signOut() : onSignIn?.())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (session) signOut();
                else onSignIn?.();
              }
            }}
            aria-label={session ? 'Sign out' : 'Sign in'}
            title={session ? 'Sign out' : 'Sign in'}
          >
            {profile?.display_name?.[0]?.toUpperCase() || initial}
          </div>
        </div>
      </header>

      <header className="app-header">
        <div className="app-header__bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, minWidth: 0 }}>
          <button
            type="button"
            className="mobile-nav-toggle btn btn-ghost btn-icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>

          <div
            className="brand"
            onClick={() => handleSetTab('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleSetTab('dashboard');
            }}
            aria-label="Go to Home"
          >
            <span className="brand__mark" aria-hidden="true">
              <span className="f1">F1</span>
              <span className="db">DB</span>
            </span>
          </div>

          <nav className="nav desktop-nav" aria-label="Primary">
            {navLinks.map((link) => (
              <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {link.id === 'import' ? <span className="nav-admin-divider" aria-hidden="true" /> : null}
                <button
                  type="button"
                  onClick={() => handleSetTab(link.id)}
                  className={`nav-link ${tab === link.id ? 'is-active' : ''}${link.isAdmin ? ' is-admin' : ''}`}
                >
                  {link.label}
                </button>
              </div>
            ))}
          </nav>
        </div>

        <div className="header-right">
          <button
            type="button"
            onClick={() => toggleTheme?.()}
            title={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
            aria-label="Toggle theme"
            className="btn btn-ghost btn-sm theme-toggle"
          >
            <span aria-hidden="true" style={{ lineHeight: 1 }}>{theme === 'dark' ? '☀' : '◑'}</span>
            <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <div className="user-chip">
            <div
              className="avatar user-avatar"
              aria-hidden="true"
              style={{ background: isAdmin ? 'var(--red)' : 'var(--glass-bg)', borderColor: isAdmin ? 'transparent' : 'var(--glass-border)' }}
            >
              {initial}
            </div>
            <div className="user-meta">
              <span className="user-name" title={displayName}>{displayName}</span>
              <span className="role-badge">{session ? (isAdmin ? 'ADMIN' : 'USER') : 'GUEST'}</span>
            </div>
          </div>

          {session ? (
            <button
              type="button"
              onClick={signOut}
              className="btn btn-ghost btn-xs sign-out-btn"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="btn btn-ghost btn-xs sign-out-btn"
            >
              Sign in
            </button>
          )}
        </div>
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
        {isFullBleed ? children : <div className="container">{children}</div>}
      </main>

      <MobileMenu tab={tab} setTab={handleSetTab} accentColor="var(--red)" />
    </div>
  );
}
