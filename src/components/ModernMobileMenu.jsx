// src/components/ModernMobileMenu.jsx
import { useMemo } from 'react';

export default function MobileMenu({ tab, activeTab, setTab }) {
  const currentTab = tab ?? activeTab ?? 'dashboard';
  const items = useMemo(
    () => [
      { id: 'dashboard', label: 'Home', icon: '🏠' },
      { id: 'drivers', label: 'Drivers', icon: '👤' },
      { id: 'teams', label: 'Teams', icon: '🏎' },
      { id: 'races', label: 'Races', icon: '🏁' },
      { id: 'standings', label: 'Standings', icon: '🏆' },
      { id: 'circuits', label: 'Circuits', icon: '🗺' },
    ],
    [],
  );

  return (
    <nav className="menu" aria-label="Primary">
      {items.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setTab?.(item.id)}
            type="button"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              flex: 1,
              padding: '6px 0',
              transition: 'opacity 0.15s',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span style={{ fontSize: 20 }} aria-hidden="true">{item.icon}</span>
            <span
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 600,
                fontSize: 9,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

