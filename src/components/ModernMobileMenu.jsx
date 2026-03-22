// src/components/ModernMobileMenu.jsx
import { useEffect, useMemo, useState } from 'react';

const TAB_IDS = ['dashboard', 'drivers', 'teams', 'races', 'standings', 'replay'];

function IconBase({ size = 22, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function LayoutDashboardIcon({ size }) {
  return (
    <IconBase size={size}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="9" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="12" width="7" height="9" />
    </IconBase>
  );
}

function UserIcon({ size }) {
  return (
    <IconBase size={size}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  );
}

function CarIcon({ size }) {
  return (
    <IconBase size={size}>
      <path d="M14 16H9m8 0h2a1 1 0 0 0 1-1v-3a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3a1 1 0 0 0 1 1h2" />
      <path d="M6 10l1.5-4.5A1 1 0 0 1 8.4 5h7.2a1 1 0 0 1 .9.5L18 10" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </IconBase>
  );
}

function FlagIcon({ size }) {
  return (
    <IconBase size={size}>
      <path d="M4 22V4" />
      <path d="M4 4h12l-1.5 4L20 10H4" />
    </IconBase>
  );
}

function TrophyIcon({ size }) {
  return (
    <IconBase size={size}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 9H5a2 2 0 0 1-2-2V4h4" />
      <path d="M17 9h2a2 2 0 0 0 2-2V4h-4" />
    </IconBase>
  );
}

function PlayIcon({ size }) {
  return (
    <IconBase size={size}>
      <polygon points="8 5 19 12 8 19 8 5" />
    </IconBase>
  );
}

export default function MobileMenu({ tab, activeTab, setTab, accentColor = 'var(--red)' }) {
  const currentTab = tab ?? activeTab;
  const items = useMemo(
    () => [
      { label: 'Overview', icon: LayoutDashboardIcon },
      { label: 'Drivers', icon: UserIcon },
      { label: 'Teams', icon: CarIcon },
      { label: 'Races', icon: FlagIcon },
      { label: 'Standings', icon: TrophyIcon },
      { label: 'Replay', icon: PlayIcon },
    ],
    [],
  );

  const tabToIndex = (t) => {
    const idx = TAB_IDS.indexOf(t);
    return idx >= 0 ? idx : 0;
  };

  const [activeIndex, setActiveIndex] = useState(() => tabToIndex(currentTab));

  useEffect(() => {
    const next = tabToIndex(currentTab);
    setActiveIndex((prev) => (prev === next ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  const onPick = (idx) => {
    const nextTab = TAB_IDS[idx] || 'dashboard';
    setActiveIndex(idx);
    setTab?.(nextTab);
  };

  return (
    <div className="menu" style={{ ['--menu-accent']: accentColor }}>
      {items.map((it, idx) => {
        const Icon = it.icon;
        const isActive = idx === activeIndex;
        return (
          <button
            key={it.label}
            type="button"
            className={`menu__item ${isActive ? 'is-active' : ''}`}
            onClick={() => onPick(idx)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="menu__icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            <span className="menu__text">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
