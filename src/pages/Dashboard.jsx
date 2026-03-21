// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/supabase';
import { DriverPhoto, TeamLogo } from '../components/Images';
import { useAuth } from '../hooks/useAuth';

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const hh = String(hrs).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

export default function Dashboard({ setTab }) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const [seasons, setSeasons] = useState([]);
  const [races, setRaces] = useState([]);
  const [driverTop, setDriverTop] = useState([]);
  const [constructorTop, setConstructorTop] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      const [s, r] = await Promise.all([db.seasons.list(), db.races.list()]);
      if (!alive) return;
      if (s.error) { setError(s.error.message); setLoading(false); return; }
      if (r.error) { setError(r.error.message); setLoading(false); return; }

      const seasonsList = s.data || [];
      const racesList = r.data || [];
      setSeasons(seasonsList);
      setRaces(racesList);

      const latestYear = Math.max(0, ...seasonsList.map((x) => Number(x.year) || 0));
      if (latestYear) {
        let [ds, cs] = await Promise.all([
          db.driver_standings.listBySeason(latestYear),
          db.constructor_standings.listBySeason(latestYear),
        ]);
        if (!alive) return;
        const dsRows = ds.error ? [] : (ds.data || []);
        const csRows = cs.error ? [] : (cs.data || []);

        // If standings tables are empty but results exist, compute & upsert (admin) then reload.
        if (isAdmin && dsRows.length === 0 && csRows.length === 0) {
          const { data: rr, error: rrError } = await db.race_results.listBySeason(latestYear);
          if (!alive) return;
          if (!rrError && (rr || []).length) {
            const driverTotals = {};
            const teamTotals = {};
            for (const res of rr || []) {
              if (res.driver_id) {
                if (!driverTotals[res.driver_id]) driverTotals[res.driver_id] = { driver_id: res.driver_id, team_id: res.team_id, points: 0, wins: 0 };
                driverTotals[res.driver_id].points += Number(res.points || 0);
                if (res.position === 1) driverTotals[res.driver_id].wins += 1;
                if (res.team_id) driverTotals[res.driver_id].team_id = res.team_id;
              }
              if (res.team_id) {
                if (!teamTotals[res.team_id]) teamTotals[res.team_id] = { team_id: res.team_id, points: 0, wins: 0 };
                teamTotals[res.team_id].points += Number(res.points || 0);
                if (res.position === 1) teamTotals[res.team_id].wins += 1;
              }
            }

            const driversSorted = Object.values(driverTotals).sort((a, b) => b.points - a.points || b.wins - a.wins);
            const teamsSorted = Object.values(teamTotals).sort((a, b) => b.points - a.points || b.wins - a.wins);

            const upsertDrivers = driversSorted.map((row, i) => ({ ...row, season_year: Number(latestYear), position: i + 1 }));
            const upsertTeams = teamsSorted.map((row, i) => ({ ...row, season_year: Number(latestYear), position: i + 1 }));

            // Best-effort: ignore errors (RLS might block some environments)
            if (upsertDrivers.length) await db.driver_standings.upsert(upsertDrivers);
            if (upsertTeams.length) await db.constructor_standings.upsert(upsertTeams);

            // Reload standings after compute
            // eslint-disable-next-line no-unused-vars
            [ds, cs] = await Promise.all([
              db.driver_standings.listBySeason(latestYear),
              db.constructor_standings.listBySeason(latestYear),
            ]);
            if (!alive) return;
          }
        }

        if (!ds.error) setDriverTop((ds.data || []).slice(0, 5));
        if (!cs.error) setConstructorTop((cs.data || []).slice(0, 5));
      }

      setLoading(false);
    })();
    return () => { alive = false; };
  }, [isAdmin]);

  const { heroRace, heroMode } = useMemo(() => {
    const today = new Date();
    const normalized = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayMs = normalized(today);

    const parsed = (races || [])
      .map((r) => ({ r, dateMs: r.date ? normalized(new Date(r.date)) : null }))
      .filter((x) => x.dateMs != null)
      .sort((a, b) => a.dateMs - b.dateMs || (a.r.round || 0) - (b.r.round || 0));

    const next = parsed.find((x) => x.dateMs >= todayMs)?.r || null;
    if (next) return { heroRace: next, heroMode: 'upcoming' };

    const latest = parsed.length ? parsed[parsed.length - 1].r : null;
    return { heroRace: latest, heroMode: latest ? 'latest' : 'none' };
  }, [races]);

  const countdownMs = useMemo(() => {
    if (!heroRace?.date) return 0;
    const raceDate = new Date(heroRace.date).getTime();
    return raceDate - now;
  }, [heroRace?.date, now]);

  const latestRaces = useMemo(() => {
    const list = [...(races || [])];
    list.sort((a, b) => (b.season_year - a.season_year) || (b.round - a.round));
    return list.slice(0, 5);
  }, [races]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><span className="spinner spinner-lg" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {error ? <div className="error-msg">{error}</div> : null}

      {/* Hero: next race countdown */}
      <div className="card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="page-subtitle">{heroMode === 'upcoming' ? 'Next Race' : heroMode === 'latest' ? 'Latest Result' : 'Overview'}</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.02em', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {heroRace?.name || 'No races yet'}
            </div>
            {heroRace ? (
              <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: 'var(--muted)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 12 }}>
                  {heroRace.season_year} • Round {heroRace.round}
                </span>
                {heroRace.circuits?.country ? (
                  <span style={{ color: 'var(--muted)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 12 }}>
                    {heroRace.circuits.country}
                  </span>
                ) : null}
                {heroRace.date ? (
                  <span style={{ color: 'var(--text)', fontWeight: 800, fontSize: 12 }}>
                    {heroRace.date}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {heroRace?.circuits?.layout_url ? (
            <img
              src={heroRace.circuits.layout_url}
              alt=""
              style={{ width: 220, height: 130, objectFit: 'contain', filter: 'invert(1) opacity(.55)' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : null}
        </div>

        {heroMode === 'upcoming' ? (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Countdown
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '.04em' }}>
              {formatCountdown(countdownMs)}
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-red btn-sm" onClick={() => setTab('races')} type="button">Schedule</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setTab('results')} type="button">Results</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setTab('standings')} type="button">Standings</button>
        </div>
      </div>

      {/* Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="page-subtitle">Driver Standings</div>
          {driverTop.length ? (
            <div style={{ marginTop: 10 }}>
              {driverTop.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ width: 22, fontWeight: 900, color: posColor(r.position) }}>{r.position}</span>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: r.teams?.team_color || 'var(--red)' }} />
                  <DriverPhoto src={r.drivers?.image_url} name={`${r.drivers?.first_name || ''} ${r.drivers?.last_name || ''}`} size={32} rounded />
                  <span style={{ fontWeight: 900, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.drivers ? `${r.drivers.first_name} ${r.drivers.last_name}` : '—'}
                  </span>
                  <span style={{ fontWeight: 900 }}>{Number(r.points) || 0}</span>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('standings')} type="button">View all</button>
              </div>
            </div>
          ) : (
            <div className="empty" style={{ padding: 22 }}>No standings yet.</div>
          )}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="page-subtitle">Constructor Standings</div>
          {constructorTop.length ? (
            <div style={{ marginTop: 10 }}>
              {constructorTop.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ width: 22, fontWeight: 900, color: posColor(r.position) }}>{r.position}</span>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: r.teams?.team_color || 'var(--red)' }} />
                  <TeamLogo src={r.teams?.logo_url} name={r.teams?.name} size={26} />
                  <span style={{ fontWeight: 900, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.teams?.name || '—'}
                  </span>
                  <span style={{ fontWeight: 900 }}>{Number(r.points) || 0}</span>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('standings')} type="button">View all</button>
              </div>
            </div>
          ) : (
            <div className="empty" style={{ padding: 22 }}>No standings yet.</div>
          )}
        </div>
      </div>

      {/* Latest races (horizontal scroll) */}
      <div>
        <div className="page-subtitle">Latest Races</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
          {latestRaces.map((r) => (
            <div key={r.id} className="card" style={{ minWidth: 280, padding: 14, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>
                    {r.season_year} • Round {r.round}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                    {r.circuits?.country || '—'}{r.date ? ` • ${r.date}` : ''}
                  </div>
                </div>
                {r.circuits?.layout_url ? (
                  <img
                    src={r.circuits.layout_url}
                    alt=""
                    style={{ width: 96, height: 60, objectFit: 'contain', filter: 'invert(1) opacity(.45)' }}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function posColor(pos) {
  if (pos === 1) return '#f5c518';
  if (pos === 2) return '#c0c0c0';
  if (pos === 3) return '#cd7f32';
  return 'var(--text)';
}
