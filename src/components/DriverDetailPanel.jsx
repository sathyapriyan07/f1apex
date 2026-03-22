// src/components/DriverDetailPanel.jsx
import { useEffect, useMemo, useState } from 'react';
import { db, driver_career } from '../lib/supabase';

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = Number(n) % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 20,
      letterSpacing: '-0.01em', textTransform: 'uppercase', color: '#fff',
    }}>
      {children}
    </div>
  );
}

function DriverHero({ driver, team, teamColor, onClose, previousTeams }) {
  return (
    <div style={{ background: '#000', position: 'relative', paddingTop: 0 }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#fff', fontSize: 22, padding: '4px 8px',
      }}>←</button>

      {/* Driver photo */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        paddingTop: 48, paddingBottom: 0,
        position: 'relative', zIndex: 2,
      }}>
        {driver.image_url ? (
          <img src={driver.image_url} alt=""
            style={{
              height: 200, width: 'auto',
              objectFit: 'contain', objectPosition: 'bottom center',
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              display: 'block', position: 'relative', zIndex: 3,
              marginBottom: -40,
            }}
            onError={e => e.target.style.display = 'none'}
          />
        ) : (
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: `${teamColor}22`, border: `2px solid ${teamColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 28,
            color: teamColor, marginBottom: -40, position: 'relative', zIndex: 3,
          }}>
            {driver.code || driver.first_name?.[0]}
          </div>
        )}
      </div>

      {/* Info card */}
      <div style={{
        margin: '0 16px', background: '#1a1a1a', borderRadius: 20,
        padding: '20px 20px 24px', position: 'relative', zIndex: 2,
      }}>
        {/* Name row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <span style={{
            fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 18,
            color: '#fff', letterSpacing: '-0.01em',
          }}>
            {driver.first_name} {driver.last_name}
          </span>
          <span style={{
            fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 18,
            color: '#fff', letterSpacing: '-0.02em',
          }}>
            {driver.number || '—'}
          </span>
        </div>

        {/* 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
          {/* Team */}
          <div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              color: 'rgba(255,255,255,0.5)', marginBottom: 8,
            }}>Team</div>
            {team?.logo_url ? (
              <img src={team.logo_url} alt={team.name}
                style={{ height: 28, maxWidth: 80, objectFit: 'contain' }}
                onError={e => e.target.style.display = 'none'}
              />
            ) : (
              <span style={{
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: teamColor,
              }}>{team?.name?.slice(0, 3).toUpperCase() || '—'}</span>
            )}
          </div>

          {/* Date of Birth */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              color: 'rgba(255,255,255,0.5)', marginBottom: 8,
            }}>Date of Birth</div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14, color: teamColor,
            }}>
              {driver.dob
                ? new Date(driver.dob).toLocaleDateString('en-GB', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                  })
                : '—'}
            </div>
          </div>

          {/* Previous Teams */}
          <div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              color: 'rgba(255,255,255,0.5)', marginBottom: 8,
            }}>Previous Teams</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {previousTeams.map(t =>
                t.logo_url ? (
                  <img key={t.id} src={t.logo_url} alt={t.name}
                    style={{ height: 22, maxWidth: 40, objectFit: 'contain' }}
                    onError={e => e.target.style.display = 'none'}
                  />
                ) : (
                  <span key={t.id} style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: t.team_color || 'var(--muted)', fontWeight: 700,
                  }}>{t.name?.slice(0, 3).toUpperCase()}</span>
                )
              )}
              {previousTeams.length === 0 && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>—</span>
              )}
            </div>
          </div>

          {/* Nationality */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              color: 'rgba(255,255,255,0.5)', marginBottom: 8,
            }}>Nationality</div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 14, color: teamColor,
            }}>
              {driver.nationality || '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CareerStatsSection({ results, standings }) {
  const totalRaces = results.length;
  const totalPoints = results.reduce((s, r) => s + parseFloat(r.points || 0), 0);
  const totalWins = results.filter(r => r.position === 1).length;
  const totalPodiums = results.filter(r => r.position && r.position <= 3).length;
  const totalPoles = results.filter(r => r.grid_position === 1).length;
  const championships = standings.filter(s => Number(s.position) === 1).length;
  const totalDNFs = results.filter(r =>
    r.status && !String(r.status).includes('Finish') && !String(r.status).includes('Lap')
  ).length;
  const bestFinish = results.reduce((b, r) => r.position && (!b || r.position < b) ? r.position : b, null);
  const bestFinishCount = bestFinish ? results.filter(r => r.position === bestFinish).length : 0;

  const rows = [
    { label: 'Grand Prix Entered', value: totalRaces },
    { label: 'Career Points', value: Math.round(totalPoints) },
    { label: 'Highest Race Finish', value: bestFinish ? `${bestFinish} (x${bestFinishCount})` : '—' },
    { label: 'Podiums', value: totalPodiums },
    { label: 'Pole Positions', value: totalPoles },
    { label: 'World Championships', value: championships },
    { label: 'DNFs', value: totalDNFs },
  ];

  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>CAREER STATS</SectionLabel>
      <div style={{
        background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', marginTop: 14,
      }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          }}>
            <span style={{
              fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
            }}>{row.label}</span>
            <span style={{
              fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 20,
              color: '#fff', letterSpacing: '-0.02em',
            }}>{row.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeasonStatsSection({ results, standings, year, teamColor }) {
  const seasonResults = results.filter(r =>
    Number(r.races?.season_year) === Number(year) && !r.races?.sprint
  );
  const sprintResults = results.filter(r =>
    Number(r.races?.season_year) === Number(year) && Boolean(r.races?.sprint)
  );
  const standing = standings.find(s => Number(s.season_year) === Number(year));

  const stats = [
    { label: 'Season Position', value: standing?.position ? `${standing.position}${ordinal(standing.position)}` : '—' },
    { label: 'Season Points', value: standing?.points ?? 0 },
    { label: 'Races', value: seasonResults.length },
    { label: 'Points', value: Math.round(seasonResults.reduce((s, r) => s + parseFloat(r.points || 0), 0)) },
    { label: 'Wins', value: seasonResults.filter(r => r.position === 1).length },
    { label: 'Podiums', value: seasonResults.filter(r => r.position && r.position <= 3).length },
    { label: 'Poles', value: seasonResults.filter(r => r.grid_position === 1).length },
    { label: 'Fastest Laps', value: seasonResults.filter(r => r.fastest_lap).length },
    { label: 'Top 10s', value: seasonResults.filter(r => r.position && r.position <= 10).length },
    { label: 'DNFs', value: seasonResults.filter(r => r.status && !String(r.status).includes('Finish') && !String(r.status).includes('Lap')).length },
  ];

  if (sprintResults.length > 0) {
    stats.push(
      { label: 'Sprint Races', value: sprintResults.length },
      { label: 'Sprint Points', value: Math.round(sprintResults.reduce((s, r) => s + parseFloat(r.points || 0), 0)) },
      { label: 'Sprint Wins', value: sprintResults.filter(r => r.position === 1).length },
      { label: 'Sprint Podiums', value: sprintResults.filter(r => r.position && r.position <= 3).length },
    );
  }

  // Ensure even count for 2-col grid
  if (stats.length % 2 !== 0) stats.push({ label: '', value: '' });

  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>{year} STATISTICS</SectionLabel>
      <div style={{
        background: '#1a1a1a', borderRadius: 16, overflow: 'hidden',
        marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr',
      }}>
        {stats.map((s, i) => (
          <div key={s.label + i} style={{
            padding: '16px 18px',
            borderBottom: i < stats.length - 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          }}>
            <div style={{
              fontFamily: 'var(--sans)', fontSize: 11,
              color: 'rgba(255,255,255,0.4)', marginBottom: 6,
            }}>{s.label}</div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 28,
              color: '#fff', letterSpacing: '-0.03em', lineHeight: 1,
            }}>{s.value ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceCharts({ results, teamColor }) {
  const currentYear = new Date().getFullYear();
  const seasonResults = [...results]
    .filter(r => Number(r.races?.season_year) === currentYear && !r.races?.sprint)
    .sort((a, b) => (a.races?.round || 0) - (b.races?.round || 0));

  const maxPts = 25;

  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>PERFORMANCE CHARTS</SectionLabel>

      {/* Points per round */}
      <div style={{
        background: '#1a1a1a', borderRadius: 16,
        padding: '16px 16px 12px', marginTop: 14,
      }}>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12,
          color: 'rgba(255,255,255,0.4)', marginBottom: 12,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Points Per Round — {currentYear}</div>

        {seasonResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            No data for {currentYear}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              height: 100, marginRight: 8, flexShrink: 0, paddingBottom: 18,
            }}>
              {[25, 12, 0].map(v => (
                <span key={v} style={{
                  fontFamily: 'var(--mono)', fontSize: 8,
                  color: 'rgba(255,255,255,0.25)', lineHeight: 1,
                }}>{v}</span>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 3 }}>
                {seasonResults.map((r, i) => {
                  const pts = parseFloat(r.points || 0);
                  const h = Math.max((pts / maxPts) * 76, pts > 0 ? 3 : 2);
                  return (
                    <div key={i} style={{
                      flex: 1, minWidth: 4, height: h,
                      background: pts > 0 ? teamColor : 'rgba(255,255,255,0.1)',
                      borderRadius: '2px 2px 0 0',
                    }} title={`R${r.races?.round}: ${pts}pts`} />
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                {seasonResults.map((r, i) => (
                  <span key={i} style={{
                    flex: 1, minWidth: 4, fontFamily: 'var(--mono)', fontSize: 6,
                    color: 'rgba(255,255,255,0.2)', textAlign: 'center', display: 'block',
                  }}>{String(r.races?.round || i + 1).padStart(2, '0')}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Finishing positions */}
      <div style={{
        background: '#1a1a1a', borderRadius: 16,
        padding: '16px 16px 12px', marginTop: 10,
      }}>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12,
          color: 'rgba(255,255,255,0.4)', marginBottom: 12,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Finishing Positions — {currentYear}</div>

        {seasonResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            No data
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              height: 100, marginRight: 8, flexShrink: 0, paddingBottom: 18,
            }}>
              {[1, 10, 20].map(v => (
                <span key={v} style={{
                  fontFamily: 'var(--mono)', fontSize: 8,
                  color: 'rgba(255,255,255,0.25)', lineHeight: 1,
                }}>P{v}</span>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ position: 'relative', height: 80 }}>
                {[1, 5, 10, 15, 20].map(pos => (
                  <div key={pos} style={{
                    position: 'absolute', left: 0, right: 0,
                    top: `${((pos - 1) / 19) * 100}%`,
                    height: 1, background: 'rgba(255,255,255,0.05)',
                  }} />
                ))}
                {seasonResults.map((r, i) => {
                  if (!r.position) return null;
                  const x = (i / Math.max(seasonResults.length - 1, 1)) * 100;
                  const y = ((r.position - 1) / 19) * 100;
                  const color = r.position === 1 ? '#ffd60a'
                    : r.position <= 3 ? '#e5e5ea'
                    : r.position <= 10 ? teamColor
                    : 'rgba(255,255,255,0.3)';
                  return (
                    <div key={i} style={{
                      position: 'absolute', left: `${x}%`, top: `${y}%`,
                      transform: 'translate(-50%,-50%)',
                      width: 6, height: 6, borderRadius: '50%', background: color,
                    }} title={`R${r.races?.round}: P${r.position}`} />
                  );
                })}
                <svg style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible',
                }}>
                  <polyline
                    points={(() => {
                      const valid = seasonResults.filter(r => r.position);
                      return valid.map((r, i) => {
                        const x = (i / Math.max(valid.length - 1, 1)) * 100;
                        const y = ((r.position - 1) / 19) * 100;
                        return `${x}%,${y}%`;
                      }).join(' ');
                    })()}
                    fill="none" stroke={teamColor} strokeWidth="1.5" strokeOpacity="0.5"
                  />
                </svg>
              </div>
              <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                {seasonResults.map((r, i) => (
                  <span key={i} style={{
                    flex: 1, fontFamily: 'var(--mono)', fontSize: 6,
                    color: 'rgba(255,255,255,0.2)', textAlign: 'center',
                  }}>{String(r.races?.round || i + 1).padStart(2, '0')}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChampionshipsSection({ standings, teamColor }) {
  if (!standings.length) return null;
  const sorted = [...standings].sort((a, b) => b.season_year - a.season_year);

  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>CHAMPIONSHIPS</SectionLabel>
      <div style={{
        background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', marginTop: 14,
      }}>
        {sorted.map((s, i) => {
          const isChamp = Number(s.position) === 1;
          return (
            <div key={s.id || i} style={{
              display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 14,
              borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              background: isChamp ? `${teamColor}12` : 'transparent',
            }}>
              <div style={{
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
                color: isChamp ? teamColor : 'rgba(255,255,255,0.5)', minWidth: 44,
              }}>{s.season_year}</div>
              <div style={{
                fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 22,
                color: isChamp ? '#ffd60a' : '#fff', letterSpacing: '-0.02em', minWidth: 40,
              }}>P{s.position}</div>
              {isChamp && <span style={{ fontSize: 16 }}>🏆</span>}
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((s.points / 400) * 100, 100)}%`,
                    background: isChamp ? '#ffd60a' : teamColor,
                    borderRadius: 2,
                  }} />
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 16,
                color: '#fff', minWidth: 48, textAlign: 'right',
              }}>{s.points}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DriverDetailPanel({ driverId, onClose, onOpenTeamDetail, mode = 'panel' }) {
  const [driver, setDriver] = useState(null);
  const [results, setResults] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (mode !== 'page') return undefined;
    const cls = 'hide-mobile-header';
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [mode]);

  useEffect(() => {
    if (!driverId) return undefined;
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      const [d, rr, ss] = await Promise.all([
        db.drivers.byId(driverId),
        driver_career.results(driverId),
        driver_career.standings(driverId),
      ]);
      if (!alive) return;
      if (d.error || rr.error || ss.error) {
        setError((d.error || rr.error || ss.error).message);
        setLoading(false);
        return;
      }
      setDriver(d.data);
      setResults(rr.data || []);
      setStandings(ss.data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [driverId]);

  const team = driver?.teams || null;
  const teamColor = team?.team_color || '#e8002d';

  const currentYear = new Date().getFullYear();
  const statsYear = useMemo(() => {
    const hasCurrent = results.some(r => Number(r.races?.season_year) === currentYear);
    if (hasCurrent) return currentYear;
    const years = results.map(r => Number(r.races?.season_year)).filter(Boolean);
    return years.length ? Math.max(...years) : currentYear;
  }, [results, currentYear]);

  const previousTeams = useMemo(() => {
    const teamIds = new Set();
    const prev = [];
    for (const r of results) {
      const tid = r.team_id || r.teams?.id;
      if (tid && tid !== driver?.team_id && !teamIds.has(tid)) {
        teamIds.add(tid);
        const t = r.teams || null;
        if (t) prev.push(t);
      }
    }
    return prev.slice(0, 5);
  }, [results, driver?.team_id]);

  void onOpenTeamDetail;

  if (!driverId) return null;

  if (loading) {
    return (
      <div style={{
        background: '#000', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: 'var(--sans)', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
          Loading driver…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', padding: 20 }}>
        <div style={{ fontFamily: 'var(--sans)', color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 10 }}>
          Couldn't load driver
        </div>
        <div style={{ fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  if (!driver) return null;

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      <DriverHero
        driver={driver} team={team}
        teamColor={teamColor} onClose={onClose}
        previousTeams={previousTeams}
      />
      <CareerStatsSection results={results} standings={standings} />
      <SeasonStatsSection
        results={results} standings={standings}
        year={statsYear} teamColor={teamColor}
      />
      <PerformanceCharts results={results} teamColor={teamColor} />
      <ChampionshipsSection standings={standings} teamColor={teamColor} />
      <div style={{ height: 40 }} />
    </div>
  );
}
