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

function countdownParts(ms) {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return { days, hrs, min, sec };
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

        // If standings tables are empty but results exist, compute from results for display.
        if (dsRows.length === 0 && csRows.length === 0) {
          const { data: rr, error: rrError } = await db.race_results.listBySeason(latestYear);
          if (!alive) return;
          if (!rrError && (rr || []).length) {
            const driverTotals = {};
            const teamTotals = {};
            for (const res of rr || []) {
              if (res.driver_id) {
                if (!driverTotals[res.driver_id]) {
                  driverTotals[res.driver_id] = { driver_id: res.driver_id, team_id: res.team_id, points: 0, wins: 0, drivers: res.drivers || null, teams: res.teams || null };
                }
                driverTotals[res.driver_id].points += Number(res.points || 0);
                if (res.position === 1) driverTotals[res.driver_id].wins += 1;
                if (res.team_id) {
                  driverTotals[res.driver_id].team_id = res.team_id;
                  if (res.teams) driverTotals[res.driver_id].teams = res.teams;
                }
                if (res.drivers) driverTotals[res.driver_id].drivers = res.drivers;
              }
              if (res.team_id) {
                if (!teamTotals[res.team_id]) teamTotals[res.team_id] = { team_id: res.team_id, points: 0, wins: 0, teams: res.teams || null };
                teamTotals[res.team_id].points += Number(res.points || 0);
                if (res.position === 1) teamTotals[res.team_id].wins += 1;
                if (res.teams) teamTotals[res.team_id].teams = res.teams;
              }
            }

            const driversSorted = Object.values(driverTotals).sort((a, b) => b.points - a.points || b.wins - a.wins);
            const teamsSorted = Object.values(teamTotals).sort((a, b) => b.points - a.points || b.wins - a.wins);

            const computedDriverRows = driversSorted.map((row, i) => ({ ...row, season_year: Number(latestYear), position: i + 1, id: `${latestYear}-d-${row.driver_id}` }));
            const computedTeamRows = teamsSorted.map((row, i) => ({ ...row, season_year: Number(latestYear), position: i + 1, id: `${latestYear}-t-${row.team_id}` }));

            setDriverTop(computedDriverRows.slice(0, 5));
            setConstructorTop(computedTeamRows.slice(0, 5));

            // Admin: best-effort upsert so the Standings pages can use the stored tables.
            if (isAdmin) {
              const upsertDrivers = driversSorted.map((row, i) => ({ driver_id: row.driver_id, team_id: row.team_id, points: row.points, wins: row.wins, season_year: Number(latestYear), position: i + 1 }));
              const upsertTeams = teamsSorted.map((row, i) => ({ team_id: row.team_id, points: row.points, wins: row.wins, season_year: Number(latestYear), position: i + 1 }));
              await db.driver_standings.upsert(upsertDrivers);
              await db.constructor_standings.upsert(upsertTeams);
            }

            setLoading(false);
            return;
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
    return list.slice(0, 6);
  }, [races]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><span className="spinner spinner-lg" /></div>;

  const cd = countdownParts(countdownMs);
  const country = heroRace?.circuits?.country || '';
  const heroLabel = heroMode === 'upcoming' ? 'NEXT RACE' : heroMode === 'latest' ? 'LATEST RESULT' : 'OVERVIEW';
  const heroName = heroRace?.name || 'No races yet';
  const nameParts = heroName.split(/Grand Prix/i);
  const heroNameA = (nameParts[0] || heroName).trim();
  const heroNameB = /grand prix/i.test(heroName) ? 'Grand Prix' : (nameParts[1] || '').trim();
  const metaBits = [
    heroRace?.season_year ? String(heroRace.season_year) : null,
    heroRace?.round ? `Round ${heroRace.round}` : null,
    country ? country : null,
    heroRace?.date || null,
  ].filter(Boolean);

  const hasLayout = !!heroRace?.circuits?.layout_url;

  return (
    <div className="dashboard-tv">
      {error ? <div className="error-msg">{error}</div> : null}

      <section className="dashboard-tv__hero">
        <div className="dashboard-tv__hero-inner">
          <div className={`dashboard-tv__hero-left ${hasLayout ? 'has-layout' : 'no-layout'}`}>
            <div className="dashboard-tv__titleGlow" aria-hidden="true" />
            <div className="dashboard-tv__hero-label">{heroLabel}</div>
            <h1 className="dashboard-tv__hero-title" title={heroName}>
              <span className="dashboard-tv__hero-titleA">{heroNameA}</span>
              {heroNameB ? <span className="dashboard-tv__hero-titleB">{heroNameB}</span> : null}
            </h1>
            {metaBits.length ? (
              <div className="dashboard-tv__hero-meta">
                {metaBits.map((b, i) => (
                  <span key={`${b}-${i}`} className="dashboard-tv__hero-metaBit">
                    {b}
                    {i < metaBits.length - 1 ? <span className="dashboard-tv__dot">·</span> : null}
                  </span>
                ))}
              </div>
            ) : null}

            {heroMode === 'upcoming' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'flex-end',
                  gap: 0,
                  marginTop: 24,
                }}
              >
                {[
                  [String(cd.days), 'DAYS'],
                  [String(cd.hrs).padStart(2, '0'), 'HRS'],
                  [String(cd.min).padStart(2, '0'), 'MIN'],
                  [String(cd.sec).padStart(2, '0'), 'SEC'],
                ].map(([num, label], i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 72, lineHeight: 1, letterSpacing: '-0.04em', color: 'white' }}>
                        {num}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
                        {label}
                      </div>
                    </div>
                    {i < 3 ? (
                      <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 48, color: 'var(--red)', lineHeight: 1, margin: '0 8px 14px', opacity: 0.6 }}>
                        :
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="dashboard-tv__quicklinks">
              {['Schedule', 'Results', 'Standings'].map((label) => (
                <button
                  key={label}
                  onClick={() => setTab(label.toLowerCase())}
                  type="button"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: 980,
                    padding: '8px 18px',
                    fontFamily: 'var(--sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'background 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    letterSpacing: '-0.01em',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {heroRace?.circuits?.layout_url ? (
            <img
              className="dashboard-tv__hero-layout"
              src={heroRace.circuits.layout_url}
              alt=""
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : null}
        </div>
      </section>

      <section className="dashboard-tv__standings">
        <div className="dashboard-tv__standings-inner">
          <div className="dashboard-tv__col">
            <div className="dashboard-tv__h2">Driver Standings</div>
            {driverTop.length ? (
              <div className="dashboard-tv__list">
                {driverTop.map((r, idx) => (
                  <div key={r.id} className={`dashboard-tv__row ${idx === driverTop.length - 1 ? 'is-last' : ''}`}>
                    <div className="dashboard-tv__pos" style={{ color: posColor(r.position) }}>{r.position}</div>
                    <div className="dashboard-tv__bar" style={{ background: r.teams?.team_color || 'var(--red)' }} />
                    <div className="dashboard-tv__avatar">
                      <DriverPhoto src={r.drivers?.image_url} name={`${r.drivers?.first_name || ''} ${r.drivers?.last_name || ''}`} size={32} rounded />
                    </div>
                    <div className="dashboard-tv__name" title={r.drivers ? `${r.drivers.first_name} ${r.drivers.last_name}` : ''}>
                      {r.drivers ? `${r.drivers.first_name} ${r.drivers.last_name}` : '—'}
                    </div>
                    <div className="dashboard-tv__pts">{Number(r.points) || 0}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: 22 }}>No standings yet.</div>
            )}
            <button className="dashboard-tv__viewall" onClick={() => setTab('standings')} type="button">View All →</button>
          </div>

          <div className="dashboard-tv__col">
            <div className="dashboard-tv__h2">Constructor Standings</div>
            {constructorTop.length ? (
              <div className="dashboard-tv__list">
                {constructorTop.map((r, idx) => (
                  <div key={r.id} className={`dashboard-tv__row ${idx === constructorTop.length - 1 ? 'is-last' : ''}`}>
                    <div className="dashboard-tv__pos" style={{ color: posColor(r.position) }}>{r.position}</div>
                    <div className="dashboard-tv__bar" style={{ background: r.teams?.team_color || 'var(--red)' }} />
                    <div className="dashboard-tv__teamLogo">
                      <TeamLogo src={r.teams?.logo_url} name={r.teams?.name} size={28} />
                    </div>
                    <div className="dashboard-tv__name" title={r.teams?.name || ''}>
                      {r.teams?.name || '—'}
                    </div>
                    <div className="dashboard-tv__pts">{Number(r.points) || 0}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ padding: 22 }}>No standings yet.</div>
            )}
            <button className="dashboard-tv__viewall" onClick={() => setTab('standings')} type="button">View All →</button>
          </div>
        </div>
      </section>

      <section className="dashboard-tv__latest">
        <div className="dashboard-tv__latest-inner">
          <div className="dashboard-tv__h2">Latest Races</div>
          <div className="dashboard-tv__raceRow">
            {latestRaces.map((r) => (
              <div key={r.id} className="dashboard-tv__raceCard">
                <div className="dashboard-tv__raceMedia">
                  {r.circuits?.layout_url ? (
                    <img
                      src={r.circuits.layout_url}
                      alt=""
                      className="dashboard-tv__raceImg"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="dashboard-tv__raceFallback">{r.circuits?.country || '—'}</div>
                  )}
                </div>
                <div className="dashboard-tv__raceBody">
                  <div className="dashboard-tv__raceRound">{r.season_year} · Round {r.round}</div>
                  <div className="dashboard-tv__raceName" title={r.name}>{r.name}</div>
                  <div className="dashboard-tv__raceSub">{(r.circuits?.country || '—')}{r.date ? ` · ${r.date}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function posColor(pos) {
  if (pos === 1) return '#f5c518';
  if (pos === 2) return '#c0c0c0';
  if (pos === 3) return '#cd7f32';
  return 'var(--text)';
}
