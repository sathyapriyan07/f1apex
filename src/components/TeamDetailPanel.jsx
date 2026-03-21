import { useEffect, useMemo, useState } from 'react';
import { db, team_detail } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { TeamLogo, DriverPhoto } from './Images';

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

function StatCounter({ label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 10px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '.09em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{value ?? '—'}</div>
    </div>
  );
}

function ResultRow({ r }) {
  const race = r.races;
  const driver = r.drivers;
  const pos = r.position == null ? '—' : r.position;
  const points = r.points == null ? 0 : r.points;
  const posCls = r.position === 1 ? 'badge badge-yellow' : r.position === 2 ? 'badge badge-muted' : r.position === 3 ? 'badge badge-red' : 'badge badge-green';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 12,
      padding: 12,
      border: '1px solid var(--line)',
      borderRadius: 10,
      background: 'rgba(255,255,255,.02)',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            {race?.season_year ?? '—'} · R{race?.round ?? '—'}
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{race?.name || 'Race'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DriverPhoto src={driver?.image_url} name={`${driver?.first_name} ${driver?.last_name}`} size={20} />
          <span style={{ fontSize: 11, color: 'var(--sub)' }}>{driver?.first_name} {driver?.last_name}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span className={posCls}>P{pos}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{points} pts</span>
      </div>
    </div>
  );
}

function SeasonRow({ s }) {
  const pos = s.position == null ? '—' : s.position;
  const posCls = s.position === 1 ? 'badge badge-yellow' : s.position <= 3 ? 'badge badge-muted' : 'badge badge-green';

  return (
    <div style={{
      padding: 12,
      border: '1px solid var(--line)',
      borderRadius: 10,
      background: 'rgba(255,255,255,.02)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{s.season_year}</span>
        <span className={posCls}>P{pos}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="badge badge-yellow">{s.wins ?? 0} W</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{s.points ?? 0} pts</span>
      </div>
    </div>
  );
}

function DriverRow({ d }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderBottom: '1px solid var(--line)',
    }}>
      <DriverPhoto src={d.image_url} name={`${d.first_name} ${d.last_name}`} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.first_name} {d.last_name}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>
          {d.nationality || '—'} · #{d.number || '—'}
        </div>
      </div>
      <span className={d.active ? 'badge badge-green' : 'badge badge-muted'}>
        {d.active ? 'ACTIVE' : 'RETIRED'}
      </span>
    </div>
  );
}

export default function TeamDetailPanel({ teamId, onClose, onEdit, mode = 'panel' }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('history');
  const [team, setTeam] = useState(null);
  const [results, setResults] = useState([]);
  const [standings, setStandings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const computed = useMemo(() => {
    const raceCount = results.length;
    const wins = results.filter(r => r.position === 1).length;
    const podiums = results.filter(r => r.position != null && r.position <= 3).length;
    const totalPoints = results.reduce((a, r) => a + (Number(r.points) || 0), 0);
    const years = [...new Set(results.map(r => r.races?.season_year).filter(y => y != null))];
    const firstYear = years.length ? Math.min(...years) : null;
    const lastYear = years.length ? Math.max(...years) : null;
    return { raceCount, wins, podiums, totalPoints, firstYear, lastYear };
  }, [results]);

  const title = team?.name || 'Team';

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
            {isAdmin && team ? (
              <button className="btn btn-blue btn-xs" onClick={() => onEdit?.(team)}>Edit Team</button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><span className="spinner spinner-lg" /></div>
        ) : error ? (
          <div style={{ padding: 16 }}><div className="error-msg">{error}</div></div>
        ) : team ? (
          <div>
            <div style={{
              padding: '18px 16px 16px',
              borderBottom: '1px solid var(--line)',
              background: 'linear-gradient(180deg, rgba(220,38,38,.12), rgba(0,0,0,0))',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 14,
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  background: 'var(--bg3)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name}
                      style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500, color: 'var(--line2)' }}>
                      {team.name?.slice(0, 4).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 22, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.1 }}>
                    {team.name}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {team.nationality ? <span className="badge badge-muted">{team.nationality}</span> : null}
                    {team.base ? <span className="badge badge-blue">{team.base}</span> : null}
                    {team.championships ? <span className="badge badge-yellow">{team.championships} WCC</span> : null}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                <StatCounter label="Races" value={computed.raceCount} />
                <StatCounter label="Wins" value={computed.wins} />
                <StatCounter label="Podiums" value={computed.podiums} />
                <StatCounter label="Points" value={computed.totalPoints} />
              </div>

              {(computed.firstYear || computed.lastYear) ? (
                <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {computed.firstYear || '—'}{computed.firstYear && computed.lastYear ? ' — ' : ''}{computed.lastYear || '—'}
                </div>
              ) : null}
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              <TabButton id="history" active={tab === 'history'} onClick={setTab}>Race History</TabButton>
              <TabButton id="standings" active={tab === 'standings'} onClick={setTab}>Standings</TabButton>
              <TabButton id="drivers" active={tab === 'drivers'} onClick={setTab}>Drivers</TabButton>
              <TabButton id="info" active={tab === 'info'} onClick={setTab}>Info</TabButton>
            </div>

            <div style={{ padding: '16px 16px 24px' }}>
              {tab === 'history' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {results.length === 0 ? (
                    <div className="info-msg">No race results found for this team.</div>
                  ) : (
                    results.map(r => <ResultRow key={r.id} r={r} />)
                  )}
                </div>
              ) : null}

              {tab === 'standings' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {standings.length === 0 ? (
                    <div className="info-msg">No constructor standings found for this team.</div>
                  ) : (
                    standings.map(s => <SeasonRow key={s.season_year} s={s} />)
                  )}
                </div>
              ) : null}

              {tab === 'drivers' ? (
                <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                  {drivers.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No drivers found for this team.</div>
                  ) : (
                    drivers.map(d => <DriverRow key={d.id} d={d} />)
                  )}
                </div>
              ) : null}

              {tab === 'info' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {[
                          ['Name', team.name || '—'],
                          ['Nationality', team.nationality || '—'],
                          ['Base', team.base || '—'],
                          ['Constructor Championships', team.championships ?? '—'],
                          ['First Entry', team.first_entry || '—'],
                        ].map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--line)', width: 160 }}>{k}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--text)' }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {team.logo_url ? (
                    <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg3)', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={team.logo_url} alt={team.name}
                        style={{ maxWidth: 160, maxHeight: 100, objectFit: 'contain', opacity: .95 }}
                        onError={e => { e.target.style.display = 'none'; }} />
                    </div>
                  ) : null}

                  {team.wiki_url ? (
                    <a className="btn btn-ghost" href={team.wiki_url} target="_blank" rel="noreferrer" style={{ width: 'fit-content' }}>
                      Wikipedia
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </PanelTag>
    </Wrapper>
  );
}
