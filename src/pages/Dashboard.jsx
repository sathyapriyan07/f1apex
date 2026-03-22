// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(dateStr) {
  const [cd, setCd] = useState({ days: 0, hrs: 0, min: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(dateStr) - new Date();
      if (diff <= 0) return;
      setCd({
        days: Math.floor(diff / 86400000),
        hrs:  Math.floor((diff % 86400000) / 3600000),
        min:  Math.floor((diff % 3600000) / 60000),
      });
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [dateStr]);
  return cd;
}

// ── Podium strips ─────────────────────────────────────────────────────────────
function PodiumStrips({ topThree, teams }) {
  if (!topThree.length) return null;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {topThree.map(result => {
        const team = teams.find(t => t.name === result.teams?.name || t.id === result.team_id);
        const teamColor = team?.team_color || '#fff';
        return (
          <div key={result.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', gap: 1.5 }}>
              {[0.9, 0.6, 0.35].map((op, i) => (
                <div key={i} style={{
                  width: 3, height: 13, background: teamColor,
                  opacity: op, borderRadius: 1, transform: 'skewX(-12deg)',
                }} />
              ))}
            </div>
            <span style={{
              fontFamily: 'var(--mono)', fontWeight: 700,
              fontSize: 11, color: '#fff', letterSpacing: '0.04em',
            }}>
              {result.drivers?.code || '???'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Upcoming Hero ─────────────────────────────────────────────────────────────
function UpcomingHero({ race, handleSetTab }) {
  const cd = useCountdown(race.date);
  const accentColor = '#e8002d';

  const d = new Date(race.date);
  const dayEnd   = d.getDate();
  const dayStart = dayEnd - 2;
  const month    = d.toLocaleDateString('en-GB', { month: 'short' });
  const dateRange = `${dayStart} – ${dayEnd} ${month}`;

  return (
    <div style={{
      margin: '0 16px',
      background: 'linear-gradient(135deg, #1a0a0a 0%, #0d0d0d 100%)',
      borderRadius: 16, padding: '20px', position: 'relative',
      overflow: 'hidden', minHeight: 240,
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 80% 50%, rgba(180,0,0,0.25) 0%, transparent 60%)',
      }} />

      {race.circuits?.layout_url && (
        <img src={race.circuits.layout_url} alt=""
          style={{
            position: 'absolute', right: -10, top: '50%',
            transform: 'translateY(-50%)',
            height: 160, width: 'auto', objectFit: 'contain',
            zIndex: 1, opacity: 0.9,
          }}
          onError={e => e.target.style.display = 'none'}
        />
      )}

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '60%' }}>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 600,
          fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4,
        }}>
          Round {String(race.round).padStart(2, '0')}
        </div>

        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 900,
          fontSize: 24, color: '#fff',
          letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4,
        }}>
          {race.name?.replace('Grand Prix', 'GP')}
        </div>

        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 600,
          fontSize: 13, color: accentColor, marginBottom: 4,
        }}>
          {race.circuits?.locality || race.circuits?.name?.split(' ')[0] || '—'}
        </div>

        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 500,
          fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 18,
        }}>
          {dateRange}
        </div>

        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 500,
          fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8,
        }}>
          Race starts in
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          {[[cd.days, 'Days'], [cd.hrs, 'Hours'], [cd.min, 'Mins']].map(([val, label]) => (
            <div key={label}>
              <div style={{
                fontFamily: 'var(--sans)', fontWeight: 900,
                fontSize: 32, color: accentColor,
                letterSpacing: '-0.03em', lineHeight: 1,
              }}>
                {String(val).padStart(2, '0')}
              </div>
              <div style={{
                fontFamily: 'var(--sans)', fontWeight: 400,
                fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3,
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => handleSetTab?.('races')} style={{
        position: 'absolute', bottom: 18, right: 18, zIndex: 3,
        display: 'flex', alignItems: 'center', gap: 7,
        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
        border: 'none', borderRadius: 980, padding: '8px 14px',
        cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 600,
        fontSize: 13, color: '#fff',
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
        }}>→</span>
        Schedule
      </button>
    </div>
  );
}

// ── Past Hero ─────────────────────────────────────────────────────────────────
function PastHero({ race, teams, onViewResults }) {
  const [topThree, setTopThree] = useState([]);

  useEffect(() => {
    if (!race?.id) return;
    db.race_results.listByRace(race.id).then(({ data }) => {
      setTopThree(
        (data || []).filter(r => r.position && r.position <= 3).sort((a, b) => a.position - b.position)
      );
    });
  }, [race?.id]);

  return (
    <div style={{
      margin: '0 16px', background: '#111', borderRadius: 16,
      padding: '20px', position: 'relative', overflow: 'hidden', minHeight: 180,
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse at 80% 40%, rgba(80,80,80,0.15) 0%, transparent 60%)',
      }} />

      {race.circuits?.layout_url && (
        <img src={race.circuits.layout_url} alt=""
          style={{
            position: 'absolute', right: -10, top: '50%',
            transform: 'translateY(-50%)',
            height: 140, width: 'auto', objectFit: 'contain',
            zIndex: 1, opacity: 0.5,
            filter: 'brightness(0) invert(1)',
          }}
          onError={e => e.target.style.display = 'none'}
        />
      )}

      <div style={{ position: 'relative', zIndex: 2, maxWidth: '65%' }}>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 600,
          fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4,
        }}>
          Round {String(race.round).padStart(2, '0')}
        </div>

        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 900,
          fontSize: 24, color: '#fff',
          letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4,
        }}>
          {race.name?.replace('Grand Prix', 'GP')}
        </div>

        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 500,
          fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 14,
        }}>
          {race.circuits?.locality || '—'}
        </div>

        <PodiumStrips topThree={topThree} teams={teams} />

        <button onClick={() => onViewResults?.(race.id)} style={{
          display: 'flex', alignItems: 'center', gap: 7, marginTop: 14,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
          border: 'none', borderRadius: 980, padding: '8px 14px',
          cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 600,
          fontSize: 13, color: '#fff',
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
          }}>→</span>
          Results
        </button>
      </div>
    </div>
  );
}

// ── Upcoming Race Row ─────────────────────────────────────────────────────────
function UpcomingRaceRow({ race, isLast, onClick }) {
  const d   = new Date(race.date);
  const day = d.getDate();
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });

  return (
    <div onClick={onClick} style={{
      display: 'grid', gridTemplateColumns: '44px 1fr auto 22px',
      alignItems: 'center', padding: '12px 20px', gap: 12,
      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)',
      cursor: 'pointer', transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 800,
          fontSize: 18, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em',
        }}>
          {String(day).padStart(2, '0')}
        </div>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 500,
          fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2,
        }}>
          {mon}
        </div>
      </div>

      <div>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 700,
          fontSize: 14, color: '#fff', letterSpacing: '-0.01em', marginBottom: 2,
        }}>
          {race.name?.replace('Grand Prix', 'GP')}
        </div>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 500,
          fontSize: 11, color: 'rgba(255,255,255,0.4)',
        }}>
          R{String(race.round).padStart(2, '0')} · {race.circuits?.locality || race.circuits?.country || '—'}
        </div>
      </div>

      <div style={{ width: 56, height: 36, flexShrink: 0 }}>
        {race.circuits?.layout_url && (
          <img src={race.circuits.layout_url} alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              filter: 'brightness(0) invert(1) opacity(0.45)',
            }}
            onError={e => e.target.style.display = 'none'}
          />
        )}
      </div>

      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>›</span>
    </div>
  );
}

// ── Past Race Row ─────────────────────────────────────────────────────────────
function PastRaceRow({ race, teams, isLast, onClick }) {
  const [topThree, setTopThree] = useState([]);

  useEffect(() => {
    if (!race?.id) return;
    db.race_results.listByRace(race.id).then(({ data }) => {
      setTopThree(
        (data || []).filter(r => r.position && r.position <= 3).sort((a, b) => a.position - b.position)
      );
    });
  }, [race?.id]);

  return (
    <div onClick={onClick} style={{
      display: 'grid', gridTemplateColumns: '60px 1fr 22px',
      alignItems: 'center', padding: '12px 20px', gap: 12,
      borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)',
      cursor: 'pointer', transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ width: 52, height: 40, flexShrink: 0 }}>
        {race.circuits?.layout_url ? (
          <img src={race.circuits.layout_url} alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              filter: 'brightness(0) invert(1) opacity(0.25)',
            }}
            onError={e => e.target.style.display = 'none'}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
        )}
      </div>

      <div>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 700,
          fontSize: 14, color: '#fff', letterSpacing: '-0.01em', marginBottom: 2,
        }}>
          {race.name?.replace('Grand Prix', 'GP')}
        </div>
        <div style={{
          fontFamily: 'var(--sans)', fontWeight: 500,
          fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6,
        }}>
          R{String(race.round).padStart(2, '0')} · {race.circuits?.locality || '—'}
        </div>
        <PodiumStrips topThree={topThree} teams={teams} />
      </div>

      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>›</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Dashboard({ setTab, races = [], seasons = [], teams = [], drivers = [], onOpenRaceResult }) {
  const [scheduleTab, setScheduleTab] = useState('upcoming');

  const today = new Date();
  const upcoming = [...races]
    .filter(r => r.date && new Date(r.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const past = [...races]
    .filter(r => r.date && new Date(r.date) < today)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const featured  = scheduleTab === 'upcoming' ? upcoming[0]    : past[0];
  const listRaces = scheduleTab === 'upcoming' ? upcoming.slice(1) : past.slice(1);

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>

      {/* Title */}
      <div style={{ padding: '16px 20px 12px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--sans)', fontWeight: 500,
          fontSize: 18, color: '#fff', letterSpacing: '-0.01em', margin: 0,
        }}>
          Schedule
        </h1>
      </div>

      {/* Pill toggle */}
      <div style={{
        display: 'flex', margin: '0 16px 16px',
        background: '#1a1a1a', borderRadius: 980, padding: 3,
      }}>
        {[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past' }].map(({ id, label }) => {
          const isActive = scheduleTab === id;
          return (
            <button key={id} onClick={() => setScheduleTab(id)} style={{
              flex: 1, padding: '8px 0', borderRadius: 980,
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontWeight: 600,
              fontSize: 13, letterSpacing: '-0.01em',
              background: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#000' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Featured hero */}
      {featured && (
        scheduleTab === 'upcoming'
          ? <UpcomingHero race={featured} teams={teams} handleSetTab={setTab} />
          : <PastHero race={featured} teams={teams} onViewResults={onOpenRaceResult} />
      )}

      {/* List */}
      {listRaces.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            padding: '0 20px 10px',
            fontFamily: 'var(--sans)', fontWeight: 700,
            fontSize: 15, color: '#fff', letterSpacing: '-0.01em',
          }}>
            {scheduleTab === 'upcoming' ? 'Upcoming Races' : 'Past Races'}
          </div>

          {scheduleTab === 'upcoming'
            ? listRaces.map((race, i) => (
                <UpcomingRaceRow
                  key={race.id} race={race} teams={teams}
                  isLast={i === listRaces.length - 1}
                  onClick={() => setTab?.('races')}
                />
              ))
            : listRaces.map((race, i) => (
                <PastRaceRow
                  key={race.id} race={race} teams={teams}
                  isLast={i === listRaces.length - 1}
                  onClick={() => onOpenRaceResult?.(race.id)}
                />
              ))
          }
        </div>
      )}

      {!featured && !listRaces.length && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          fontFamily: 'var(--sans)', fontSize: 13, color: 'rgba(255,255,255,0.3)',
        }}>
          No {scheduleTab} races
        </div>
      )}
    </div>
  );
}
