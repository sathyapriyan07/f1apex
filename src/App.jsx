// src/App.jsx
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DriversPage from './pages/Drivers';
import { TeamsPage, SeasonsPage, CircuitsPage, RacesPage } from './pages/DataPages';
import RaceResultsPage from './pages/RaceResults';
import StandingsHub from './pages/StandingsHub';
import { DriverStandingsPage, ConstructorStandingsPage } from './pages/Standings';
import LapTimesPage from './pages/LapTimes';
import ChartsPage from './pages/ChartsPage';
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
        <div style={{ fontFamily: 'var(--sans)', fontSize: 36, fontWeight: 900, letterSpacing: 1, marginBottom: 20, textTransform: 'uppercase' }}>
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
  const [tab, setTab] = useState('dashboard');
  const [detail, setDetail] = useState(null); // { type: 'driver'|'team'|'circuit', id }
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

    setTab('import');
    setAutoImport({ season, source });
  }, [isAdmin]);

  const openDriver = (id) => { setDetail({ type: 'driver', id }); setTab('drivers'); };
  const openTeam = (id) => { setDetail({ type: 'team', id }); setTab('teams'); };
  const openCircuit = (id) => { setDetail({ type: 'circuit', id }); setTab('circuits'); };
  const closeDetail = () => setDetail(null);

  const setTabWithClose = (nextTab) => { setDetail(null); setTab(nextTab); };

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':    return <Dashboard setTab={setTabWithClose} />;
      case 'drivers':      return (
        <DriversPage
          teams={teams}
          detailId={detail?.type === 'driver' ? detail.id : null}
          onOpenDriver={openDriver}
          onCloseDetail={closeDetail}
        />
      );
      case 'teams':        return (
        <TeamsPage
          detailId={detail?.type === 'team' ? detail.id : null}
          onOpenTeam={openTeam}
          onCloseDetail={closeDetail}
        />
      );
      case 'seasons':      return <SeasonsPage />;
      case 'circuits':     return (
        <CircuitsPage
          detailId={detail?.type === 'circuit' ? detail.id : null}
          onOpenCircuit={openCircuit}
          onCloseDetail={closeDetail}
        />
      );
      case 'races':        return <RacesPage circuits={circuits} seasons={seasons} />;
      case 'results':      return <RaceResultsPage races={races} drivers={drivers} teams={teams} onOpenDriver={openDriver} />;
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
      default:             return <Dashboard setTab={setTab} />;
    }
  };

  return (
    <Layout tab={tab} setTab={setTabWithClose} onSignIn={onOpenAuth}>
      {renderTab()}
    </Layout>
  );
}
