// src/pages/Standings.jsx
import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { DriverPhoto, TeamLogo } from '../components/Images';
import { Loader, Empty } from './Drivers';

function posColor(pos) {
  if (pos === 1) return '#f5c518';
  if (pos === 2) return '#c0c0c0';
  if (pos === 3) return '#cd7f32';
  return 'var(--text)';
}

function TitleRow({ title, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
      <div>
        <div className="page-subtitle">Standings</div>
        <h1 className="page-title" style={{ marginTop: 6 }}>{title}</h1>
      </div>
      {right}
    </div>
  );
}

export function DriverStandingsPage({ seasons }) {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(seasons?.[0]?.year || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const load = async (y) => {
    if (!y) return;
    setLoading(true);
    setError('');
    const { data, error: e } = await db.driver_standings.listBySeason(y);
    if (e) setError(e.message);
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(year); }, [year]);

  const computeFromResults = async () => {
    setSyncing(true);
    setError('');
    try {
      const { data: races, error: racesError } = await db.races.list();
      if (racesError) throw new Error(racesError.message);

      const seasonRaces = (races || []).filter((r) => String(r.season_year) === String(year));
      const totals = {};

      for (const race of seasonRaces) {
        // eslint-disable-next-line no-await-in-loop
        const { data: results, error: rrError } = await db.race_results.listByRace(race.id);
        if (rrError) throw new Error(rrError.message);

        for (const res of results || []) {
          if (!res.driver_id) continue;
          if (!totals[res.driver_id]) totals[res.driver_id] = { driver_id: res.driver_id, team_id: res.team_id, points: 0, wins: 0 };
          totals[res.driver_id].points += Number(res.points || 0);
          if (res.position === 1) totals[res.driver_id].wins += 1;
          if (res.team_id) totals[res.driver_id].team_id = res.team_id;
        }
      }

      const sorted = Object.values(totals).sort((a, b) => b.points - a.points || b.wins - a.wins);
      const upsertRows = sorted.map((r, i) => ({ ...r, season_year: Number(year), position: i + 1 }));

      if (upsertRows.length) {
        const { error: upsertError } = await db.driver_standings.upsert(upsertRows);
        if (upsertError) throw new Error(upsertError.message);
      }
      await load(year);
    } catch (e) {
      setError(e.message || 'Failed to compute standings.');
    }
    setSyncing(false);
  };

  const maxPts = useMemo(() => Math.max(1, ...rows.map((r) => Number(r.points) || 0)), [rows]);

  return (
    <div>
      <TitleRow
        title="Driver Standings"
        right={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={year} onChange={(e) => setYear(e.target.value)} style={{ minWidth: 140 }}>
              <option value="">— Season —</option>
              {(seasons || []).map((s) => (
                <option key={s.id} value={s.year}>{s.year}</option>
              ))}
            </select>
            {isAdmin && year ? (
              <button className="btn btn-ghost btn-sm" onClick={computeFromResults} disabled={syncing} type="button">
                {syncing ? <span className="spinner" /> : null}
                Compute from Results
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div> : null}
      {!year ? <Empty icon="🏆" label="Select a season to view standings" /> : null}

      {year ? (
        loading ? <Loader /> : rows.length === 0 ? (
          <Empty icon="📊" label="No standings data. Import or compute from results." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 66 }}>Pos</th>
                  <th>Driver</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'right', width: 80 }}>Wins</th>
                  <th style={{ textAlign: 'right', width: 120 }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const tc = r.teams?.team_color || 'var(--red)';
                  const pts = Number(r.points) || 0;
                  const pct = Math.max(2, Math.round((pts / maxPts) * 100));
                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontWeight: 900, fontSize: 20, color: posColor(r.position) }}>{r.position}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 4, height: 26, background: tc, borderRadius: 2 }} />
                          <DriverPhoto
                            src={r.drivers?.image_url}
                            name={`${r.drivers?.first_name || ''} ${r.drivers?.last_name || ''}`}
                            size={40}
                            rounded
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontWeight: 900 }}>{r.drivers ? `${r.drivers.first_name} ${r.drivers.last_name}` : '—'}</span>
                            <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                              {r.drivers?.code || '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <TeamLogo src={r.teams?.logo_url} name={r.teams?.name} size={22} />
                          <span style={{ fontWeight: 800 }}>{r.teams?.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--muted)', fontWeight: 800 }}>{r.wins ?? 0}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                          <span style={{ fontWeight: 900, fontSize: 18 }}>{pts}</span>
                          <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,.10)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: tc, borderRadius: 2, transition: 'width .5s ease' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

export function ConstructorStandingsPage({ seasons }) {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState(seasons?.[0]?.year || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const load = async (y) => {
    if (!y) return;
    setLoading(true);
    setError('');
    const { data, error: e } = await db.constructor_standings.listBySeason(y);
    if (e) setError(e.message);
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(year); }, [year]);

  const computeFromResults = async () => {
    setSyncing(true);
    setError('');
    try {
      const { data: races, error: racesError } = await db.races.list();
      if (racesError) throw new Error(racesError.message);

      const seasonRaces = (races || []).filter((r) => String(r.season_year) === String(year));
      const totals = {};

      for (const race of seasonRaces) {
        // eslint-disable-next-line no-await-in-loop
        const { data: results, error: rrError } = await db.race_results.listByRace(race.id);
        if (rrError) throw new Error(rrError.message);

        for (const res of results || []) {
          if (!res.team_id) continue;
          if (!totals[res.team_id]) totals[res.team_id] = { team_id: res.team_id, points: 0, wins: 0 };
          totals[res.team_id].points += Number(res.points || 0);
          if (res.position === 1) totals[res.team_id].wins += 1;
        }
      }

      const sorted = Object.values(totals).sort((a, b) => b.points - a.points || b.wins - a.wins);
      const upsertRows = sorted.map((r, i) => ({ ...r, season_year: Number(year), position: i + 1 }));

      if (upsertRows.length) {
        const { error: upsertError } = await db.constructor_standings.upsert(upsertRows);
        if (upsertError) throw new Error(upsertError.message);
      }
      await load(year);
    } catch (e) {
      setError(e.message || 'Failed to compute standings.');
    }
    setSyncing(false);
  };

  const maxPts = useMemo(() => Math.max(1, ...rows.map((r) => Number(r.points) || 0)), [rows]);

  return (
    <div>
      <TitleRow
        title="Constructor Standings"
        right={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={year} onChange={(e) => setYear(e.target.value)} style={{ minWidth: 140 }}>
              <option value="">— Season —</option>
              {(seasons || []).map((s) => (
                <option key={s.id} value={s.year}>{s.year}</option>
              ))}
            </select>
            {isAdmin && year ? (
              <button className="btn btn-ghost btn-sm" onClick={computeFromResults} disabled={syncing} type="button">
                {syncing ? <span className="spinner" /> : null}
                Compute from Results
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div> : null}
      {!year ? <Empty icon="🏁" label="Select a season to view standings" /> : null}

      {year ? (
        loading ? <Loader /> : rows.length === 0 ? (
          <Empty icon="🏎️" label="No standings data. Import or compute from results." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 66 }}>Pos</th>
                  <th>Team</th>
                  <th style={{ textAlign: 'right', width: 80 }}>Wins</th>
                  <th style={{ textAlign: 'right', width: 140 }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const tc = r.teams?.team_color || 'var(--red)';
                  const pts = Number(r.points) || 0;
                  const pct = Math.max(2, Math.round((pts / maxPts) * 100));
                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontWeight: 900, fontSize: 20, color: posColor(r.position) }}>{r.position}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 4, height: 26, background: tc, borderRadius: 2 }} />
                          <TeamLogo src={r.teams?.logo_url} name={r.teams?.name} size={26} />
                          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontWeight: 900 }}>{r.teams?.name || '—'}</span>
                            <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                              {r.teams?.nationality || '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--muted)', fontWeight: 800 }}>{r.wins ?? 0}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                          <span style={{ fontWeight: 900, fontSize: 18 }}>{pts}</span>
                          <div style={{ width: 140, height: 4, background: 'rgba(255,255,255,.10)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: tc, borderRadius: 2, transition: 'width .5s ease' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

