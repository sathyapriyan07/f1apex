// src/components/ModernMobileMenu.jsx
import { Car, Flag, Home, Map, Trophy, User } from 'lucide-react';

export default function MobileMenu({ tab, activeTab, setTab }) {
  const currentTab = tab ?? activeTab ?? 'dashboard';
  const navItems = [
    { id: 'dashboard', label: 'HOME', Icon: Home },
    { id: 'drivers', label: 'DRIVERS', Icon: User },
    { id: 'teams', label: 'TEAMS', Icon: Car },
    { id: 'races', label: 'RACES', Icon: Flag },
    { id: 'standings', label: 'STANDINGS', Icon: Trophy },
    { id: 'circuits', label: 'CIRCUITS', Icon: Map },
  ];

  return (
    <nav className="menu" aria-label="Primary">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        const Icon = item.Icon;
        return (
          <button
            key={item.id}
            onClick={() => setTab?.(item.id)}
            type="button"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              flex: 1,
              padding: '8px 0',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={22}
              color={isActive ? '#ffffff' : 'rgba(255,255,255,0.35)'}
              strokeWidth={isActive ? 2.5 : 1.8}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 700,
                fontSize: 8,
                letterSpacing: '0.04em',
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
