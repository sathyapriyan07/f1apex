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

export default function Dashboard({ setTab }) {
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

  return (
    <div style={{ background: '#000', minHeight: '100%', color: 'var(--text)' }}>
      {error ? <div className="error-msg">{error}</div> : null}

      <section
        style={{
          padding: '20px 20px 24px',
          background: '#000',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <div>
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

        <div style={{ width: 160, height: 140, flexShrink: 0 }}>
          {nextRace?.circuits?.layout_url ? (
            <img
              src={nextRace.circuits.layout_url}
              alt="circuit"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : null}
        </div>
      </section>

      <section style={{ padding: '8px 20px 24px', background: '#000' }}>
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: '-0.01em',
            marginBottom: 20,
            color: 'var(--text)',
          }}
        >
          <span style={{ color: 'var(--red)' }}>Driver</span> Standings
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'flex-end', gap: 0 }}>
          {[driverStandings[1], driverStandings[0], driverStandings[2]].map((driver, colIdx) => {
            if (!driver) return <div key={colIdx} />;
            const isCenter = colIdx === 1;
            const teamLogoUrl = driver.teams?.logo_url || null;
            return (
              <div
                key={driver.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  paddingBottom: isCenter ? 0 : 16,
                }}
              >
                <div
                  style={{
                    width: isCenter ? 100 : 80,
                    height: isCenter ? 100 : 80,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.06)',
                    border: `2px solid ${isCenter ? 'var(--red)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {driver.drivers?.image_url ? (
                    <img
                      src={driver.drivers.image_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--mono)',
                        fontSize: isCenter ? 16 : 13,
                        fontWeight: 700,
                        color: 'var(--muted)',
                      }}
                    >
                      {driver.drivers?.code || '?'}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontWeight: 700,
                    fontSize: isCenter ? 15 : 13,
                    textAlign: 'center',
                    color: 'var(--text)',
                    lineHeight: 1.3,
                  }}
                >
                  {driver.drivers?.first_name || ''}<br />
                  {driver.drivers?.last_name || ''}
                </div>

                {teamLogoUrl ? (
                  <img
                    src={teamLogoUrl}
                    alt=""
                    style={{
                      width: 28,
                      height: 28,
                      objectFit: 'contain',
                      filter: 'brightness(0) invert(1)',
                      opacity: 0.8,
                    }}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div style={{ height: 28 }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => setTab('standings')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--red)',
              letterSpacing: '-0.01em',
            }}
            type="button"
          >
            View All
          </button>
        </div>
      </section>

      <section style={{ padding: '8px 20px 24px', background: '#000' }}>
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: '-0.01em',
            marginBottom: 20,
            color: 'var(--text)',
          }}
        >
          <span style={{ color: 'var(--red)' }}>Team</span> Standings
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'flex-end', gap: 0 }}>
          {[constructorStandings[1], constructorStandings[0], constructorStandings[2]].map((team, colIdx) => {
            if (!team) return <div key={colIdx} />;
            const isCenter = colIdx === 1;
            return (
              <div
                key={team.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  paddingBottom: isCenter ? 0 : 16,
                }}
              >
                <div
                  style={{
                    width: isCenter ? 88 : 70,
                    height: isCenter ? 88 : 70,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: `2px solid ${isCenter ? 'var(--yellow)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 14,
                    overflow: 'hidden',
                  }}
                >
                  {team.teams?.logo_url ? (
                    <img
                      src={team.teams.logo_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
                      {team.teams?.name?.slice(0, 3).toUpperCase()}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontWeight: 700,
                    fontSize: isCenter ? 15 : 13,
                    textAlign: 'center',
                    color: 'var(--text)',
                  }}
                >
                  {team.teams?.name}
                </div>

                <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: isCenter ? 20 : 16, color: 'var(--text)' }}>
                  {team.points}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button
            onClick={() => setTab('constructors')}
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

