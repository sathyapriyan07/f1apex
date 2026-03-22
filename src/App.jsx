// src/App.jsx
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DriversPage from './pages/Drivers';
import TeamsPage from './pages/Teams';
import { SeasonsPage, CircuitsPage, RacesPage } from './pages/DataPages';
import RaceResultsPage from './pages/RaceResults';
import StandingsHub from './pages/StandingsHub';
import { DriverStandingsPage, ConstructorStandingsPage } from './pages/Standings';
import LapTimesPage from './pages/LapTimes';
import ChartsPage from './pages/ChartsPage';
import RaceReplayPage from './pages/RaceReplay';
import ImportPage from './pages/ImportPage';
import UsersPage from './pages/UsersPage';
import { db } from './lib/supabase';
import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}

function Inner() {
  const { session, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 14 }}>
          <span style={{ color: 'var(--red)' }}>F1</span>DB
        </div>
        <span className="spinner spinner-lg" />
      </div>
    </div>
  );

  return (
    <>
      <AppShell onOpenAuth={() => setAuthOpen(true)} />
      {!session && authOpen && <AuthPage onClose={() => setAuthOpen(false)} />}
    </>
  );
}

function AppShell({ onOpenAuth }) {
  const { isAdmin } = useAuth();
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('f1db_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const validTabs = [
    'dashboard', 'drivers', 'teams', 'seasons', 'circuits',
    'races', 'results', 'replay', 'standings', 'constructors',
    'laptimes', 'charts', 'import', 'users',
  ];
  const validDetailTypes = ['driver', 'team', 'circuit', 'race'];

  const normalizeTab = (value) => {
    if (!value) return null;
    const v = String(value).toLowerCase().trim();
    return validTabs.includes(v) ? v : null;
  };

  const normalizeDetailType = (value) => {
    if (!value) return null;
    const v = String(value).toLowerCase().trim();
    return validDetailTypes.includes(v) ? v : null;
  };

  const readSavedNav = () => {
    try {
      const raw = localStorage.getItem('f1db_nav');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const savedTab = normalizeTab(parsed?.tab);
      if (!savedTab) return null;
      const type = normalizeDetailType(parsed?.detail?.type);
      const id = parsed?.detail?.id;
      const detail = type && id ? { type, id: String(id) } : null;
      return { tab: savedTab, detail };
    } catch (e) {
      return null;
    }
  };

  const parseHashNav = () => {
    try {
      const raw = window.location.hash.replace(/^#/, '');
      if (!raw) return null;
      const parts = raw.split('/').filter(Boolean);
      const fromHashTab = normalizeTab(parts[0]);
      if (!fromHashTab) return null;
      if (parts.length === 3) {
        const type = normalizeDetailType(parts[1]);
        const id = parts[2];
        if (type && id) return { tab: fromHashTab, detail: { type, id: String(id) } };
      }
      return { tab: fromHashTab, detail: null };
    } catch (e) {
      return null;
    }
  };

  const getInitialNav = () => {
    const fromHash = parseHashNav();
    if (fromHash) return fromHash;
    const fromSaved = readSavedNav();
    if (fromSaved) return fromSaved;
    try {
      const fromStorage = normalizeTab(localStorage.getItem('f1db_active_tab'));
      if (fromStorage) return { tab: fromStorage, detail: null };
    } catch (e) {
      // ignore
    }
    return { tab: 'dashboard', detail: null };
  };

  const [nav, setNav] = useState(getInitialNav);
  const tab = nav.tab;
  const detail = nav.detail; // { type: 'driver'|'team'|'circuit', id } | null
  const [autoImport, setAutoImport] = useState(null);

  // Shared reference data loaded once
  const [teams,    setTeams]    = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [seasons,  setSeasons]  = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [races,    setRaces]    = useState([]);

  useEffect(() => {
    db.teams.list().then(({ data })    => setTeams(data || []));
    db.circuits.list().then(({ data }) => setCircuits(data || []));
    db.seasons.list().then(({ data })  => setSeasons(data || []));
    db.drivers.list().then(({ data })  => setDrivers(data || []));
    db.races.list().then(({ data })    => setRaces(data || []));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const { pathname, hash, search } = window.location;
    const query = new URLSearchParams(search);

    // Supported triggers:
    // - `/?fetch=1`
    // - `/?fetch=1&season=2024&src=jolpica`
    // - `/#/fetch?season=2024&src=ergast`
    const hashPath = (hash || '').startsWith('#/') ? hash.slice(2) : hash.startsWith('#') ? hash.slice(1) : '';
    const [hashRoute, hashQuery] = hashPath.split('?');
    const hashParams = new URLSearchParams(hashQuery || '');

    const fetchFlag =
      query.get('fetch') === '1' ||
      pathname.toLowerCase().endsWith('/fetch') ||
      (hashRoute || '').toLowerCase() === 'fetch' ||
      hashParams.get('fetch') === '1';

    if (!fetchFlag) return;

    const season = hashParams.get('season') || query.get('season') || '2024';
    const src = (hashParams.get('src') || query.get('src') || 'jolpica').toLowerCase();
    const source = src === 'ergast' ? 'ergast' : 'jolpica';

    handleSetTab('import');
    setAutoImport({ season, source });
  }, [isAdmin]);

  useEffect(() => {
    try {
      const html = document.documentElement;
      html.classList.remove('theme-dark', 'theme-light');
      html.classList.add(`theme-${theme === 'light' ? 'light' : 'dark'}`);
      localStorage.setItem('f1db_theme', theme === 'light' ? 'light' : 'dark');
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const writeNav = (next) => {
    try {
      localStorage.setItem('f1db_nav', JSON.stringify(next));
      localStorage.setItem('f1db_active_tab', next.tab);
    } catch (e) {
      // ignore
    }
  };

  const hashForNav = (next) => {
    if (next?.detail?.type && next?.detail?.id) return `${next.tab}/${next.detail.type}/${next.detail.id}`;
    return next.tab;
  };

  const commitNav = (next) => {
    setNav(next);
    writeNav(next);
    try {
      window.location.hash = hashForNav(next);
    } catch (e) {
      // ignore
    }
  };

  const handleSetTab = (nextTab) => {
    const normalized = normalizeTab(nextTab) || 'dashboard';
    commitNav({ tab: normalized, detail: null });
  };

  const handleOpenDetail = (type, id) => {
    const normalizedType = normalizeDetailType(type);
    if (!normalizedType || !id) return;
    const normalizedId = String(id);
    const targetTab =
      normalizedType === 'driver' ? 'drivers'
        : normalizedType === 'team' ? 'teams'
          : normalizedType === 'race' ? 'results'
            : 'circuits';
    commitNav({ tab: targetTab, detail: { type: normalizedType, id: normalizedId } });
  };

  const handleCloseDetail = () => {
    commitNav({ tab, detail: null });
  };

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashNav();
      if (!parsed) return;
      const sameTab = parsed.tab === tab;
      const sameDetail =
        (!parsed.detail && !detail) ||
        (parsed.detail && detail && parsed.detail.type === detail.type && parsed.detail.id === detail.id);
      if (sameTab && sameDetail) return;
      setNav(parsed);
      writeNav(parsed);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [tab, detail]);

  useEffect(() => {
    if (!isAdmin && (tab === 'import' || tab === 'users')) {
      commitNav({ tab: 'dashboard', detail: null });
    }
  }, [isAdmin, tab]);

  const openDriver = (id) => handleOpenDetail('driver', id);
  const openTeam = (id) => handleOpenDetail('team', id);
  const openCircuit = (id) => handleOpenDetail('circuit', id);
  const openRace = (id) => handleOpenDetail('race', id);

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':    return <Dashboard setTab={handleSetTab} teams={teams} onOpenDriver={openDriver} />;
      case 'drivers':      return (
        <DriversPage
          teams={teams}
          detailId={detail?.type === 'driver' ? detail.id : null}
          onOpenDriver={openDriver}
          onCloseDetail={handleCloseDetail}
        />
      );
      case 'teams':        return (
        <TeamsPage
          detailId={detail?.type === 'team' ? detail.id : null}
          onOpenTeam={openTeam}
          onOpenDriver={openDriver}
          onCloseDetail={handleCloseDetail}
        />
      );
      case 'seasons':      return <SeasonsPage />;
      case 'circuits':     return (
        <CircuitsPage
          detailId={detail?.type === 'circuit' ? detail.id : null}
          onOpenCircuit={openCircuit}
          onCloseDetail={handleCloseDetail}
        />
      );
      case 'races':        return <RacesPage circuits={circuits} seasons={seasons} />;
      case 'results':      return <RaceResultsPage races={races} seasons={seasons} teams={teams} onOpenDriver={openDriver} detailRaceId={detail?.type === 'race' ? detail.id : null} />;
      case 'replay':       return <RaceReplayPage races={races} circuits={circuits} drivers={drivers} />;
      case 'standings':    return <StandingsHub seasons={seasons} />;
      case 'constructors': return <ConstructorStandingsPage seasons={seasons} />;
      case 'laptimes':     return <LapTimesPage races={races} drivers={drivers} />;
      case 'charts':       return <ChartsPage seasons={seasons} />;
      case 'import':       return isAdmin ? (
        <ImportPage
          autoRun={!!autoImport}
          autoSource={autoImport?.source}
          autoSeason={autoImport?.season}
          onAutoRunConsumed={() => setAutoImport(null)}
        />
      ) : null;
      case 'users':        return isAdmin ? <UsersPage /> : null;
      default:             return <Dashboard setTab={handleSetTab} teams={teams} onOpenDriver={openDriver} />;
    }
  };

  return (
    <Layout
      tab={tab}
      setTab={handleSetTab}
      onSignIn={onOpenAuth}
      theme={theme}
      toggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
    >
      {renderTab()}
    </Layout>
  );
}
