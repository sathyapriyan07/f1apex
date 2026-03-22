import { useEffect, useMemo, useState } from 'react';
import { db, team_detail } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

function TabButton({ id, active, onClick, color, children }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        padding: '12px 20px 12px 0',
        marginRight: 24,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        fontWeight: 600,
        fontSize: 14,
        letterSpacing: '-0.01em',
        color: active ? 'var(--text)' : 'var(--sub)',
        borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
        marginBottom: -1,
        transition: 'color 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? 'var(--text)' : 'var(--sub)';
      }}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function fmtPts(n) {
  const v = Number(n) || 0;
  if (Number.isInteger(v)) return `${v}`;
  return v.toFixed(1).replace(/\.0$/, '');
}

function hexToRgb(hex) {
  const h = String(hex || '').trim();
  if (!h.startsWith('#')) return null;
  const raw = h.slice(1);
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgba(color, a) {
  const rgb = hexToRgb(color);
  if (!rgb) return `rgba(232,0,45,${a})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

function trophyText(count) {
  const c = Number(count) || 0;
  if (c <= 0) return '';
  if (c <= 5) return '🏆'.repeat(c);
  return `🏆 × ${c}`;
}

function posColor(pos) {
  const p = Number(pos);
  if (!Number.isFinite(p)) return 'var(--sub)';
  if (p === 1) return '#ffd60a';
  if (p === 2) return '#e5e5ea';
  if (p === 3) return '#c96b2e';
  return p <= 10 ? 'var(--sub)' : 'var(--muted)';
}

function DriverChip({ r, teamColor, onOpenDriver }) {
  const code = r?.drivers?.code || r?.drivers?.last_name?.slice(0, 3)?.toUpperCase() || '—';
  const img = r?.drivers?.image_url || null;
  const driverId = r?.drivers?.id || r?.driver_id || null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (driverId) onOpenDriver?.(driverId);
      }}
      style={{
        appearance: 'none',
        border: 'none',
        background: 'transparent',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: driverId ? 'pointer' : 'default',
      }}
      title={r?.drivers ? `${r.drivers.first_name || ''} ${r.drivers.last_name || ''}`.trim() : ''}
    >
      <div style={{ width: 20, height: 20, borderRadius: '50%', position: 'relative', overflow: 'hidden', flexShrink: 0, border: `1px solid rgba(255,255,255,0.10)` }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--mono)',
          fontSize: 8,
          color: 'var(--muted)',
        }}>
          {String(code).slice(0, 2)}
        </div>
        {img ? (
          <img
            src={img}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>{code}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: posColor(r?.position) }}>
        P{r?.position ?? 'R'}
      </span>
      <span style={{ display: 'none', color: teamColor }} aria-hidden="true">{teamColor}</span>
    </button>
  );
}

function StandingsRow({ s, maxPoints, teamColor, isLast }) {
  const points = Number(s.points) || 0;
  const pct = maxPoints > 0 ? Math.min(100, Math.round((points / maxPoints) * 100)) : 0;
  const position = Number(s.position);
  const champion = position === 1;
  const pColor = champion ? '#ffd60a' : position === 2 ? '#e5e5ea' : position === 3 ? '#c96b2e' : 'var(--sub)';

  return (
    <div
      className={`detail-tv__row ${isLast ? 'is-last' : ''}`}
      style={{
        padding: '16px 0',
        display: 'grid',
        gridTemplateColumns: '60px 1fr 80px 100px',
        gap: 18,
        alignItems: 'center',
      }}
    >
      <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 22, color: pColor }}>
        P{Number.isFinite(position) ? position : '—'}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
          {s.season_year ?? '—'}
        </div>
        <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: teamColor }} />
        </div>
      </div>

      <div style={{ textAlign: 'left' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Wins</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: (Number(s.wins) || 0) > 0 ? '#ffd60a' : 'var(--muted)', marginTop: 2 }}>
          {s.wins ?? 0}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>
          {points}
        </div>
        {champion ? (
          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 980, background: 'rgba(255,214,10,0.12)', color: '#ffd60a', fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 11 }}>
            WCC
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamDetailPanel({
  teamId,
  onClose,
  onEdit,
  onOpenDriver,
  mode = 'panel',
}) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('history');
  const [team, setTeam] = useState(null);
  const [results, setResults] = useState([]);
  const [standings, setStandings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [standingsYear, setStandingsYear] = useState(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    if (mode === 'panel') document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); if (mode === 'panel') document.body.style.overflow = prev; };
  }, [onClose, mode]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError('');
      const [t, rr, ss, dd] = await Promise.all([
        db.teams.byId(teamId),
        team_detail.results(teamId),
        team_detail.standings(teamId),
        team_detail.drivers(teamId),
      ]);
      if (!alive) return;
      if (t.error) { setError(t.error.message); setLoading(false); return; }
      setTeam(t.data);
      setResults(rr.data || []);
      setStandings(ss.data || []);
      setDrivers(dd.data || []);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [teamId]);

  const teamColor = team?.team_color || 'var(--red)';
  const title = team?.name || 'Team';
  const glowA = useMemo(() => `radial-gradient(ellipse at 30% 60%, ${rgba(teamColor, 0.12)} 0%, transparent 55%)`, [teamColor]);
  const glowB = useMemo(() => `radial-gradient(ellipse at 80% 20%, ${rgba(teamColor, 0.06)} 0%, transparent 50%)`, [teamColor]);

  const groupedRaces = useMemo(() => {
    const acc = {};
    for (const r of results || []) {
      const raceId = r?.races?.id;
      if (!raceId) continue;
      if (!acc[raceId]) acc[raceId] = { race: r.races, results: [] };
      acc[raceId].results.push(r);
    }
    return Object.values(acc).sort((a, b) => (b.race?.season_year || 0) - (a.race?.season_year || 0) || (b.race?.round || 0) - (a.race?.round || 0));
  }, [results]);

  const computed = useMemo(() => {
    const raceCount = groupedRaces.length;
    const wins = (results || []).filter((r) => r.position === 1).length;
    const podiums = (results || []).filter((r) => r.position != null && r.position <= 3).length;
    const totalPoints = (results || []).reduce((a, r) => a + (Number(r.points) || 0), 0);
    const years = [...new Set((results || []).map((r) => r.races?.season_year).filter((y) => y != null))];
    const firstYear = years.length ? Math.min(...years) : null;
    const lastYear = years.length ? Math.max(...years) : null;
    return { raceCount, wins, podiums, totalPoints, firstYear, lastYear };
  }, [results, groupedRaces.length]);

  const formerDrivers = useMemo(() => {
    const currentIds = new Set((drivers || []).map((d) => String(d.id)));
    const map = new Map();
    for (const r of results || []) {
      const d = r?.drivers;
      if (!d?.id) continue;
      const id = String(d.id);
      if (currentIds.has(id)) continue;
      if (!map.has(id)) map.set(id, d);
    }
    return [...map.values()].sort((a, b) => String(a.last_name || '').localeCompare(String(b.last_name || '')));
  }, [results, drivers]);

  const standingsMax = useMemo(() => Math.max(1, ...(standings || []).map((s) => Number(s.points) || 0)), [standings]);
  const standingsYears = useMemo(() => [...new Set((standings || []).map((s) => s.season_year).filter(Boolean))].sort((a, b) => b - a), [standings]);
  const filteredStandings = useMemo(() => (
    standingsYear ? (standings || []).filter((s) => Number(s.season_year) === Number(standingsYear)) : (standings || [])
  ), [standings, standingsYear]);

  const Wrapper = mode === 'panel' ? 'div' : 'div';
  const PanelTag = mode === 'panel' ? 'aside' : 'div';
  const wrapperProps = mode === 'panel'
    ? { className: 'slidein-backdrop', onMouseDown: onClose, 'aria-label': 'Close team panel' }
    : {};
  const panelProps = mode === 'panel'
    ? { className: 'slidein-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onMouseDown: (e) => e.stopPropagation() }
    : { className: 'card', style: { width: '100%', overflow: 'hidden' } };

  return (
    <Wrapper {...wrapperProps}>
      <PanelTag {...panelProps}>
        <div className="detail-tv team-tv" style={{ ['--team-accent']: teamColor }}>
          <div className="detail-tv__topbar">
            <button type="button" className="detail-tv__back" onClick={onClose}>
              ← Teams
            </button>
            <div className="detail-tv__topTitle" title={title}>
              {title}
            </div>
            {isAdmin && team ? (
              <button type="button" className="detail-tv__edit" onClick={() => onEdit?.(team)}>
                Edit Team
              </button>
            ) : (
              <div />
            )}
          </div>

          {loading ? (
            <div className="detail-tv__loading"><span className="spinner spinner-lg" /></div>
          ) : error ? (
            <div style={{ padding: 16 }}><div className="error-msg">{error}</div></div>
          ) : team ? (
            <div className="detail-tv__content">
              <div className="team-tv__bar">
                <button type="button" className="team-tv__back" onClick={onClose}>
                  ← Teams
                </button>
                {isAdmin ? (
                  <button type="button" className="team-tv__edit" onClick={() => onEdit?.(team)}>
                    Edit Team
                  </button>
                ) : (
                  <div />
                )}
              </div>

              <section className="team-tv__hero">
                <div className="team-tv__glow team-tv__glow--a" aria-hidden="true" style={{ background: glowA }} />
                <div className="team-tv__glow team-tv__glow--b" aria-hidden="true" style={{ background: glowB }} />
                {team.logo_url ? (
                  <img className="team-tv__watermark" src={team.logo_url} alt="" aria-hidden="true" />
                ) : null}

                <div className="team-tv__heroInner">
                  <div className="team-tv__logo">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name || ''}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{String(team.name || 'TEAM').slice(0, 4).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="team-tv__title">{team.name || 'Team'}</div>

                  <div className="team-tv__meta">
                    {team.nationality ? <span>{team.nationality}</span> : null}
                    {team.nationality && team.base ? <span className="team-tv__dot">•</span> : null}
                    {team.base ? <span>{team.base}</span> : null}
                    {(team.nationality || team.base) && team.first_entry ? <span className="team-tv__dot">•</span> : null}
                    {team.first_entry ? <span>Est. {team.first_entry}</span> : null}

                    {Number(team.championships) > 0 ? (
                      <span className="team-tv__badge">
                        <span style={{ fontWeight: 700 }}>{team.championships} WCC</span>
                        <span style={{ marginLeft: 8, opacity: 0.95 }}>{trophyText(team.championships)}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="team-tv__stats">
                <div className="team-tv__statsRow">
                  <Stat label="Races" value={computed.raceCount} />
                  <div className="team-tv__vdiv" aria-hidden="true" />
                  <Stat label="Wins" value={computed.wins} />
                  <div className="team-tv__vdiv" aria-hidden="true" />
                  <Stat label="Podiums" value={computed.podiums} />
                  <div className="team-tv__vdiv" aria-hidden="true" />
                  <Stat label="Points" value={fmtPts(computed.totalPoints)} />
                </div>
                {(computed.firstYear || computed.lastYear) ? (
                  <div className="team-tv__years">{computed.firstYear || '—'}{computed.firstYear && computed.lastYear ? ' — ' : ''}{computed.lastYear || '—'}</div>
                ) : null}
              </div>

              <div className="team-tv__tabs">
                <TabButton id="history" active={tab === 'history'} onClick={setTab} color={teamColor}>Race History</TabButton>
                <TabButton id="standings" active={tab === 'standings'} onClick={setTab} color={teamColor}>Standings</TabButton>
                <TabButton id="drivers" active={tab === 'drivers'} onClick={setTab} color={teamColor}>Drivers</TabButton>
                <TabButton id="info" active={tab === 'info'} onClick={setTab} color={teamColor}>Info</TabButton>
              </div>

              {tab === 'history' ? (
                <div>
                  {groupedRaces.length === 0 ? (
                    <div className="info-msg" style={{ margin: '18px 48px' }}>No race results found for this team.</div>
                  ) : (
                    groupedRaces.map((g) => {
                      const race = g.race;
                      const best = g.results.reduce((b, r) => (r.position && (!b || r.position < b) ? r.position : b), null);
                      const pts = g.results.reduce((s, r) => s + (Number(r.points) || 0), 0);
                      const posTone = best === 1 ? '#ffd60a' : best === 2 ? '#e5e5ea' : best === 3 ? '#c96b2e' : 'var(--sub)';
                      return (
                        <div key={race.id} className="team-tv__raceRow">
                          <div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--team-accent)', fontWeight: 500 }}>
                              {race.season_year ?? '—'}
                            </div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                              R{race.round ?? '—'}
                            </div>
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 6 }} title={race.name || ''}>
                              {race.name || 'Race'}
                            </div>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                              {g.results.map((r) => (
                                <DriverChip key={r.id} r={r} teamColor={teamColor} onOpenDriver={onOpenDriver} />
                              ))}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {best ? (
                              <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, color: posTone }}>
                                P{best}
                              </div>
                            ) : null}
                            {pts > 0 ? (
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--team-accent)', marginTop: 2 }}>
                                +{fmtPts(pts)} pts
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}

              {tab === 'standings' ? (
                <div style={{ padding: '0 48px 26px' }}>
                  {standingsYears.length ? (
                    <div className="driver-tv__years" style={{ padding: '18px 0 12px' }}>
                      <button type="button" className={`driver-tv__year ${!standingsYear ? 'is-active' : ''}`} onClick={() => setStandingsYear(null)}>
                        All
                      </button>
                      {standingsYears.map((y) => (
                        <button
                          key={y}
                          type="button"
                          className={`driver-tv__year ${Number(standingsYear) === Number(y) ? 'is-active' : ''}`}
                          onClick={() => setStandingsYear(Number(standingsYear) === Number(y) ? null : y)}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {filteredStandings.length === 0 ? (
                    <div className="info-msg" style={{ marginTop: 12 }}>No constructor standings found for this team.</div>
                  ) : (
                    <div className="detail-tv__rows">
                      {filteredStandings
                        .slice()
                        .sort((a, b) => (b.season_year || 0) - (a.season_year || 0))
                        .map((s, idx, arr) => (
                          <StandingsRow
                            key={s.season_year}
                            s={s}
                            maxPoints={standingsMax}
                            teamColor={teamColor}
                            isLast={idx === arr.length - 1}
                          />
                        ))}
                    </div>
                  )}
                </div>
              ) : null}

              {tab === 'drivers' ? (
                <div>
                  <div className="team-tv__sectionLabel">Current Drivers</div>
                  <div className="team-tv__driverGrid">
                    {(drivers || []).length === 0 ? (
                      <div className="info-msg" style={{ gridColumn: '1 / -1' }}>No drivers found for this team.</div>
                    ) : (
                      (drivers || []).map((d) => {
                        const fullName = `${d.first_name || ''} ${d.last_name || ''}`.trim();
                        const code = d.code || '—';
                        const number = d.number ?? '—';
                        return (
                          <button
                            key={d.id}
                            type="button"
                            className="team-tv__driverCard"
                            onClick={() => onOpenDriver?.(d.id)}
                          >
                            <div className="team-tv__driverTop">
                              <div style={{ width: 56, height: 56, borderRadius: '50%', position: 'relative', flexShrink: 0 }}>
                                <div className="team-tv__driverPhotoFallback" style={{ borderColor: teamColor }}>
                                  {String(code).slice(0, 2)}
                                </div>
                                {d.image_url ? (
                                  <img
                                    src={d.image_url}
                                    alt=""
                                    className="team-tv__driverPhoto"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                    style={{ borderColor: teamColor }}
                                  />
                                ) : null}
                              </div>
                              {d.active ? <span className="team-tv__active">ACTIVE</span> : <span className="team-tv__inactive">FORMER</span>}
                            </div>
                            <div className="team-tv__driverName" title={fullName}>{fullName || '—'}</div>
                            <div className="team-tv__driverSub">{code} · #{number}</div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="team-tv__sectionLabel" style={{ marginTop: 18 }}>Former Drivers</div>
                  <div style={{ padding: '0 48px 26px' }}>
                    {formerDrivers.length === 0 ? (
                      <div className="info-msg">No former drivers found (based on team race history).</div>
                    ) : (
                      formerDrivers.map((d, idx) => {
                        const fullName = `${d.first_name || ''} ${d.last_name || ''}`.trim();
                        const initials = `${String(d.first_name || '').slice(0, 1)}${String(d.last_name || '').slice(0, 1)}`.toUpperCase();
                        return (
                          <button
                            key={d.id || idx}
                            type="button"
                            onClick={() => d.id && onOpenDriver?.(d.id)}
                            style={{
                              width: '100%',
                              height: 44,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              border: 'none',
                              background: 'transparent',
                              cursor: d.id ? 'pointer' : 'default',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              padding: '0 0',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'var(--mono)',
                              fontSize: 10,
                              color: 'var(--muted)',
                            }}>
                              {initials || '—'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {fullName || '—'}
                              </div>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                                {d.nationality || '—'}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}

              {tab === 'info' ? (
                <div style={{ padding: '18px 48px 26px' }}>
                  <div style={{ borderRadius: 16, overflow: 'hidden' }}>
                    {[
                      ['Full Name', team.name || '—'],
                      ['Nationality', team.nationality || '—'],
                      ['Base', team.base || '—'],
                      ['Founded', team.first_entry ? `Est. ${team.first_entry}` : '—'],
                      ['Championships', team.championships != null ? `${team.championships}` : '—'],
                      ['Active Years', (computed.firstYear || computed.lastYear) ? `${computed.firstYear || '—'} — ${computed.lastYear || '—'}` : '—'],
                    ].map(([k, v], idx) => (
                      <div
                        key={k}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '140px 1fr',
                          gap: 14,
                          padding: '12px 14px',
                          background: idx % 2 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {k}
                        </div>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                          {v}
                          {k === 'Championships' && Number(team.championships) > 0 ? (
                            <span style={{ marginLeft: 10, color: '#ffd60a' }}>
                              {trophyText(team.championships)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  {team.logo_url ? (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
                      <img
                        src={team.logo_url}
                        alt={team.name || ''}
                        style={{ maxWidth: 200, maxHeight: 120, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}

                  {team.wiki_url ? (
                    <a
                      className="detail-tv__pill"
                      href={team.wiki_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginTop: 18 }}
                    >
                      ↗ Wikipedia
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </PanelTag>
    </Wrapper>
  );
}
