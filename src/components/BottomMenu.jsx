// src/components/BottomMenu.jsx
import { useState, useEffect, useRef } from 'react';
import { Home, User, Car, Flag, BarChart2, Trophy, Map, LogIn, LogOut, Shield } from 'lucide-react';
import { signOut } from '../lib/supabase';

function useMeasure() {
  const ref = useRef(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, bounds];
}

const MAIN_NAV = [
  { Icon: Home,      name: 'dashboard' },
  { Icon: User,      name: 'drivers'   },
  { Icon: Car,       name: 'teams'     },
  { Icon: Flag,      name: 'races'     },
  { Icon: BarChart2, name: 'results'   },
  { Icon: Trophy,    name: 'standings' },
  { Icon: Map,       name: 'circuits'  },
];

const STANDINGS_SUB = [
  { label: 'Drivers',      name: 'standings' },
  { label: 'Constructors', name: 'constructors' },
];

const ADMIN_SUB = [
  { label: 'Import', name: 'import', Icon: BarChart2 },
  { label: 'Users',  name: 'users',  Icon: User },
];

export default function BottomMenu({ tab, setTab, isAdmin, session, onSignIn }) {
  const [view, setView] = useState('default');
  const containerRef = useRef(null);
  const [toolbarRef, toolbarBounds] = useMeasure();

  // Close submenu on outside click
  useEffect(() => {
    if (view === 'default') return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setView('default');
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [view]);

  // Close submenu when tab changes externally
  useEffect(() => { setView('default'); }, [tab]);

  const handleNavClick = (name) => {
    if (name === 'standings' || (name === 'more' && isAdmin)) {
      setView(view === name ? 'default' : name);
      return;
    }
    setView('default');
    setTab(name);
  };

  const handleSubClick = (name) => {
    setView('default');
    setTab(name);
  };

  const handleAuthClick = () => {
    setView('default');
    if (session) signOut();
    else onSignIn?.();
  };

  const submenuOpen = view !== 'default';

  // Styles
  const toolbarStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: 'rgba(18,18,18,0.92)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 22,
    padding: '5px 6px',
    position: 'relative',
    zIndex: 1,
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
  };

  const btnStyle = (isActive) => ({
    position: 'relative',
    padding: '9px 11px',
    borderRadius: 16,
    background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isActive ? '#fff' : 'rgba(255,255,255,0.38)',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  });

  const dotStyle = {
    position: 'absolute',
    top: 5,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'var(--red)',
    pointerEvents: 'none',
  };

  const submenuStyle = {
    position: 'absolute',
    bottom: toolbarBounds.height + 10,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(22,22,24,0.96)',
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: 6,
    minWidth: 180,
    opacity: submenuOpen ? 1 : 0,
    transformOrigin: 'bottom center',
    scale: submenuOpen ? '1' : '0.94',
    pointerEvents: submenuOpen ? 'auto' : 'none',
    transition: 'opacity 0.2s ease, scale 0.22s cubic-bezier(0.34,1.56,0.64,1)',
    zIndex: 0,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  };

  const subBtnStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    borderRadius: 12,
    background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
    fontFamily: 'var(--sans)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    textAlign: 'left',
    transition: 'background 0.12s, color 0.12s',
    whiteSpace: 'nowrap',
  });

  const subDividerStyle = {
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    margin: '4px 6px',
  };

  const currentSubItems = view === 'standings' ? STANDINGS_SUB
    : view === 'more' ? ADMIN_SUB
    : [];

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Submenu panel */}
      <div style={submenuStyle}>
        {currentSubItems.map((item, i) => (
          <button
            key={item.name}
            type="button"
            style={subBtnStyle(tab === item.name)}
            onClick={() => handleSubClick(item.name)}
          >
            {item.Icon && <item.Icon size={15} />}
            {item.label}
          </button>
        ))}
      </div>

      {/* Main toolbar */}
      <div ref={toolbarRef} style={toolbarStyle}>
        {MAIN_NAV.map(({ Icon, name }) => {
          const isActive = tab === name || (name === 'standings' && (tab === 'standings' || tab === 'constructors'));
          const isOpen = view === name;
          return (
            <button
              key={name}
              type="button"
              style={btnStyle(isActive || isOpen)}
              onClick={() => handleNavClick(name)}
              aria-label={name}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && <span style={dotStyle} />}
              <Icon size={19} />
            </button>
          );
        })}

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.10)', margin: '0 2px', flexShrink: 0 }} />

        {/* Admin more button */}
        {isAdmin && (
          <button
            type="button"
            style={btnStyle(view === 'more' || tab === 'import' || tab === 'users')}
            onClick={() => handleNavClick('more')}
            aria-label="Admin"
          >
            {(tab === 'import' || tab === 'users') && <span style={dotStyle} />}
            <Shield size={19} />
          </button>
        )}

        {/* Auth button */}
        <button
          type="button"
          style={btnStyle(false)}
          onClick={handleAuthClick}
          aria-label={session ? 'Sign out' : 'Sign in'}
        >
          {session ? <LogOut size={17} /> : <LogIn size={17} />}
        </button>
      </div>
    </div>
  );
}
