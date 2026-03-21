// src/pages/ImportPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { upsertMany, db } from '../lib/supabase';

const fetchErgast  = async (path) => { const r = await fetch(`https://ergast.com/api/f1${path}.json?limit=100`); if (!r.ok) throw new Error(`Ergast ${r.status}`); return r.json(); };
const fetchJolpica = async (path) => { const r = await fetch(`https://api.jolpi.ca/ergast/f1${path}.json?limit=100`); if (!r.ok) throw new Error(`Jolpica ${r.status}`); return r.json(); };
const fetchOpenF1  = async (path) => { const r = await fetch(`https://api.openf1.org/v1${path}`); if (!r.ok) throw new Error(`OpenF1 ${r.status}`); return r.json(); };

export default function ImportPage({ autoRun = false, autoSource = 'jolpica', autoSeason = '2024', onAutoRunConsumed }) {
  const [season, setSeason] = useState(autoSeason);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const autoRanRef = useRef(false);
  const cancelRef = useRef(false);

  const setStatus = (k, msg, type) => setStatuses(p => ({ ...p, [k]: { msg, type } }));
  const setLoad   = (k, v)        => setLoading(p => ({ ...p, [k]: v }));

  const run = async (key, fn) => {
    setLoad(key, true);
    setStatus(key, 'Fetching…', 'loading');
    try {
      const msg = await fn();
      setStatus(key, `✓ ${msg}`, 'ok');
    } catch (e) {
      setStatus(key, `✗ ${e.message}`, 'err');
    }
    setLoad(key, false);
  };

  const anyLoading = useMemo(() => bulkRunning || Object.values(loading).some(Boolean), [bulkRunning, loading]);

  const importAll = async (src) => {
    if (anyLoading) return;
    cancelRef.current = false;
    setBulkRunning(true);
    setStatus(`all_${src}`, 'Startingâ€¦', 'loading');

    const steps = [
      () => importSeasons(src),
      () => importCircuits(src),
      () => importTeams(src),
      () => importDrivers(src),
      () => importRaces(src),
      () => importRaceResults(src),
      () => importDriverStandings(src),
      () => importConstructorStandings(src),
    ];

    for (const step of steps) {
      if (cancelRef.current) break;
      // eslint-disable-next-line no-await-in-loop
      await step();
    }

    setStatus(`all_${src}`, cancelRef.current ? 'Cancelled' : 'Done', cancelRef.current ? 'err' : 'ok');
    setBulkRunning(false);
  };

  useEffect(() => () => { cancelRef.current = true; }, []);

  useEffect(() => {
    if (!autoRun || autoRanRef.current) return;
    autoRanRef.current = true;
    onAutoRunConsumed?.();
    importAll(autoSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, autoSource]);

  const importSeasons = (src) => run(`seasons_${src}`, async () => {
    const data = src === 'ergast' ? await fetchErgast('/seasons') : await fetchJolpica('/seasons');
    const rows = data.MRData.SeasonTable.Seasons.map(s => ({ year: parseInt(s.season), url: s.url }));
    const { error } = await upsertMany('seasons', rows, 'year');
    if (error) throw new Error(error.message);
    return `${rows.length} seasons upserted`;
  });

  const importCircuits = (src) => run(`circuits_${src}`, async () => {
    const data = src === 'ergast' ? await fetchErgast(`/${season}/circuits`) : await fetchJolpica(`/${season}/circuits`);
    const rows = data.MRData.CircuitTable.Circuits.map(c => ({
      name: c.circuitName, locality: c.Location.locality,
      country: c.Location.country, lat: parseFloat(c.Location.lat),
      lng: parseFloat(c.Location.long), wiki_url: c.url,
    }));
    const { error } = await upsertMany('circuits', rows, 'name');
    if (error) throw new Error(error.message);
    return `${rows.length} circuits upserted`;
  });

  const importTeams = (src) => run(`teams_${src}`, async () => {
    const data = src === 'ergast' ? await fetchErgast(`/${season}/constructors`) : await fetchJolpica(`/${season}/constructors`);
    const rows = data.MRData.ConstructorTable.Constructors.map(c => ({
      name: c.name, nationality: c.nationality, wiki_url: c.url,
    }));
    const { error } = await upsertMany('teams', rows, 'name');
    if (error) throw new Error(error.message);
    return `${rows.length} teams upserted`;
  });

  const importDrivers = (src) => run(`drivers_${src}`, async () => {
    const data = src === 'ergast' ? await fetchErgast(`/${season}/drivers`) : await fetchJolpica(`/${season}/drivers`);
    const rows = data.MRData.DriverTable.Drivers.map(d => ({
      first_name: d.givenName, last_name: d.familyName,
      code: d.code || null, number: d.permanentNumber ? parseInt(d.permanentNumber) : null,
      dob: d.dateOfBirth || null, nationality: d.nationality, wiki_url: d.url, active: true,
    }));
    // Upsert by wiki_url (unique) so re-imports update existing rows instead of duplicating.
    const { error } = await upsertMany('drivers', rows, 'wiki_url');
    if (error) throw new Error(error.message);
    return `${rows.length} drivers upserted`;
  });

  const importRaces = (src) => run(`races_${src}`, async () => {
    // need circuits loaded first to resolve circuit_id
    const { data: circuits } = await db.circuits.list();
    const data = src === 'ergast' ? await fetchErgast(`/${season}`) : await fetchJolpica(`/${season}`);
    const schedule = data.MRData.RaceTable.Races;
    const rows = schedule.map(r => ({
      season_year: parseInt(r.season),
      round: parseInt(r.round),
      name: r.raceName,
      date: r.date || null,
      time_utc: r.time ? r.time.replace('Z', '') : null,
      circuit_id: circuits?.find(c => c.name === r.Circuit.circuitName)?.id || null,
      sprint: !!r.Sprint,
      wiki_url: r.url || null,
    }));
    const { error } = await upsertMany('races', rows, 'season_year,round');
    if (error) throw new Error(error.message);
    return `${rows.length} races upserted`;
  });

  const importOpenF1Sessions = () => run('openf1_sessions', async () => {
    const { data: circuits } = await db.circuits.list();
    const sessions = await fetchOpenF1(`/sessions?year=${season}&session_type=Race`);
    let added = 0;
    for (const s of sessions) {
      const circuit_id = circuits?.find(c =>
        c.name?.toLowerCase().includes((s.circuit_short_name || '').toLowerCase()) ||
        c.locality?.toLowerCase().includes((s.location || '').toLowerCase())
      )?.id || null;
      const row = {
        season_year: s.year, round: s.meeting_key,
        name: s.meeting_name || `Round ${s.meeting_key}`,
        date: s.date_start?.slice(0, 10) || null,
        time_utc: s.date_start?.slice(11, 19) || null,
        circuit_id, sprint: false,
      };
      const { error } = await upsertMany('races', [row], 'season_year,round');
      if (!error) added++;
    }
    return `${added} OpenF1 race sessions upserted`;
  });



  const importRaceResults = (src) => run(`rresults_${src}`, async () => {
    const { data: dbRaces }   = await db.races.list();
    const { data: dbDrivers } = await db.drivers.list();
    const { data: dbTeams }   = await db.teams.list();
    const seasonRaces = (dbRaces || []).filter(r => String(r.season_year) === String(season));
    let total = 0;
    for (const race of seasonRaces) {
      const data = src === 'ergast'
        ? await fetchErgast(`/${season}/${race.round}/results`)
        : await fetchJolpica(`/${season}/${race.round}/results`);
      const ergastResults = data.MRData.RaceTable?.Races?.[0]?.Results || [];
      const rows = ergastResults.map(r => {
        const driver = dbDrivers?.find(d => d.first_name?.toLowerCase() === r.Driver.givenName.toLowerCase() && d.last_name?.toLowerCase() === r.Driver.familyName.toLowerCase());
        const team   = dbTeams?.find(t => t.name?.toLowerCase() === r.Constructor.name.toLowerCase());
        return {
          race_id:        race.id,
          driver_id:      driver?.id || null,
          team_id:        team?.id   || null,
          position:       r.positionText === 'R' || r.positionText === 'D' ? null : parseInt(r.position),
          grid_position:  parseInt(r.grid) || null,
          points:         parseFloat(r.points) || 0,
          status:         r.status,
          laps_completed: parseInt(r.laps) || null,
          time_or_gap:    r.Time?.time || r.FastestLap?.Time?.time || null,
          fastest_lap:    r.FastestLap?.rank === '1',
          fastest_lap_time: r.FastestLap?.Time?.time || null,
        };
      }).filter(r => r.driver_id);
      if (rows.length) {
        const { error } = await upsertMany('race_results', rows, 'race_id,driver_id');
        if (error) throw new Error(error.message);
        total += rows.length;
      }
    }
    return `${total} result rows upserted across ${seasonRaces.length} races`;
  });

  const importDriverStandings = (src) => run(`dstandings_${src}`, async () => {
    const data = src === 'ergast' ? await fetchErgast(`/${season}/driverStandings`) : await fetchJolpica(`/${season}/driverStandings`);
    const standingsList = data.MRData.StandingsTable.StandingsLists?.[0];
    if (!standingsList) throw new Error('No standings data');
    const { data: dbDrivers } = await db.drivers.list();
    const { data: dbTeams } = await db.teams.list();
    const rows = standingsList.DriverStandings.map(s => {
      const driver = dbDrivers?.find(d =>
        d.first_name?.toLowerCase() === s.Driver.givenName?.toLowerCase() &&
        d.last_name?.toLowerCase()  === s.Driver.familyName?.toLowerCase()
      );
      const constructorName = s.Constructors?.[0]?.name;
      const team = constructorName
        ? dbTeams?.find(t => t.name?.toLowerCase() === constructorName.toLowerCase())
        : null;
      return {
        season_year: parseInt(standingsList.season),
        driver_id: driver?.id || null,
        team_id: team?.id || null,
        points: parseFloat(s.points),
        position: parseInt(s.position),
        wins: parseInt(s.wins),
      };
    }).filter(r => r.driver_id);
    const { error } = await upsertMany('driver_standings', rows, 'season_year,driver_id');
    if (error) throw new Error(error.message);

    // Also set current team + build past teams on driver records (admin-only update)
    // - If the driver already has a different current team, move it into past teams.
    // - Ensure we don't add duplicates.
    const updates = rows.filter(r => r.driver_id && r.team_id).map(r => {
      const driver = dbDrivers?.find(d => d.id === r.driver_id);
      if (!driver) return null;
      const existingTeamId = driver.team_id;
      const past = Array.isArray(driver.past_team_ids) ? driver.past_team_ids.filter(Boolean) : [];
      const nextPast = [...new Set([
        ...past,
        ...(existingTeamId && existingTeamId !== r.team_id ? [existingTeamId] : []),
      ])].filter(id => id !== r.team_id);
      return { id: driver.id, team_id: r.team_id, past_team_ids: nextPast };
    }).filter(Boolean);

    for (const u of updates) {
      // eslint-disable-next-line no-await-in-loop
      await db.drivers.update(u.id, { team_id: u.team_id, past_team_ids: u.past_team_ids });
    }
    return `${rows.length} driver standing rows upserted`;
  });

  const importConstructorStandings = (src) => run(`cstandings_${src}`, async () => {
    const data = src === 'ergast' ? await fetchErgast(`/${season}/constructorStandings`) : await fetchJolpica(`/${season}/constructorStandings`);
    const standingsList = data.MRData.StandingsTable.StandingsLists?.[0];
    if (!standingsList) throw new Error('No standings data');
    const { data: dbTeams } = await db.teams.list();
    const rows = standingsList.ConstructorStandings.map(s => {
      const team = dbTeams?.find(t => t.name?.toLowerCase() === s.Constructor.name?.toLowerCase());
      return {
        season_year: parseInt(standingsList.season),
        team_id: team?.id || null,
        points: parseFloat(s.points),
        position: parseInt(s.position),
        wins: parseInt(s.wins),
      };
    }).filter(r => r.team_id);
    const { error } = await upsertMany('constructor_standings', rows, 'season_year,team_id');
    if (error) throw new Error(error.message);
    return `${rows.length} constructor standing rows upserted`;
  });

  const StatusBadge = ({ k }) => {
    const s = statuses[k];
    if (!s) return null;
    return <span style={{ ...statusStyle, ...(s.type === 'ok' ? okStyle : s.type === 'err' ? errStyle : loadStyle) }}>{s.msg}</span>;
  };

  const ImportRow = ({ label, keyPrefix, onErgast, onJolpica }) => (
    <div className="import-row" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
      <span className="import-row__label" style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <button className="btn btn-ghost btn-sm" onClick={onErgast} disabled={anyLoading || loading[`${keyPrefix}_ergast`]}>
        {loading[`${keyPrefix}_ergast`] ? <span className="spinner" /> : null} Ergast
      </button>
      <button className="btn btn-yellow btn-sm" onClick={onJolpica} disabled={anyLoading || loading[`${keyPrefix}_jolpica`]}>
        {loading[`${keyPrefix}_jolpica`] ? <span className="spinner" /> : null} Jolpica
      </button>
      <StatusBadge k={`${keyPrefix}_ergast`} />
      <StatusBadge k={`${keyPrefix}_jolpica`} />
    </div>
  );

  return (
    <div>
      <div className="import-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed'", fontSize: 30, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
          Import <span style={{ color: 'var(--red)' }}>Data</span>
        </h1>
        <div className="import-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-yellow" disabled={anyLoading} onClick={() => importAll('jolpica')}>
            {bulkRunning ? <span className="spinner" /> : null} Fetch All (Jolpica)
          </button>
          <button className="btn btn-ghost" disabled={anyLoading} onClick={() => importAll('ergast')}>
            {bulkRunning ? <span className="spinner" /> : null} Fetch All (Ergast)
          </button>
          {bulkRunning ? (
            <button className="btn btn-danger" onClick={() => { cancelRef.current = true; }}>
              Cancel
            </button>
          ) : null}
          <StatusBadge k="all_jolpica" />
          <StatusBadge k="all_ergast" />
        </div>
      </div>

      {/* Season selector */}
      <Panel title="⚙ Target Season">
        <div className="import-season" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ margin: 0 }}>Season Year</label>
          <input className="import-season__input" type="number" value={season} onChange={e => setSeason(e.target.value)} min="1950" max="2030" />
        </div>
      </Panel>

      {/* Ergast / Jolpica */}
      <Panel title="📡 Ergast / Jolpica API">
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Non-destructive upsert — existing records are preserved. Import circuits before races.
        </p>
        <ImportRow label="Seasons (all)" keyPrefix="seasons" onErgast={() => importSeasons('ergast')} onJolpica={() => importSeasons('jolpica')} />
        <ImportRow label="Circuits"      keyPrefix="circuits" onErgast={() => importCircuits('ergast')} onJolpica={() => importCircuits('jolpica')} />
        <ImportRow label="Teams"         keyPrefix="teams"    onErgast={() => importTeams('ergast')} onJolpica={() => importTeams('jolpica')} />
        <ImportRow label="Drivers"       keyPrefix="drivers"  onErgast={() => importDrivers('ergast')} onJolpica={() => importDrivers('jolpica')} />
        
        <ImportRow label="Race Results (all rounds)" keyPrefix="rresults" onErgast={() => importRaceResults('ergast')} onJolpica={() => importRaceResults('jolpica')} />
        <ImportRow label="Driver Standings"       keyPrefix="dstandings" onErgast={() => importDriverStandings('ergast')} onJolpica={() => importDriverStandings('jolpica')} />
        <ImportRow label="Constructor Standings"  keyPrefix="cstandings" onErgast={() => importConstructorStandings('ergast')} onJolpica={() => importConstructorStandings('jolpica')} />
        <ImportRow label="Race Schedule" keyPrefix="races"    onErgast={() => importRaces('ergast')} onJolpica={() => importRaces('jolpica')} />
      </Panel>

      {/* OpenF1 */}
      <Panel title="🟢 OpenF1 API">
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Real-time and historical telemetry sessions. Import circuits first for best matching.
        </p>
        <div className="openf1-row" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="openf1-row__label" style={{ fontSize: 13, color: 'var(--muted)' }}>Race Sessions</span>
          <button className="btn btn-ghost btn-sm" onClick={importOpenF1Sessions} disabled={anyLoading || loading['openf1_sessions']}>
            {loading['openf1_sessions'] ? <span className="spinner" /> : null} Import from OpenF1
          </button>
          <StatusBadge k="openf1_sessions" />
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="card" style={{ padding: 22, marginBottom: 18 }}>
      <h3 style={{ fontFamily: "'Barlow Condensed'", fontSize: 15, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

const statusStyle = { fontSize: 12, padding: '4px 10px', borderRadius: 4 };
const okStyle   = { background: 'rgba(34,197,94,.12)',  color: '#4ade80' };
const errStyle  = { background: 'rgba(225,6,0,.12)',    color: '#f87171' };
const loadStyle = { background: 'rgba(59,130,246,.12)', color: '#60a5fa' };

// ── Additional export used by ImportPage bottom section ───────────────────────
export function ImportStandingsSection({ seasons }) {
  // Inline import of standings from Ergast
  return null; // Handled inline in ImportPage
}
