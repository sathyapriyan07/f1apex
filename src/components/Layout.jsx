// src/components/Layout.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';
import BottomMenu from './BottomMenu';
import { ShiftingDropDown } from './ShiftingDropDown';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';

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

  // sidebar links (mobile only)
  const sidebarLinks = [
    { id: 'dashboard', label: 'Home' },
    { id: 'drivers',   label: 'Drivers' },
    { id: 'standings', label: 'Standings' },
    { id: 'teams',     label: 'Teams' },
    { id: 'constructors', label: 'Constructors' },
    { id: 'races',     label: 'Schedule' },
    { id: 'results',   label: 'Results' },
    { id: 'replay',    label: 'Replay' },
    { id: 'circuits',  label: 'Circuits' },
    { id: 'seasons',   label: 'Seasons' },
    { id: 'charts',    label: 'Charts' },
    { id: 'laptimes',  label: 'Lap Times' },
    ...(isAdmin ? [
      { id: 'import', label: 'Import' },
      { id: 'users',  label: 'Users' },
    ] : []),
  ];

  const displayName = profile?.display_name || profile?.email || 'Guest';
  const initial = (displayName || '?')[0]?.toUpperCase() || '?';

  return (
    <div className="tv-theme" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Mobile header (pixel layout spec) */}
      <header
        className="mobile-header"
        style={{ display: 'none' }}
      >
        <span
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 17,
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
          f1<span style={{ color: 'var(--red)', fontStyle: 'italic' }}> APEX</span>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 980,
              padding: '6px 12px',
              flex: 1,
              maxWidth: 180,
            }}
          >
            <SearchIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }} aria-hidden="true" />
            <input
              placeholder="Search..."
              aria-label="Search"
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 12,
                color: 'var(--text)',
                width: '100%',
                fontFamily: 'var(--sans)',
              }}
            />
          </div>

          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--sans)',
              fontWeight: 800,
              fontSize: 11,
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
            <MenuIcon sx={{ fontSize: 20 }} />
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
              <span className="f1">f1</span>
              <span className="db" style={{ fontStyle: 'italic' }}> APEX</span>
            </span>
          </div>

          <nav className="nav desktop-nav" aria-label="Primary">
            <ShiftingDropDown tab={tab} setTab={handleSetTab} isAdmin={isAdmin} />
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
            {theme === 'dark' ? <LightModeIcon sx={{ fontSize: 16 }} /> : <Brightness4Icon sx={{ fontSize: 16 }} />}
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
              <div className="mobile-sidebar__brand" role="button" tabIndex={0} onClick={() => handleSetTab('dashboard')}>f1 <span style={{ color: 'var(--red)', fontStyle: 'italic' }}>APEX</span></div>
              <button type="button" className="mobile-sidebar__close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><CloseIcon sx={{ fontSize: 18 }} /></button>
            </div>
            <div className="mobile-sidebar__list" role="navigation" aria-label="Tabs">
              {sidebarLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  className={`mobile-sidebar__item ${tab === link.id || (link.id === 'standings' && tab === 'constructors') ? 'is-active' : ''}`}
                  onClick={() => handleSetTab(link.id)}
                >
                  <span>{link.label}</span>
                  {tab === link.id ? <ChevronRightIcon sx={{ fontSize: 16 }} aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      <main className="app-main" style={{ flex: 1 }}>
        {isFullBleed ? children : <div className="container">{children}</div>}
      </main>

      <div className="mobile-bottom-menu">
        <BottomMenu tab={tab} setTab={handleSetTab} isAdmin={isAdmin} session={session} onSignIn={onSignIn} />
      </div>
    </div>
  );
}
