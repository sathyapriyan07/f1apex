// src/components/TeamDetailPanel.jsx
import { useEffect, useMemo, useState } from 'react';
import { db, team_detail } from '../lib/supabase';

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

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />;
}

function TeamHero({ team, teamColor, onClose, onEdit, onDelete }) {
  return (
    <div style={{ background: '#000', position: 'relative' }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#fff', fontSize: 22, padding: '4px 8px',
      }}>←</button>
      {(onEdit || onDelete) && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 6 }}>
          {onEdit && (
            <button onClick={onEdit} type="button" style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12,
              color: '#fff', background: 'rgba(255,255,255,0.12)',
              border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            }}>Edit</button>
          )}
          {onDelete && (
            <button onClick={onDelete} type="button" style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12,
              color: '#fff', background: 'rgba(232,0,45,0.25)',
              border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            }}>Delete</button>
          )}
        </div>
      )}

      {/* Logo */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        paddingTop: 52, paddingBottom: 0,
        position: 'relative', zIndex: 2,
      }}>
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name}
            style={{
              height: 140, width: 'auto', objectFit: 'contain',
              display: 'block', marginBottom: 20,
              position: 'relative', zIndex: 3, filter: 'none',
            }}
            onError={e => e.target.style.display = 'none'}
          />
        ) : (
          <div style={{
            width: 100, height: 100, borderRadius: 20,
            background: `${teamColor}22`, border: `2px solid ${teamColor}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 24,
            color: teamColor, marginBottom: 20, position: 'relative', zIndex: 3,
          }}>
            {team.name?.slice(0, 3).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info card */}
      <div style={{
        margin: '0 16px', background: '#1a1a1a', borderRadius: 20,
        padding: '24px 20px 24px', position: 'relative', zIndex: 2,
      }}>
        {/* Row 1: name + championships */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '4px 16px', marginBottom: 20, alignItems: 'start',
        }}>
          <div style={{
            fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 18,
            color: '#fff', letterSpacing: '-0.01em',
          }}>{team.name}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              color: 'rgba(255,255,255,0.5)', marginBottom: 2,
            }}>Championships</div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 20,
              color: teamColor, letterSpacing: '-0.02em',
            }}>{team.championships ?? 0}</div>
          </div>
        </div>

        <Divider />

        {/* Row 2: Estd + Nationality */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '4px 16px', marginBottom: 20,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              color: 'rgba(255,255,255,0.5)', marginBottom: 4,
            }}>Estd</div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, color: teamColor,
            }}>{team.first_entry || '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
              color: 'rgba(255,255,255,0.5)', marginBottom: 4,
            }}>Nationality</div>
            <div style={{
              fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, color: teamColor,
            }}>{team.nationality || '—'}</div>
          </div>
        </div>

        <Divider />

        {/* Row 3: Base */}
        <div>
          <div style={{
            fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13,
            color: 'rgba(255,255,255,0.5)', marginBottom: 4,
          }}>Base</div>
          <div style={{
            fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, color: teamColor,
          }}>{team.base || '—'}</div>
        </div>
      </div>
    </div>
  );
}

function TeamCareerStats({ results, teamColor }) {
  const uniqueRaces  = new Set(results.map(r => r.race_id)).size;
  const totalPoints  = results.reduce((s, r) => s + parseFloat(r.points || 0), 0);
  const totalWins    = results.filter(r => r.position === 1).length;
  const totalPodiums = results.filter(r => r.position && r.position <= 3).length;
  const totalPoles   = results.filter(r => r.grid_position === 1).length;
  const totalFL      = results.filter(r => r.fastest_lap).length;
  const totalDNFs    = results.filter(r =>
    r.status && String(r.status).toLowerCase() !== 'finished'
  ).length;
  const bestFinish   = results.reduce((b, r) =>
    r.position && (!b || r.position < b) ? r.position : b, null
  );

  const rows = [
    { label: 'Race Entries',     value: uniqueRaces },
    { label: 'Total Points',     value: Math.round(totalPoints) },
    { label: 'Race Wins',        value: totalWins },
    { label: 'Podiums',          value: totalPodiums },
    { label: 'Pole Positions',   value: totalPoles },
    { label: 'Fastest Laps',     value: totalFL },
    { label: 'Best Race Finish', value: bestFinish ? `P${bestFinish}` : '—' },
    { label: 'DNFs',             value: totalDNFs },
  ];

  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>CAREER STATS</SectionLabel>
      <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', marginTop: 14 }}>
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
              fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 22,
              color: '#fff', letterSpacing: '-0.02em',
            }}>{row.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamRaceHistory({ results, teamColor, onOpenRace }) {
  const [filterYear, setFilterYear] = useState('all');

  const grouped = useMemo(() => {
    const map = {};
    for (const r of results) {
      const rid = r.race_id;
      if (!map[rid]) map[rid] = { race: r.races, drivers: [] };
      map[rid].drivers.push(r);
    }
    return Object.values(map).sort((a, b) =>
      (b.race?.season_year || 0) - (a.race?.season_year || 0) ||
      (b.race?.round || 0) - (a.race?.round || 0)
    );
  }, [results]);

  const years = [...new Set(grouped.map(g => g.race?.season_year).filter(Boolean))].sort((a, b) => b - a);
  const filtered = filterYear === 'all'
    ? grouped
    : grouped.filter(g => String(g.race?.season_year) === String(filterYear));

  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>RACE HISTORY</SectionLabel>

      {/* Year filter pills */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 12, marginBottom: 4,
        overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4,
      }}>
        {['all', ...years.slice(0, 8)].map(y => (
          <button key={y} onClick={() => setFilterYear(String(y))} style={{
            padding: '5px 14px', borderRadius: 980, flexShrink: 0,
            background: filterYear === String(y) ? teamColor : 'rgba(255,255,255,0.08)',
            border: 'none', cursor: 'pointer',
            fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12,
            color: filterYear === String(y) ? '#000' : 'rgba(255,255,255,0.4)',
          }}>
            {y === 'all' ? 'All' : y}
          </button>
        ))}
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', marginTop: 10 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            No race history
          </div>
        )}
        {filtered.map((group, i) => {
          const race = group.race;
          const bestResult = group.drivers.reduce((b, r) =>
            r.position && (!b || r.position < b) ? r.position : b, null
          );
          const totalPts = group.drivers.reduce((s, r) => s + parseFloat(r.points || 0), 0);
          const pColor = bestResult === 1 ? '#ffd60a' : bestResult <= 3 ? '#e5e5ea' : '#fff';

          return (
            <div key={race?.id || i}
              onClick={() => race?.id && onOpenRace?.(race.id)}
              style={{
                display: 'grid', gridTemplateColumns: '52px 1fr auto',
                alignItems: 'center', gap: 12, padding: '14px 18px',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                cursor: onOpenRace && race?.id ? 'pointer' : 'default',
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: teamColor, fontWeight: 500 }}>
                  {race?.season_year}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                  R{race?.round}
                </div>
              </div>

              <div>
                <div style={{
                  fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {race?.name?.replace('Grand Prix', 'GP')}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {group.drivers.map(d => (
                    <span key={d.id} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                      {d.drivers?.code} P{d.position ?? 'R'}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {bestResult && (
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, color: pColor }}>
                    P{bestResult}
                  </div>
                )}
                {totalPts > 0 && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: teamColor, marginTop: 2 }}>
                    +{totalPts}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamStandingsSection({ standings, teamColor }) {
  if (!standings.length) return null;
  const sorted = [...standings].sort((a, b) => b.season_year - a.season_year);

  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>STANDINGS</SectionLabel>
      <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', marginTop: 14 }}>
        {sorted.map((s, i) => {
          const isChamp = Number(s.position) === 1;
          return (
            <div key={s.season_year || i} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
              borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              background: isChamp ? `${teamColor}10` : 'transparent',
            }}>
              <div style={{
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14,
                color: 'rgba(255,255,255,0.5)', minWidth: 44,
              }}>{s.season_year}</div>
              <div style={{
                fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 20,
                letterSpacing: '-0.02em', color: isChamp ? '#ffd60a' : '#fff', minWidth: 36,
              }}>P{s.position}</div>
              {isChamp && <span style={{ fontSize: 14 }}>🏆</span>}
              <div style={{ flex: 1 }}>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((s.points / 600) * 100, 100)}%`,
                    background: isChamp ? '#ffd60a' : teamColor,
                    borderRadius: 2,
                  }} />
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 16,
                color: '#fff', minWidth: 48, textAlign: 'right',
              }}>{s.points}</div>
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 11,
                color: 'rgba(255,255,255,0.35)', minWidth: 28, textAlign: 'right',
              }}>{s.wins}W</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamDriversSection({ currentDrivers, formerDrivers, teamColor, onOpenDriver }) {
  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>DRIVERS</SectionLabel>

      {currentDrivers.length > 0 && (
        <>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 14, marginBottom: 10,
          }}>Current</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {currentDrivers.map(driver => (
              <div key={driver.id}
                onClick={() => onOpenDriver?.(driver.id)}
                style={{
                  background: '#1a1a1a', borderRadius: 14, overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ height: 110, background: '#222', position: 'relative', overflow: 'hidden' }}>
                  {driver.image_url ? (
                    <img src={driver.image_url} alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                      onError={e => e.target.style.display = 'none'}
                    />
                  ) : (
                    <div style={{
                      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.1)',
                    }}>{driver.code || '?'}</div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
                    background: 'linear-gradient(to top, #1a1a1a, transparent)',
                  }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: teamColor }} />
                </div>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
                    {driver.first_name}
                  </div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 14, color: '#fff', letterSpacing: '-0.01em', marginTop: 2 }}>
                    {driver.last_name}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: teamColor, marginTop: 4, fontWeight: 500 }}>
                    #{driver.number || '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {formerDrivers.length > 0 && (
        <>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 20, marginBottom: 10,
          }}>Former Drivers</div>
          <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden' }}>
            {formerDrivers.slice(0, 10).map((driver, i) => (
              <div key={driver.id}
                onClick={() => onOpenDriver?.(driver.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                  borderBottom: i < Math.min(formerDrivers.length, 10) - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2a2a2a', overflow: 'hidden', flexShrink: 0 }}>
                  {driver.image_url && (
                    <img src={driver.image_url} alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                      onError={e => e.target.style.display = 'none'}
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: '#fff' }}>
                    {driver.first_name} {driver.last_name}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                    {driver.nationality}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  {driver.code}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TeamInfoSection({ team, teamColor }) {
  const rows = [
    { label: 'Full Name',     value: team.name },
    { label: 'Nationality',   value: team.nationality },
    { label: 'Base',          value: team.base },
    { label: 'Established',   value: team.first_entry },
    { label: 'Championships', value: team.championships ?? 0 },
    { label: 'Power Unit',    value: team.power_unit || '—' },
    { label: 'Chassis',       value: team.car_name || team.chassis || '—' },
  ];

  return (
    <div style={{ padding: '28px 16px 0' }}>
      <SectionLabel>INFO</SectionLabel>
      <div style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', marginTop: 14 }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
          }}>
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {row.label}
            </span>
            <span style={{
              fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14,
              color: '#fff', textAlign: 'right', maxWidth: '55%',
            }}>
              {row.value || '—'}
            </span>
          </div>
        ))}
        {team.wiki_url && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <a href={team.wiki_url} target="_blank" rel="noreferrer" style={{
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: teamColor,
              display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
            }}>↗ Wikipedia</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamDetailPanel({ teamId, onClose, onEdit, onOpenDriver, onOpenRace, mode = 'panel' }) {
  const [team, setTeam]         = useState(null);
  const [results, setResults]   = useState([]);
  const [standings, setStandings] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

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
    if (!teamId) return undefined;
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      const [t, rr, ss, dd] = await Promise.all([
        db.teams.byId(teamId),
        team_detail.results(teamId),
        team_detail.standings(teamId),
        team_detail.drivers(teamId),
      ]);
      if (!alive) return;
      if (t.error || rr.error || ss.error || dd.error) {
        setError((t.error || rr.error || ss.error || dd.error).message);
        setLoading(false);
        return;
      }
      setTeam(t.data);
      setResults(rr.data || []);
      setStandings(ss.data || []);
      setDrivers(dd.data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [teamId]);

  const teamColor = team?.team_color || '#e8002d';

  // Derive current vs former from drivers list + results
  const { currentDrivers, formerDrivers } = useMemo(() => {
    const currentIds = new Set((drivers || []).map(d => String(d.id)));
    const current = drivers || [];
    const formerMap = new Map();
    for (const r of results) {
      const d = r?.drivers;
      if (!d?.id) continue;
      const id = String(d.id);
      if (currentIds.has(id)) continue;
      if (!formerMap.has(id)) formerMap.set(id, d);
    }
    const former = [...formerMap.values()].sort((a, b) =>
      String(a.last_name || '').localeCompare(String(b.last_name || ''))
    );
    return { currentDrivers: current, formerDrivers: former };
  }, [drivers, results]);

  void onEdit;

  if (!teamId) return null;

  if (loading) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--sans)', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Loading team…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', padding: 20 }}>
        <div style={{ fontFamily: 'var(--sans)', color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 10 }}>Couldn't load team</div>
        <div style={{ fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      <TeamHero team={team} teamColor={teamColor} onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete ? async () => {
          if (!confirm(`Delete ${team.name}?`)) return;
          await onDelete(team.id);
          onClose?.();
        } : undefined}
      />
      <TeamCareerStats results={results} teamColor={teamColor} />
      <TeamRaceHistory results={results} teamColor={teamColor} onOpenRace={onOpenRace} />
      <TeamStandingsSection standings={standings} teamColor={teamColor} />
      <TeamDriversSection
        currentDrivers={currentDrivers}
        formerDrivers={formerDrivers}
        teamColor={teamColor}
        onOpenDriver={onOpenDriver}
      />
      <TeamInfoSection team={team} teamColor={teamColor} />
      <div style={{ height: 40 }} />
    </div>
  );
}
