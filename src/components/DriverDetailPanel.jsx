import { useEffect, useMemo, useState } from 'react';
import { db, driver_career } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CircuitLayout, DriverPhoto, TeamLogo } from './Images';

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function sum(arr) { return arr.reduce((a, b) => a + (Number(b) || 0), 0); }

function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

function StatusBadge({ active }) {
  const cls = active ? 'badge badge-green' : 'badge badge-muted';
  return <span className={cls}>{active ? 'ACTIVE' : 'RETIRED'}</span>;
}

function Stat({ label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 10px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '.09em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
    </div>
  );
}

function TabButton({ id, active, onClick, children }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: '8px 10px',
        background: active ? 'rgba(220,38,38,.14)' : 'transparent',
        border: `1px solid ${active ? 'rgba(220,38,38,.35)' : 'var(--line2)'}`,
        borderRadius: 6,
        color: active ? '#fff' : 'var(--sub)',
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        transition: 'all .12s',
      }}
    >
      {children}
    </button>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-xs"
      style={{
        background: active ? 'var(--bg3)' : 'transparent',
        border: `1px solid ${active ? 'var(--line2)' : 'var(--line)'}`,
        color: active ? 'var(--text)' : 'var(--muted)',
        padding: '3px 8px',
        fontFamily: 'var(--mono)',
        letterSpacing: '.06em',
        textTransform: 'none',
      }}
    >
      {children}
    </button>
  );
}

function PointsChart({ data, selectedYear, onSelectYear }) {
  const max = Math.max(1, ...data.map(d => d.points || 0));
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'rgba(255,255,255,.02)' }}>
      {data.map(d => {
        const h = Math.round(((d.points || 0) / max) * 56) + 6;
        const active = selectedYear === d.year;
        return (
          <button
            key={d.year}
            onClick={() => onSelectYear(active ? null : d.year)}
            title={`${d.year}: ${d.points} pts`}
            style={{
              width: 18,
              height: h,
              background: active ? 'var(--accent)' : 'rgba(255,255,255,.1)',
              border: `1px solid ${active ? 'rgba(232,180,0,.45)' : 'var(--line)'}`,
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all .12s',
            }}
          />
        );
      })}
      <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
        Points / season
      </div>
    </div>
  );
}

function ResultRow({ r }) {
  const race = r.races;
  const circuit = race?.circuits;
  const pos = r.position == null ? '—' : r.position;
  const grid = r.grid_position == null ? '—' : r.grid_position;
  const points = r.points == null ? 0 : r.points;
  const status = r.status || (r.position == null ? 'DNF' : 'Finished');
  const statusCls =
    status.toLowerCase().includes('dnf') || status.toLowerCase().includes('dns') ? 'badge badge-red'
      : status.toLowerCase().includes('lap') ? 'badge badge-yellow'
        : 'badge badge-green';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr auto',
      gap: 12,
      padding: 12,
      border: '1px solid var(--line)',
      borderRadius: 10,
      background: 'rgba(255,255,255,.02)',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CircuitLayout src={circuit?.layout_url} name={circuit?.name} width={74} height={50} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            {race?.season_year ?? '—'} · R{race?.round ?? '—'}
          </div>
          <div style={{ fontWeight: 800, fontSize: 12, lineHeight: 1.1 }}>
            {race?.name || 'Race'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--sub)' }}>
            {circuit?.country || circuit?.locality || '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={statusCls}>{status}</span>
        {r.fastest_lap ? <span className="badge badge-blue">FL</span> : null}
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>Grid <span style={{ color: 'var(--text)', fontWeight: 700 }}>{grid}</span></span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>Finish <span style={{ color: 'var(--text)', fontWeight: 700 }}>{pos}</span></span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>Pts <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{points}</span></span>
        {r.time_or_gap ? <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{r.time_or_gap}</span> : null}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
        {r.teams?.logo_url ? <TeamLogo src={r.teams.logo_url} name={r.teams?.name} size={26} /> : null}
      </div>
    </div>
  );
}

export default function DriverDetailPanel({ driverId, onClose, onEdit, mode = 'panel' }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('history'); // history | championships | bio
  const [driver, setDriver] = useState(null);
  const [results, setResults] = useState([]);
  const [standings, setStandings] = useState([]);
  const [pastTeams, setPastTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seasonFilter, setSeasonFilter] = useState(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    if (mode === 'panel') document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      if (mode === 'panel') document.body.style.overflow = prev;
    };
  }, [onClose, mode]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true); setError('');
      const [d, rr, ss] = await Promise.all([
        db.drivers.byId(driverId),
        driver_career.results(driverId),
        driver_career.standings(driverId),
      ]);
      if (!alive) return;
      if (d.error) { setError(d.error.message); setLoading(false); return; }
      if (rr.error) { setError(rr.error.message); setLoading(false); return; }
      if (ss.error) { setError(ss.error.message); setLoading(false); return; }
      setDriver(d.data);
      setResults(rr.data || []);
      setStandings(ss.data || []);
      setPastTeams([]);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [driverId]);

  useEffect(() => {
    let alive = true;
    async function loadPastTeams() {
      const ids = Array.isArray(driver?.past_team_ids) ? driver.past_team_ids.filter(Boolean) : [];
      if (!ids.length) { setPastTeams([]); return; }
      const { data, error } = await db.teams.list();
      if (!alive) return;
      if (error) { setPastTeams([]); return; }
      const all = data || [];
      const list = ids.map(id => all.find(t => t.id === id)).filter(Boolean);
      setPastTeams(list);
    }
    if (!driver) return;
    loadPastTeams();
    return () => { alive = false; };
  }, [driver]);

  const age = useMemo(() => calcAge(driver?.dob), [driver?.dob]);

  const computed = useMemo(() => {
    const races = results.length;
    const wins = results.filter(r => r.position === 1).length;
    const podiums = results.filter(r => r.position != null && r.position <= 3).length;
    const points = sum(results.map(r => r.points));
    const fastestLaps = results.filter(r => !!r.fastest_lap).length;
    const finishes = results.map(r => r.position).filter(p => p != null);
    const bestFinish = finishes.length ? Math.min(...finishes) : null;
    return { races, wins, podiums, points, fastestLaps, bestFinish };
  }, [results]);

  const seasons = useMemo(() => {
    const byYear = groupBy(results, r => r.races?.season_year ?? null);
    const years = [...byYear.keys()].filter(y => y != null).sort((a, b) => b - a);
    return years.map(year => ({ year, points: sum(byYear.get(year).map(r => r.points)) }));
  }, [results]);

  const seasonPills = useMemo(() => seasons.map(s => s.year), [seasons]);

  const filteredResults = useMemo(() => {
    if (!seasonFilter) return results;
    return results.filter(r => r.races?.season_year === seasonFilter);
  }, [results, seasonFilter]);

  const standingsMax = useMemo(() => Math.max(1, ...standings.map(s => Number(s.points) || 0)), [standings]);

  const title = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver';

  const Wrapper = mode === 'panel' ? 'div' : 'div';
  const PanelTag = mode === 'panel' ? 'aside' : 'div';
  const wrapperProps = mode === 'panel'
    ? { className: 'slidein-backdrop', onMouseDown: onClose, 'aria-label': 'Close driver panel' }
    : {};
  const panelProps = mode === 'panel'
    ? { className: 'slidein-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onMouseDown: (e) => e.stopPropagation() }
    : { className: 'card', style: { width: '100%', overflow: 'hidden' } };

  return (
    <Wrapper {...wrapperProps}>
      <PanelTag {...panelProps}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'rgba(17,17,19,.9)',
          borderBottom: '1px solid var(--line)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>Back</button>
            <div style={{ fontWeight: 900, letterSpacing: '-.01em' }}>{title}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin && driver ? (
              <button className="btn btn-blue btn-xs" onClick={() => onEdit?.(driver)}>Edit Driver</button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><span className="spinner spinner-lg" /></div>
        ) : error ? (
          <div style={{ padding: 16 }}><div className="error-msg">{error}</div></div>
        ) : driver ? (
          <div>
            {/* Hero */}
            <div style={{
              padding: '18px 16px 16px',
              borderBottom: '1px solid var(--line)',
              background: 'linear-gradient(180deg, rgba(220,38,38,.12), rgba(0,0,0,0))',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                right: 14,
                top: 8,
                fontFamily: 'var(--mono)',
                fontSize: 92,
                fontWeight: 700,
                color: 'rgba(255,255,255,.06)',
                letterSpacing: '-.06em',
                pointerEvents: 'none',
                userSelect: 'none',
                lineHeight: 1,
              }}>
                {driver.number || ''}
              </div>

              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0 }}>
                  <DriverPhoto src={driver.image_url} name={`${driver.first_name} ${driver.last_name}`} size={86} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {driver.teams?.logo_url ? <TeamLogo src={driver.teams.logo_url} name={driver.teams?.name} size={28} /> : null}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--sans)', fontSize: 22, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {driver.first_name} {driver.last_name}
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <StatusBadge active={driver.active} />
                          {driver.nationality ? <span className="badge badge-muted">{driver.nationality}</span> : null}
                          {age != null ? <span className="badge badge-muted">{age} yrs</span> : null}
                          {driver.teams?.name ? <span className="badge badge-blue">{driver.teams.name}</span> : null}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {driver.code ? (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--sub)', letterSpacing: '.12em' }}>{driver.code}</span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                    <Stat label="Races" value={computed.races} />
                    <Stat label="Wins" value={computed.wins} />
                    <Stat label="Podiums" value={computed.podiums} />
                    <Stat label="Points" value={Math.round((computed.points || 0) * 100) / 100} />
                    <Stat label="Fastest Laps" value={computed.fastestLaps} />
                    <Stat label="Best Finish" value={computed.bestFinish ?? '—'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ padding: '14px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              <TabButton id="history" active={tab === 'history'} onClick={setTab}>Race History</TabButton>
              <TabButton id="championships" active={tab === 'championships'} onClick={setTab}>Championships</TabButton>
              <TabButton id="bio" active={tab === 'bio'} onClick={setTab}>Bio</TabButton>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 16px 24px' }}>
              {tab === 'history' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {seasons.length ? (
                    <PointsChart data={seasons.slice().reverse()} selectedYear={seasonFilter} onSelectYear={setSeasonFilter} />
                  ) : (
                    <div className="info-msg">No race results found for this driver.</div>
                  )}

                  {seasonPills.length ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Pill active={!seasonFilter} onClick={() => setSeasonFilter(null)}>All</Pill>
                      {seasonPills.map(y => (
                        <Pill key={y} active={seasonFilter === y} onClick={() => setSeasonFilter(seasonFilter === y ? null : y)}>{y}</Pill>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredResults.map(r => <ResultRow key={r.id} r={r} />)}
                  </div>
                </div>
              ) : null}

              {tab === 'championships' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {standings.length === 0 ? (
                    <div className="info-msg">No standings data found for this driver.</div>
                  ) : standings.map(s => {
                    const pct = Math.min(100, Math.round(((Number(s.points) || 0) / standingsMax) * 100));
                    return (
                      <div key={s.season_year} style={{
                        padding: 12,
                        border: '1px solid var(--line)',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,.02)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{s.season_year}</div>
                            <div style={{ fontWeight: 900 }}>P{s.position ?? '—'}</div>
                            {s.teams?.logo_url ? <TeamLogo src={s.teams.logo_url} name={s.teams?.name} size={22} /> : null}
                            <div style={{ fontSize: 12, color: 'var(--sub)' }}>{s.teams?.name || '—'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="badge badge-yellow">{s.wins ?? 0} W</span>
                            <span className="badge badge-muted">{s.points ?? 0} pts</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 10, height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width .35s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {tab === 'bio' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'start' }}>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg3)' }}>
                    <img
                      src={driver.image_url || ''}
                      alt=""
                      style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'top' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    {!driver.image_url ? (
                      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                        NO PHOTO
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {[
                            ['Name', `${driver.first_name} ${driver.last_name}`],
                            ['Code', driver.code || '—'],
                            ['Number', driver.number || '—'],
                            ['DOB', driver.dob || '—'],
                            ['Age', age != null ? `${age}` : '—'],
                            ['Nationality', driver.nationality || '—'],
                            ['Team', driver.teams?.name || '—'],
                            ['Past Teams', pastTeams.length ? pastTeams.map(t => t.name).join(', ') : '—'],
                            ['Team Base', driver.teams?.base || '—'],
                          ].map(([k, v]) => (
                            <tr key={k}>
                              <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--line)', width: 120 }}>{k}</td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--text)' }}>{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {driver.wiki_url ? (
                      <a className="btn btn-ghost" href={driver.wiki_url} target="_blank" rel="noreferrer" style={{ width: 'fit-content' }}>
                        Wikipedia
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </PanelTag>
    </Wrapper>
  );
}
