// src/components/Layout.jsx
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/supabase';
import MobileMenu from './ModernMobileMenu';

export default function Layout({ tab, setTab, children, onSignIn }) {
  const { session, profile, isAdmin } = useAuth();

  const tabs = [
    { id: 'races', label: 'Schedule' },
    { id: 'results', label: 'Results' },
    { id: 'standings', label: 'Standings' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'teams', label: 'Teams' },
    { id: 'circuits', label: 'Circuits' },
  ];

  if (isAdmin) tabs.push({ id: 'import', label: 'Import' });
  if (isAdmin) tabs.push({ id: 'users', label: 'Users' });

  const displayName = profile?.display_name || profile?.email || 'Guest';
  const initial = (displayName || '?')[0]?.toUpperCase() || '?';
  const role = session ? (isAdmin ? 'admin' : 'user') : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="app-header">
        <div className="container app-header__bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <div className="brand">
              <button
                type="button"
                onClick={() => setTab('dashboard')}
                style={{ appearance: 'none', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                aria-label="Go to Overview"
              >
                <div className="brand__mark">
                  <span className="f1">F1</span>
                  <span className="db">DB</span>
                </div>
              </button>
              <div className="brand__divider" />
            </div>

            <nav className="nav" aria-label="Primary">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={`nav-link ${tab === t.id ? 'is-active' : ''}`}
                  onClick={() => setTab(t.id)}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="header-right">
            <div className="user-chip">
              <div className="avatar" aria-hidden="true">
                {initial}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text)',
                    fontWeight: 700,
                    maxWidth: 180,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </span>
                {role ? <span className={`role-badge ${isAdmin ? 'is-admin' : ''}`}>{role}</span> : null}
              </div>
            </div>

            {session ? (
              <button className="btn btn-ghost btn-xs" onClick={signOut} style={{ color: 'var(--text)' }}>
                Sign out
              </button>
            ) : (
              <button className="btn btn-red btn-xs" onClick={onSignIn}>
                Sign in
              </button>
            )}
          </div>
        </div>

        <div className="header-stripe" />
      </header>

      <main className="app-main" style={{ flex: 1 }}>
        <div className="container">{children}</div>
      </main>

      <MobileMenu tab={tab} setTab={setTab} accentColor="var(--red)" />
    </div>
  );
}
