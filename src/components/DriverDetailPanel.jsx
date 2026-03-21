import { useEffect, useMemo, useState } from 'react';
import { db, driver_career } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TeamLogo } from './Images';

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
  return <span className={`driver-tv__status ${active ? 'is-active' : ''}`}>{active ? 'ACTIVE' : 'RETIRED'}</span>;
}

function TabButton({ id, active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`detail-tv__tab ${active ? 'is-active' : ''}`}
    >
      {children}
    </button>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`driver-tv__year ${active ? 'is-active' : ''}`}
    >
      {children}
    </button>
  );
}

function PointsChart({ data, selectedYear, onSelectYear }) {
  const max = Math.max(1, ...data.map(d => d.points || 0));
  return (
    <div className="driver-tv__chart" aria-label="Points per season">
      {data.map((d) => {
        const h = Math.round(((d.points || 0) / max) * 56);
        const active = selectedYear === d.year;
        return (
          <div key={d.year} className="driver-tv__barWrap">
            <button
              type="button"
              className={`driver-tv__bar ${active ? 'is-active' : ''}`}
              onClick={() => onSelectYear(active ? null : d.year)}
              title={`${d.year}: ${d.points} pts`}
              style={{ height: Math.max(6, h) }}
            />
            <div className="driver-tv__barLabel">{d.year}</div>
          </div>
        );
      })}
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
  const statusLower = String(status).toLowerCase();
  const statusTone =
    statusLower.includes('dnf') || statusLower.includes('dns') ? 'red'
      : statusLower.includes('lap') ? 'blue'
        : 'green';

  const posNum = Number(pos);
  const posColor = posNum === 1 ? 'var(--yellow)' : posNum === 2 ? '#e5e5ea' : posNum === 3 ? '#c96b2e' : 'var(--text)';

  return (
    <div className="detail-tv__row driver-tv__resultRow">
      <div className="driver-tv__resultPos" style={{ color: posColor }}>
        {pos}
      </div>

      <div className="driver-tv__resultThumb">
        {circuit?.layout_url ? (
          <img
            src={circuit.layout_url}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
      </div>

      <div className="driver-tv__resultMain">
        <div className="driver-tv__resultName" title={race?.name || ''}>
          {race?.name || 'Race'}
        </div>
        <div className="driver-tv__resultSub">
          {race?.season_year ?? '—'} · R{race?.round ?? '—'} · {circuit?.country || circuit?.locality || '—'}
        </div>
        <div className="driver-tv__resultMeta">
          <span className={`driver-tv__pill driver-tv__pill--${statusTone}`}>{status}</span>
          {r.fastest_lap ? <span className="driver-tv__pill driver-tv__pill--blue">FL</span> : null}
          <span className="driver-tv__monoMuted">Grid <span className="driver-tv__monoStrong">{grid}</span></span>
          <span className="driver-tv__monoMuted">Finish <span className="driver-tv__monoStrong">{pos}</span></span>
        </div>
      </div>

      <div className="driver-tv__resultRight">
        {points > 0 ? <div className="driver-tv__points">{points}</div> : null}
        {r.teams?.logo_url ? <TeamLogo src={r.teams.logo_url} name={r.teams?.name} size={20} /> : null}
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
        <div className="detail-tv driver-tv" style={driver?.teams?.team_color ? { ['--team-color']: driver.teams.team_color } : undefined}>
        <div className="detail-tv__topbar">
          <button type="button" className="detail-tv__back" onClick={onClose}>
            ← Drivers
          </button>
          <div className="detail-tv__topTitle" title={title}>
            {title}
          </div>
          {isAdmin && driver ? (
            <button type="button" className="detail-tv__edit" onClick={() => onEdit?.(driver)}>
              Edit Driver
            </button>
          ) : (
            <div />
          )}
        </div>

        {loading ? (
          <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><span className="spinner spinner-lg" /></div>
        ) : error ? (
          <div style={{ padding: 16 }}><div className="error-msg">{error}</div></div>
        ) : driver ? (
          <div>
            <div className="detail-tv__contentBar">
              <button type="button" className="detail-tv__back" onClick={onClose}>
                ← Back
              </button>
              {isAdmin ? (
                <button type="button" className="detail-tv__edit" onClick={() => onEdit?.(driver)}>
                  Edit Driver
                </button>
              ) : (
                <div />
              )}
            </div>
            {/* Hero */}
            <section className="driver-tv__hero">
              <div className="driver-tv__heroBg" aria-hidden="true" />
              <div className="driver-tv__heroNumber" aria-hidden="true">{driver.number || ''}</div>

              {driver.image_url ? (
                <img
                  className="driver-tv__heroPhoto"
                  src={driver.image_url}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}

              <div className="driver-tv__heroContent">
                {driver.teams?.logo_url ? (
                  <img
                    className="driver-tv__heroTeamLogo"
                    src={driver.teams.logo_url}
                    alt={driver.teams?.name || ''}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}

                <div className="driver-tv__heroName">
                  <div className="driver-tv__heroFirst">{driver.first_name || '—'}</div>
                  <div className="driver-tv__heroLast">{driver.last_name || '—'}</div>
                </div>

                <div className="driver-tv__heroMeta">
                  {driver.nationality ? <span>{driver.nationality}</span> : null}
                  {age != null ? <span>{age} yrs</span> : null}
                  <StatusBadge active={driver.active} />
                </div>
              </div>
            </section>

            <div className="driver-tv__statsbar">
              <div className="driver-tv__stat">
                <div className="driver-tv__statValue">{computed.races}</div>
                <div className="driver-tv__statLabel">Races</div>
              </div>
              <div className="driver-tv__statDiv" aria-hidden="true" />
              <div className="driver-tv__stat">
                <div className="driver-tv__statValue">{computed.wins}</div>
                <div className="driver-tv__statLabel">Wins</div>
              </div>
              <div className="driver-tv__statDiv" aria-hidden="true" />
              <div className="driver-tv__stat">
                <div className="driver-tv__statValue">{computed.podiums}</div>
                <div className="driver-tv__statLabel">Podiums</div>
              </div>
              <div className="driver-tv__statDiv" aria-hidden="true" />
              <div className="driver-tv__stat">
                <div className="driver-tv__statValue">{Math.round((computed.points || 0) * 100) / 100}</div>
                <div className="driver-tv__statLabel">Points</div>
              </div>
              <div className="driver-tv__statDiv" aria-hidden="true" />
              <div className="driver-tv__stat">
                <div className="driver-tv__statValue">{computed.fastestLaps}</div>
                <div className="driver-tv__statLabel">Fastest Laps</div>
              </div>
              <div className="driver-tv__statDiv" aria-hidden="true" />
              <div className="driver-tv__stat">
                <div className="driver-tv__statValue">{computed.bestFinish ?? '—'}</div>
                <div className="driver-tv__statLabel">Best Finish</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="detail-tv__tabs">
              <TabButton id="history" active={tab === 'history'} onClick={setTab}>Race History</TabButton>
              <TabButton id="championships" active={tab === 'championships'} onClick={setTab}>Championships</TabButton>
              <TabButton id="bio" active={tab === 'bio'} onClick={setTab}>Bio</TabButton>
            </div>

            {/* Body */}
            <div className="detail-tv__body">
              {tab === 'history' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {seasons.length ? (
                    <PointsChart data={seasons.slice().reverse()} selectedYear={seasonFilter} onSelectYear={setSeasonFilter} />
                  ) : (
                    <div className="info-msg">No race results found for this driver.</div>
                  )}

                  {seasonPills.length ? (
                    <div className="driver-tv__years">
                      <Pill active={!seasonFilter} onClick={() => setSeasonFilter(null)}>All</Pill>
                      {seasonPills.map(y => (
                        <Pill key={y} active={seasonFilter === y} onClick={() => setSeasonFilter(seasonFilter === y ? null : y)}>{y}</Pill>
                      ))}
                    </div>
                  ) : null}

                  <div className="detail-tv__rows">
                    {filteredResults.map(r => <ResultRow key={r.id} r={r} />)}
                  </div>
                </div>
              ) : null}

              {tab === 'championships' ? (
                <div className="detail-tv__rows">
                  {standings.length === 0 ? (
                    <div className="info-msg">No standings data found for this driver.</div>
                  ) : standings.map((s, idx) => {
                    const pct = Math.min(100, Math.round(((Number(s.points) || 0) / standingsMax) * 100));
                    const isChampion = Number(s.position) === 1;
                    return (
                      <div key={s.season_year} className={`detail-tv__row driver-tv__champRow ${idx === standings.length - 1 ? 'is-last' : ''}`}>
                        <div className="driver-tv__champYear" style={{ color: isChampion ? 'var(--red)' : 'var(--text)' }}>
                          {s.season_year ?? '—'}
                        </div>
                        <div className="driver-tv__champPos" style={{ color: isChampion ? 'var(--yellow)' : 'var(--sub)' }}>
                          P{s.position ?? '—'}
                        </div>
                        <div className="driver-tv__champBar">
                          <div className="driver-tv__champFill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="driver-tv__champPts">{Number(s.points) || 0}</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {tab === 'bio' ? (
                <div className="detail-tv__stack">
                  {driver.image_url ? (
                    <div className="driver-tv__bioPhoto">
                      <img
                        src={driver.image_url}
                        alt={title}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}

                  <div className="detail-tv__kv">
                    {[
                      ['Name', `${driver.first_name} ${driver.last_name}`],
                      ['Code', driver.code || '—'],
                      ['Number', driver.number || '—'],
                      ['DOB', driver.dob || '—'],
                      ['Age', age != null ? `${age}` : '—'],
                      ['Nationality', driver.nationality || '—'],
                      ['Team', driver.teams?.name || '—'],
                      ['Past Teams', pastTeams.length ? pastTeams.map((t) => t.name).join(', ') : '—'],
                      ['Team Base', driver.teams?.base || '—'],
                    ].map(([k, v], idx) => (
                      <div key={k} className={`detail-tv__kvRow ${idx % 2 ? 'is-alt' : ''}`}>
                        <div className="detail-tv__kvKey">{k}</div>
                        <div className="detail-tv__kvVal">{v}</div>
                      </div>
                    ))}
                  </div>

                  {driver.wiki_url ? (
                    <a className="detail-tv__pill" href={driver.wiki_url} target="_blank" rel="noreferrer">
                      ↗ Wikipedia
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        </div>
      </PanelTag>
    </Wrapper>
  );
}
