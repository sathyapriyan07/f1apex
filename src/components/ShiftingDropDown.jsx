// src/components/ShiftingDropDown.jsx
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

// ── Dropdown content components ───────────────────────────────────────────────

function DropdownLink({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        textAlign: 'left', padding: '7px 10px', borderRadius: 8,
        fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500,
        color: 'rgba(255,255,255,0.6)',
        transition: 'background 0.1s, color 0.1s',
        width: '100%', display: 'block',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
      }}
    >
      {children}
    </button>
  );
}

const DriversDropdown = ({ navigate }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <DropdownLink onClick={() => navigate('drivers')}>All Drivers</DropdownLink>
    <DropdownLink onClick={() => navigate('standings')}>Driver Standings</DropdownLink>
  </div>
);

const TeamsDropdown = ({ navigate }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <DropdownLink onClick={() => navigate('teams')}>All Teams</DropdownLink>
    <DropdownLink onClick={() => navigate('constructors')}>Constructor Standings</DropdownLink>
  </div>
);

const RacesDropdown = ({ navigate }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <DropdownLink onClick={() => navigate('races')}>Schedule</DropdownLink>
    <DropdownLink onClick={() => navigate('results')}>Results</DropdownLink>
    <DropdownLink onClick={() => navigate('laptimes')}>Lap Times</DropdownLink>
    <DropdownLink onClick={() => navigate('replay')}>Race Replay</DropdownLink>
  </div>
);

const DataDropdown = ({ navigate }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <DropdownLink onClick={() => navigate('circuits')}>Circuits</DropdownLink>
    <DropdownLink onClick={() => navigate('seasons')}>Seasons</DropdownLink>
    <DropdownLink onClick={() => navigate('charts')}>Charts</DropdownLink>
  </div>
);

const buildTabs = (navigate) => [
  { title: 'Drivers', Component: () => <DriversDropdown navigate={navigate} /> },
  { title: 'Teams',   Component: () => <TeamsDropdown   navigate={navigate} /> },
  { title: 'Races',   Component: () => <RacesDropdown   navigate={navigate} /> },
  { title: 'Data',    Component: () => <DataDropdown    navigate={navigate} /> },
].map((t, idx) => ({ ...t, id: idx + 1 }));

// ── Direct tab (no dropdown) ──────────────────────────────────────────────────

function DirectTab({ children, tabId, currentTab, setTab }) {
  const isActive = currentTab === tabId ||
    (tabId === 'standings' && (currentTab === 'standings' || currentTab === 'constructors'));
  return (
    <button
      type="button"
      onClick={() => setTab(tabId)}
      style={{
        padding: '6px 12px', borderRadius: 980,
        border: 'none', cursor: 'pointer',
        fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
        letterSpacing: '-0.01em',
        background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
        color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
        transition: 'background 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

// ── Dropdown tabs with animation ──────────────────────────────────────────────

function Tabs({ currentTab, navigate, isAdmin, setTab }) {
  const [selected, setSelected] = useState(null);
  const [dir, setDir] = useState(null);

  const tabs = buildTabs(navigate);

  const handleSetSelected = (val) => {
    if (typeof selected === 'number' && typeof val === 'number') {
      setDir(selected > val ? 'r' : 'l');
    } else {
      setDir(null);
    }
    setSelected(val);
  };

  // Active tab id — which dropdown tab covers the current page
  const activeTabId = (() => {
    if (['drivers', 'standings', 'constructors'].includes(currentTab)) return 1;
    if (['teams'].includes(currentTab)) return 2;
    if (['races', 'results', 'laptimes', 'replay'].includes(currentTab)) return 3;
    if (['circuits', 'seasons', 'charts'].includes(currentTab)) return 4;
    return null;
  })();

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative' }}
      onMouseLeave={() => handleSetSelected(null)}
    >
      {tabs.map((t) => {
        const isActive = activeTabId === t.id;
        return (
          <button
            key={t.id}
            id={`f1db-nav-tab-${t.id}`}
            type="button"
            onMouseEnter={() => handleSetSelected(t.id)}
            onClick={() => handleSetSelected(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              padding: '6px 12px', borderRadius: 980,
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
              letterSpacing: '-0.01em',
              background: (selected === t.id || isActive) ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: (selected === t.id || isActive) ? '#fff' : 'rgba(255,255,255,0.55)',
              transition: 'background 0.15s, color 0.15s',
              whiteSpace: 'nowrap',
              position: 'relative',
            }}
          >
            {t.title}
            <ChevronDown
              size={12}
              style={{
                opacity: 0.6,
                transform: selected === t.id ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
        );
      })}

      <AnimatePresence>
        {selected !== null && (
          <motion.div
            id="f1db-nav-dropdown"
            onMouseEnter={() => handleSetSelected(selected)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              left: 0,
              width: 200,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(18,18,22,0.97)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
              padding: 8,
              zIndex: 300,
              overflow: 'hidden',
            }}
          >
            {/* Nub */}
            <Nub selected={selected} />

            {/* Sliding content */}
            {tabs.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: dir === 'l' ? -24 : dir === 'r' ? 24 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: selected === t.id ? 'block' : 'none' }}
              >
                <t.Component />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Nub({ selected }) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const el = document.getElementById(`f1db-nav-tab-${selected}`);
    const dropdown = document.getElementById('f1db-nav-dropdown');
    if (!el || !dropdown) return;
    const tabRect = el.getBoundingClientRect();
    const dropRect = dropdown.getBoundingClientRect();
    const tabCenter = tabRect.left + tabRect.width / 2;
    setLeft(tabCenter - dropRect.left);
  }, [selected]);

  return (
    <motion.span
      animate={{ left }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: 0,
        left,
        width: 12, height: 12,
        transform: 'translateX(-50%) translateY(-50%) rotate(45deg)',
        background: 'rgba(18,18,22,0.97)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderBottom: 'none',
        borderRight: 'none',
        zIndex: 1,
      }}
    />
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ShiftingDropDown({ tab, setTab, isAdmin }) {
  const navigate = (id) => setTab(id);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <DirectTab tabId="dashboard" currentTab={tab} setTab={setTab}>Home</DirectTab>
      <Tabs currentTab={tab} navigate={navigate} isAdmin={isAdmin} setTab={setTab} />
      <DirectTab tabId="standings" currentTab={tab} setTab={setTab}>Standings</DirectTab>
      <DirectTab tabId="replay"    currentTab={tab} setTab={setTab}>Replay</DirectTab>
      {isAdmin && (
        <>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.10)', margin: '0 4px' }} />
          <DirectTab tabId="import" currentTab={tab} setTab={setTab}>Import</DirectTab>
          <DirectTab tabId="users"  currentTab={tab} setTab={setTab}>Users</DirectTab>
        </>
      )}
    </div>
  );
}
