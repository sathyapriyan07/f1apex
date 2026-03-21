// src/components/Layout.jsx
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';
import MobileMenu from './ModernMobileMenu';

export default function Layout({ tab, setTab, children, onSignIn }) {
  const { session, profile, isAdmin } = useAuth();

  const handleSetTab = (nextTab) => setTab?.(nextTab);

  const userLinks = [
    { id: 'dashboard', label: 'Home' },
    { id: 'races', label: 'Schedule' },
    { id: 'results', label: 'Results' },
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
          background: 'rgba(0,0,0,0.75)',
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
            <span style={{ color: 'white' }}>DB</span>
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
                    color: tab === link.id ? 'white' : (link.isAdmin ? 'var(--muted)' : 'var(--sub)'),
                    transition: 'color 0.15s',
                    padding: '4px 0',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = tab === link.id ? 'white' : (link.isAdmin ? 'var(--muted)' : 'var(--sub)');
                  }}
                >
                  {link.label}
                </button>
              </div>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                color: 'white',
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
                e.currentTarget.style.color = 'white';
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
                e.currentTarget.style.color = 'white';
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

      <main className="app-main" style={{ flex: 1 }}>
        <div className="container">{children}</div>
      </main>

      <MobileMenu tab={tab} setTab={handleSetTab} accentColor="var(--red)" />
    </div>
  );
}
