// src/pages/StandingsHub.jsx
import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';

function P1DriverHero({ entry, teams, onOpen }) {
  if (!entry) return null;
  const driver   = entry.drivers;
  const teamName = entry.teams?.name;
  const team     = teams.find(t => t.name === teamName);
  const teamColor = team?.team_color || '#27f4d2';

  return (
    <div
      onClick={() => onOpen?.(driver?.id)}
      style={{ position: 'relative', width: '100%', height: 240, overflow: 'hidden', background: '#000', cursor: 'pointer' }}
    >
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse at 40% 40%, ${teamColor}55 0%, ${teamColor}18 35%, transparent 65%)`,
      }} />
      {driver?.image_url && (
        <img src={driver.image_url} alt=""
          style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '65%', objectFit: 'cover', objectPosition: 'top center', zIndex: 1 }}
          onError={e => e.target.style.display = 'none'}
        />
      )}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', zIndex: 2,
        background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.85) 35%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
        display: 'grid', gridTemplateColumns: '44px 1fr auto 22px', alignItems: 'center',
        padding: '12px 16px 16px',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.01em' }}>01</span>
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14, color: '#fff', letterSpacing: '-0.01em' }}>
            {driver?.first_name} {driver?.last_name}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 11, color: teamColor, marginTop: 1 }}>
            {teamName || '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right', marginRight: 6 }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{entry.points}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>PTS</div>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 300 }}>›</span>
      </div>
    </div>
  );
}

function DriverStandingsList({ standings, teams, getTeamColor, onOpenDriver }) {
  if (!standings.length) return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      No standings data for this season
    </div>
  );

  const p1   = standings[0];
  const rest = standings.slice(1);

  return (
    <div>
      <P1DriverHero entry={p1} teams={teams} onOpen={onOpenDriver} />
      {rest.map((entry, idx) => {
        const driver    = entry.drivers;
        const teamName  = entry.teams?.name;
        const teamColor = getTeamColor(teamName);
        const pos       = idx + 2;
        return (
          <div key={entry.id}
            onClick={() => onOpenDriver?.(driver?.id)}
            style={{
              display: 'grid', gridTemplateColumns: '44px 1fr auto 22px', alignItems: 'center',
              padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.5)', letterSpacing: '-0.01em' }}>
              {String(pos).padStart(2, '0')}
            </span>
            <div>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: '#fff', letterSpacing: '-0.01em' }}>
                {driver?.first_name} {driver?.last_name}
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 11, color: teamColor, marginTop: 1 }}>
                {teamName || '—'}
              </div>
            </div>
            <div style={{ textAlign: 'right', marginRight: 6 }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{entry.points}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>PTS</div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 300 }}>›</span>
          </div>
        );
      })}
    </div>
  );
}

function P1TeamHero({ entry, teams, onOpen }) {
  if (!entry) return null;
  const team      = teams.find(t => t.name === entry.teams?.name);
  const teamColor = team?.team_color || '#e8002d';

  return (
    <div
      onClick={() => onOpen?.(team?.id)}
      style={{ position: 'relative', height: 220, overflow: 'hidden', background: '#000', cursor: 'pointer' }}
    >
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `radial-gradient(ellipse at 50% 35%, ${teamColor}50 0%, transparent 60%)`,
      }} />
      {team?.logo_url && (
        <img src={team.logo_url} alt=""
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -58%)', width: '38%', height: '38%',
            objectFit: 'contain', zIndex: 1,
          }}
          onError={e => e.target.style.display = 'none'}
        />
      )}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 2,
        background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.85) 35%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
        display: 'grid', gridTemplateColumns: '44px 1fr auto 22px', alignItems: 'center',
        padding: '12px 16px 16px',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: '#fff' }}>01</span>
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14, color: '#fff', letterSpacing: '-0.01em' }}>
            {entry.teams?.name}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 11, color: teamColor, marginTop: 1 }}>
            {team?.nationality || '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right', marginRight: 6 }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{entry.points}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>PTS</div>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>›</span>
      </div>
    </div>
  );
}

function TeamStandingsList({ standings, teams, getTeamColor, onOpenTeam }) {
  if (!standings.length) return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      No standings data for this season
    </div>
  );

  const p1   = standings[0];
  const rest = standings.slice(1);

  return (
    <div>
      <P1TeamHero entry={p1} teams={teams} onOpen={onOpenTeam} />
      {rest.map((entry, idx) => {
        const team      = teams.find(t => t.name === entry.teams?.name);
        const teamColor = team?.team_color || getTeamColor(entry.teams?.name);
        const pos       = idx + 2;
        return (
          <div key={entry.id}
            onClick={() => onOpenTeam?.(team?.id)}
            style={{
              display: 'grid', gridTemplateColumns: '44px 1fr auto 22px', alignItems: 'center',
              padding: '11px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>
              {String(pos).padStart(2, '0')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {team?.logo_url && (
                <img src={team.logo_url} alt=""
                  style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                  onError={e => e.target.style.display = 'none'}
                />
              )}
              <div>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: '#fff', letterSpacing: '-0.01em' }}>
                  {entry.teams?.name}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 11, color: teamColor, marginTop: 1 }}>
                  {team?.nationality || '—'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', marginRight: 6 }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{entry.points}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>PTS</div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>›</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StandingsHub({ seasons, teams = [], drivers = [], onOpenDriver, onOpenTeam }) {
  const [standingsTab, setStandingsTab]           = useState('drivers');
  const [selectedYear, setSelectedYear]           = useState(seasons[0]?.year || new Date().getFullYear());
  const [driverStandings, setDriverStandings]     = useState([]);
  const [constructorStandings, setConstructorStandings] = useState([]);
  const [loading, setLoading]                     = useState(false);

  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    Promise.all([
      db.driver_standings.listBySeason(selectedYear),
      db.constructor_standings.listBySeason(selectedYear),
    ]).then(([ds, cs]) => {
      setDriverStandings(ds.data || []);
      setConstructorStandings(cs.data || []);
      setLoading(false);
    });
  }, [selectedYear]);

  const getTeamColor = (teamName) => {
    const t = teams.find(t => t.name?.toLowerCase() === teamName?.toLowerCase());
    return t?.team_color || 'rgba(255,255,255,0.4)';
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>

      {/* Title */}
      <div style={{ padding: '12px 16px 10px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 15, color: '#fff', letterSpacing: '-0.01em', margin: 0 }}>
          Standings
        </h1>
      </div>

      {/* Season year pills */}
      <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {seasons.slice(0, 6).map(s => (
          <button key={s.id} onClick={() => setSelectedYear(s.year)} style={{
            padding: '4px 11px', borderRadius: 980, flexShrink: 0,
            background: selectedYear === s.year ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
            border: 'none', cursor: 'pointer',
            fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 11,
            color: selectedYear === s.year ? '#fff' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.15s',
          }}>
            {s.year}
          </button>
        ))}
      </div>

      {/* Drivers / Teams pill toggle */}
      <div style={{ display: 'flex', margin: '0 16px 16px', background: '#1a1a1a', borderRadius: 980, padding: 3 }}>
        {[{ id: 'drivers', label: 'Drivers' }, { id: 'teams', label: 'Teams' }].map(({ id, label }) => {
          const isActive = standingsTab === id;
          return (
            <button key={id} onClick={() => setStandingsTab(id)} style={{
              flex: 1, padding: '8px 0', borderRadius: 980, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em',
              background: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#000000' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <span className="spinner spinner-lg" />
        </div>
      ) : standingsTab === 'drivers' ? (
        <DriverStandingsList
          standings={driverStandings}
          teams={teams}
          getTeamColor={getTeamColor}
          onOpenDriver={onOpenDriver}
        />
      ) : (
        <TeamStandingsList
          standings={constructorStandings}
          teams={teams}
          getTeamColor={getTeamColor}
          onOpenTeam={onOpenTeam}
        />
      )}
    </div>
  );
}
