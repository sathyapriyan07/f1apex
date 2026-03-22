// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

function countdownParts(ms) {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return { days, hrs, min, sec };
}

export default function Dashboard({ setTab, teams = [], onOpenDriver }) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());

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
      setRaces(racesList);

      const latestYear = Math.max(0, ...seasonsList.map((x) => Number(x.year) || 0));
      if (latestYear) {
        const [ds, cs] = await Promise.all([
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
                  driverTotals[res.driver_id] = {
                    driver_id: res.driver_id,
                    team_id: res.team_id,
                    points: 0,
                    wins: 0,
                    drivers: res.drivers || null,
                    teams: res.teams || null,
                  };
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
                if (!teamTotals[res.team_id]) {
                  teamTotals[res.team_id] = {
                    team_id: res.team_id,
                    points: 0,
                    wins: 0,
                    teams: res.teams || null,
                  };
                }
                teamTotals[res.team_id].points += Number(res.points || 0);
                if (res.position === 1) teamTotals[res.team_id].wins += 1;
                if (res.teams) teamTotals[res.team_id].teams = res.teams;
              }
            }

            const driversSorted = Object.values(driverTotals).sort((a, b) => b.points - a.points || b.wins - a.wins);
            const teamsSorted = Object.values(teamTotals).sort((a, b) => b.points - a.points || b.wins - a.wins);

            const computedDriverRows = driversSorted.map((row, i) => ({
              ...row,
              season_year: Number(latestYear),
              position: i + 1,
              id: `${latestYear}-d-${row.driver_id}`,
            }));
            const computedTeamRows = teamsSorted.map((row, i) => ({
              ...row,
              season_year: Number(latestYear),
              position: i + 1,
              id: `${latestYear}-t-${row.team_id}`,
            }));

            setDriverTop(computedDriverRows.slice(0, 5));
            setConstructorTop(computedTeamRows.slice(0, 5));

            // Admin: best-effort upsert so the Standings pages can use the stored tables.
            if (isAdmin) {
              const upsertDrivers = driversSorted.map((row, i) => ({
                driver_id: row.driver_id,
                team_id: row.team_id,
                points: row.points,
                wins: row.wins,
                season_year: Number(latestYear),
                position: i + 1,
              }));
              const upsertTeams = teamsSorted.map((row, i) => ({
                team_id: row.team_id,
                points: row.points,
                wins: row.wins,
                season_year: Number(latestYear),
                position: i + 1,
              }));
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

  const { nextRace } = useMemo(() => {
    const today = new Date();
    const normalized = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayMs = normalized(today);

    const parsed = (races || [])
      .map((r) => ({ r, dateMs: r.date ? normalized(new Date(r.date)) : null }))
      .filter((x) => x.dateMs != null)
      .sort((a, b) => a.dateMs - b.dateMs || (a.r.round || 0) - (b.r.round || 0));

    const next = parsed.find((x) => x.dateMs >= todayMs)?.r || null;
    const latest = parsed.length ? parsed[parsed.length - 1].r : null;
    return { nextRace: next || latest || null };
  }, [races]);

  const countdownMs = useMemo(() => {
    if (!nextRace?.date) return 0;
    const raceDate = new Date(nextRace.date).getTime();
    return raceDate - now;
  }, [nextRace?.date, now]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80, background: '#000' }}>
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  const countdown = countdownParts(countdownMs);
  const driverStandings = driverTop.slice(0, 3);
  const constructorStandings = constructorTop.slice(0, 3);

  const handleSetTab = (t) => setTab?.(t);

  return (
    <div style={{ background: '#000', minHeight: '100%', color: 'var(--text)' }}>
      {error ? <div className="error-msg">{error}</div> : null}

      <section
        style={{
          padding: '20px 20px 16px',
          background: '#000',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ paddingRight: nextRace?.circuits?.layout_url ? '46%' : 0 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 6,
            }}
          >
            NEXT RACE
          </div>

          <div
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            {nextRace?.name || 'Japanese Grand Prix'}
          </div>

          <div
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 12,
              color: 'var(--muted)',
              marginBottom: 18,
            }}
          >
            {nextRace?.season_year || '2026'} · Round {nextRace?.round || '3'} · {nextRace?.circuits?.country || 'Japan'}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
            {[
              [countdown.days, 'DAYS'],
              [countdown.hrs, 'HRS'],
              [countdown.min, 'MIN'],
              [countdown.sec, 'SEC'],
            ].map(([val, label], i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: 'var(--sans)',
                      fontWeight: 900,
                      fontSize: 36,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      color: 'var(--text)',
                    }}
                  >
                    {String(val ?? 0).padStart(2, '0')}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 8,
                      color: 'var(--muted)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginTop: 3,
                    }}
                  >
                    {label}
                  </div>
                </div>
                {i < 3 ? (
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--red)',
                      margin: '0 6px',
                      marginBottom: 14,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {nextRace?.circuits?.layout_url ? (
          <div
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '42%',
              maskImage: 'linear-gradient(to right, transparent 0%, black 30%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%)',
              pointerEvents: 'none',
            }}
          >
            <img
              src={nextRace.circuits.layout_url}
              alt=""
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => (e.currentTarget.parentElement.style.display = 'none')}
            />
          </div>
        ) : null}
      </section>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />

      <section style={{ padding: '8px 20px 28px', background: '#000' }}>
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: '-0.01em',
            marginBottom: 16,
            color: 'var(--text)',
          }}
        >
          <span style={{ color: 'var(--red)' }}>Driver</span> Standings
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr 1fr',
            gap: 8,
            alignItems: 'stretch',
          }}
        >
          {[driverStandings[1], driverStandings[0], driverStandings[2]].map((standing, colIdx) => {
            if (!standing) return <div key={colIdx} />;
            const driver = standing.drivers;
            const isCenter = colIdx === 1;
            const team =
              teams.find((t) => t.id === standing.team_id || t.id === driver?.team_id || t.name === standing.teams?.name) ||
              standing.teams ||
              null;
            const teamColor = team?.team_color || '#ffffff';
            const pos = colIdx === 0 ? 2 : colIdx === 1 ? 1 : 3;

            return (
              <div
                key={standing.id}
                onClick={() => onOpenDriver?.(driver?.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenDriver?.(driver?.id);
                }}
                style={{
                  position: 'relative',
                  borderRadius: 14,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  minHeight: isCenter ? 200 : 170,
                  background: '#111',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                {driver?.image_url ? (
                  <img
                    src={driver.image_url}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'top center',
                    }}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 36, color: 'rgba(255,255,255,0.08)' }}>
                      {driver?.code || '?'}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(
                      to bottom,
                      transparent 0%,
                      transparent 30%,
                      rgba(0,0,0,0.5) 55%,
                      rgba(0,0,0,0.85) 80%,
                      #000 100%
                    )`,
                  }}
                  aria-hidden="true"
                />

                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: teamColor,
                    opacity: 0.8,
                  }}
                  aria-hidden="true"
                />

                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    fontFamily: 'var(--mono)',
                    fontWeight: 800,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  P{pos}
                </div>

                <div style={{ position: 'relative', zIndex: 2, padding: '10px 10px 12px' }}>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.1 }}>
                    {driver?.first_name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--sans)',
                      fontWeight: 800,
                      fontSize: isCenter ? 14 : 12,
                      color: '#fff',
                      lineHeight: 1.1,
                      letterSpacing: '-0.01em',
                      marginBottom: 6,
                    }}
                  >
                    {driver?.last_name}
                  </div>

                  {team?.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt=""
                      style={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => handleSetTab('standings')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--red)',
            }}
            type="button"
          >
            View All
          </button>
        </div>
      </section>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />

      <section style={{ padding: '8px 20px 28px', background: '#000' }}>
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: '-0.01em',
            marginBottom: 16,
            color: 'var(--text)',
          }}
        >
          <span style={{ color: 'var(--red)' }}>Team</span> Standings
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr 1fr',
            gap: 8,
            alignItems: 'stretch',
          }}
        >
          {[constructorStandings[1], constructorStandings[0], constructorStandings[2]].map((standing, colIdx) => {
            if (!standing) return <div key={colIdx} />;
            const team = standing.teams;
            const isCenter = colIdx === 1;
            const teamColor = team?.team_color || '#ffffff';
            const pos = colIdx === 0 ? 2 : colIdx === 1 ? 1 : 3;

            return (
              <div
                key={standing.id}
                onClick={() => handleSetTab('constructors')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleSetTab('constructors');
                }}
                style={{
                  position: 'relative',
                  borderRadius: 14,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  minHeight: isCenter ? 200 : 170,
                  background: `color-mix(in srgb, ${teamColor} 8%, #111 92%)`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -60%)',
                    width: '70%',
                    height: '55%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {team?.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', opacity: 0.9 }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : null}
                </div>

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(
                      to bottom,
                      transparent 0%,
                      transparent 40%,
                      rgba(0,0,0,0.6) 65%,
                      rgba(0,0,0,0.92) 85%,
                      #000 100%
                    )`,
                  }}
                  aria-hidden="true"
                />

                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: teamColor,
                    opacity: 0.9,
                  }}
                  aria-hidden="true"
                />

                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    fontFamily: 'var(--mono)',
                    fontWeight: 800,
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  P{pos}
                </div>

                <div style={{ position: 'relative', zIndex: 2, padding: '10px 10px 12px', textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: 'var(--sans)',
                      fontWeight: 800,
                      fontSize: isCenter ? 15 : 13,
                      color: '#fff',
                      letterSpacing: '-0.01em',
                      marginBottom: 4,
                    }}
                  >
                    {team?.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--sans)',
                      fontWeight: 900,
                      fontSize: isCenter ? 22 : 18,
                      color: '#fff',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {standing.points}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => handleSetTab('constructors')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--red)',
            }}
            type="button"
          >
            View All
          </button>
        </div>
      </section>
    </div>
  );
}

