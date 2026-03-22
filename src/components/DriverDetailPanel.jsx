// src/components/DriverDetailPanel.jsx
import { useEffect, useMemo, useState } from 'react';
import { db, driver_career } from '../lib/supabase';

const NATIONALITY_FLAGS = {
  British: '\u{1F1EC}\u{1F1E7}',
  German: '\u{1F1E9}\u{1F1EA}',
  Spanish: '\u{1F1EA}\u{1F1F8}',
  Finnish: '\u{1F1EB}\u{1F1EE}',
  Brazilian: '\u{1F1E7}\u{1F1F7}',
  French: '\u{1F1EB}\u{1F1F7}',
  Australian: '\u{1F1E6}\u{1F1FA}',
  Dutch: '\u{1F1F3}\u{1F1F1}',
  Mexican: '\u{1F1F2}\u{1F1FD}',
  Monegasque: '\u{1F1F2}\u{1F1E8}',
  Canadian: '\u{1F1E8}\u{1F1E6}',
  Italian: '\u{1F1EE}\u{1F1F9}',
  Thai: '\u{1F1F9}\u{1F1ED}',
  Japanese: '\u{1F1EF}\u{1F1F5}',
  Danish: '\u{1F1E9}\u{1F1F0}',
  Chinese: '\u{1F1E8}\u{1F1F3}',
  American: '\u{1F1FA}\u{1F1F8}',
  Swiss: '\u{1F1E8}\u{1F1ED}',
  Austrian: '\u{1F1E6}\u{1F1F9}',
  Argentine: '\u{1F1E6}\u{1F1F7}',
  'New Zealander': '\u{1F1F3}\u{1F1FF}',
  Polish: '\u{1F1F5}\u{1F1F1}',
};

function nationalityToFlag(nationality) {
  return NATIONALITY_FLAGS[nationality] || '\u{1F3F3}';
}

function displayNationalityName(nationality) {
  if (!nationality) return '—';
  if (nationality === 'British') return 'United Kingdom';
  if (nationality === 'Dutch') return 'Netherlands';
  return nationality;
}

const PLACE_OF_BIRTH = {
  British: "King's Lynn, England",
  German: 'Hürth, Germany',
  Spanish: 'Oviedo, Spain',
  Finnish: 'Vantaa, Finland',
  Brazilian: 'São Paulo, Brazil',
  Dutch: 'Hasselt, Belgium',
  French: 'Rouen, France',
  Australian: 'Brisbane, Australia',
  Mexican: 'Guadalajara, Mexico',
  Monegasque: 'Monte Carlo, Monaco',
  Italian: 'Rome, Italy',
  Thai: 'Bangkok, Thailand',
};

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = Number(n) % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

function DriverHero({ driver, team, teamColor, onClose }) {
  const strokeColor =
    String(teamColor || '')
      .toLowerCase()
      .trim() === '#27f4d2'
      ? 'rgba(0,0,0,0.2)'
      : 'rgba(255,255,255,0.2)';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${teamColor} 0%, ${teamColor}dd 60%, #0a0a0a 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -45%)',
          fontFamily: 'var(--sans)',
          fontWeight: 900,
          fontSize: 'clamp(200px, 55vw, 320px)',
          lineHeight: 1,
          letterSpacing: '-0.05em',
          WebkitTextStroke: `3px ${strokeColor}`,
          color: 'transparent',
          zIndex: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {driver.number || '00'}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          zIndex: 2,
        }}
        aria-hidden="true"
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 80,
              background: 'rgba(255,255,255,0.5)',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
            }}
          />
        ))}
      </div>

      {driver.image_url ? (
        <img
          src={driver.image_url}
          alt=""
          style={{
            position: 'absolute',
            bottom: '12%',
            left: '50%',
            transform: 'translateX(-50%)',
            height: '75%',
            width: 'auto',
            objectFit: 'contain',
            objectPosition: 'bottom center',
            zIndex: 3,
            maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          zIndex: 4,
          background: 'linear-gradient(to top, #0a0a0a 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          left: 20,
          zIndex: 10,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'white',
          fontSize: 22,
          padding: 0,
        }}
        aria-label="Back"
      >
        ←
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: '18%',
          left: 0,
          right: 0,
          zIndex: 5,
          textAlign: 'center',
          padding: '0 20px',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(32px, 9vw, 52px)',
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
          }}
        >
          {driver.first_name}
        </div>

        <div
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 'clamp(44px, 13vw, 72px)',
            color: '#fff',
            lineHeight: 0.9,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
          }}
        >
          {driver.last_name}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginTop: 12,
            fontFamily: 'var(--sans)',
            fontWeight: 600,
            fontSize: 14,
            color: '#fff',
          }}
        >
          <span>{nationalityToFlag(driver.nationality)}</span>
          <span>{displayNationalityName(driver.nationality)}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>|</span>
          <span>{team?.name || '—'}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>|</span>
          <span>{driver.number || '—'}</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '6%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          display: 'flex',
          gap: 6,
        }}
        aria-hidden="true"
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 52,
              background: 'rgba(255,255,255,0.7)',
              clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SeasonStats({ results, standings, year }) {
  const seasonResults = (results || []).filter(
    (r) => Number(r.races?.season_year) === Number(year) && !r.races?.sprint,
  );
  const sprintResults = (results || []).filter(
    (r) => Number(r.races?.season_year) === Number(year) && Boolean(r.races?.sprint),
  );
  const seasonStanding = (standings || []).find((s) => Number(s.season_year) === Number(year));

  const gpRaces = seasonResults.length;
  const gpPoints = seasonResults.reduce((s, r) => s + parseFloat(r.points || 0), 0);
  const gpWins = seasonResults.filter((r) => r.position === 1).length;
  const gpPodiums = seasonResults.filter((r) => r.position && r.position <= 3).length;
  const gpPoles = seasonResults.filter((r) => r.grid_position === 1).length;
  const gpTop10s = seasonResults.filter((r) => r.position && r.position <= 10).length;
  const gpFL = seasonResults.filter((r) => r.fastest_lap).length;
  const gpDNFs = seasonResults.filter(
    (r) => r.status && !String(r.status).includes('Finish') && !String(r.status).includes('Lap'),
  ).length;

  const spRaces = sprintResults.length;
  const spPoints = sprintResults.reduce((s, r) => s + parseFloat(r.points || 0), 0);
  const spWins = sprintResults.filter((r) => r.position === 1).length;
  const spPodiums = sprintResults.filter((r) => r.position && r.position <= 3).length;
  const spPoles = sprintResults.filter((r) => r.grid_position === 1).length;
  const spTop10s = sprintResults.filter((r) => r.position && r.position <= 10).length;

  const StatRow = ({ left, right }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
        marginBottom: 20,
      }}
    >
      {[left, right].map((stat, i) => (
        <div key={i} style={{ paddingRight: i === 0 ? 16 : 0 }}>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 400,
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 4,
            }}
          >
            {stat.label}
          </div>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 900,
              fontSize: 36,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {stat.value ?? 0}
          </div>
        </div>
      ))}
    </div>
  );

  const Divider = () => (
    <div
      style={{
        height: 1,
        background: 'rgba(255,255,255,0.12)',
        margin: '4px 0 24px',
      }}
    />
  );

  return (
    <div style={{ background: '#0a0a0a', padding: '20px 20px 8px' }}>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontWeight: 900,
          fontSize: 20,
          letterSpacing: '-0.01em',
          textTransform: 'uppercase',
          color: '#fff',
          marginBottom: 20,
        }}
      >
        {year} SEASON
      </div>

      <StatRow
        left={{
          label: 'Season Position',
          value: seasonStanding?.position ? `${seasonStanding.position}${ordinal(seasonStanding.position)}` : '—',
        }}
        right={{
          label: 'Season Points',
          value: seasonStanding?.points ?? gpPoints,
        }}
      />
      <Divider />

      <StatRow
        left={{ label: 'Grand Prix Races', value: gpRaces }}
        right={{ label: 'Grand Prix Points', value: Math.round(gpPoints) }}
      />
      <StatRow left={{ label: 'Grand Prix Wins', value: gpWins }} right={{ label: 'Grand Prix Podiums', value: gpPodiums }} />
      <StatRow left={{ label: 'Grand Prix Poles', value: gpPoles }} right={{ label: 'Grand Prix Top 10s', value: gpTop10s }} />
      <StatRow left={{ label: 'DHL Fastest Laps', value: gpFL }} right={{ label: 'DNFs', value: gpDNFs }} />
      <Divider />

      {spRaces > 0 ? (
        <>
          <StatRow left={{ label: 'Sprint Races', value: spRaces }} right={{ label: 'Sprint Points', value: Math.round(spPoints) }} />
          <StatRow left={{ label: 'Sprint Wins', value: spWins }} right={{ label: 'Sprint Podiums', value: spPodiums }} />
          <StatRow left={{ label: 'Sprint Poles', value: spPoles }} right={{ label: 'Sprint Top 10s', value: spTop10s }} />
          <Divider />
        </>
      ) : null}
    </div>
  );
}

function CareerStats({ results, standings }) {
  const bestFinish = (results || []).reduce((b, r) => (r.position && (!b || r.position < b) ? r.position : b), null);
  const bestFinishCount = bestFinish ? (results || []).filter((r) => r.position === bestFinish).length : 0;
  const bestGrid = (results || []).reduce((b, r) => (r.grid_position && (!b || r.grid_position < b) ? r.grid_position : b), null);
  const bestGridCount = bestGrid ? (results || []).filter((r) => r.grid_position === bestGrid).length : 0;

  const totalRaces = (results || []).length;
  const totalPoints = (results || []).reduce((s, r) => s + parseFloat(r.points || 0), 0);
  const totalPodiums = (results || []).filter((r) => r.position && r.position <= 3).length;
  const totalPoles = (results || []).filter((r) => r.grid_position === 1).length;
  const championships = (standings || []).filter((s) => Number(s.position) === 1).length;
  const totalDNFs = (results || []).filter(
    (r) => r.status && !String(r.status).includes('Finish') && !String(r.status).includes('Lap'),
  ).length;

  const rows = [
    { label: 'Grand Prix Entered', value: totalRaces },
    { label: 'Career Points', value: Math.round(totalPoints) },
    { label: 'Highest Race Finish', value: bestFinish ? `${bestFinish} (x${bestFinishCount})` : '—' },
    { label: 'Podiums', value: totalPodiums },
    { label: 'Highest Grid Position', value: bestGrid ? `${bestGrid} (x${bestGridCount})` : '—' },
    { label: 'Pole Positions', value: totalPoles },
    { label: 'World Championships', value: championships },
    { label: 'DNFs', value: totalDNFs },
  ];

  return (
    <div style={{ background: '#0a0a0a', padding: '0 20px 24px' }}>
      <div
        style={{
          background: '#131313',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ padding: '16px 20px 12px' }}>
          <div
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 900,
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              color: '#fff',
            }}
          >
            CAREER STATS
          </div>
        </div>

        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              {row.label}
            </span>
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 24, color: '#fff', letterSpacing: '-0.02em' }}>
              {row.value ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StripeDivider() {
  return (
    <div style={{ background: '#0a0a0a', padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          width: '100%',
          height: 14,
          background: 'var(--red)',
          clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)',
          marginBottom: 0,
        }}
      />
    </div>
  );
}

function Biography({ driver }) {
  const dob = driver?.dob
    ? new Date(driver.dob)
        .toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(/\//g, '/')
    : '—';

  const placeOfBirth = PLACE_OF_BIRTH[driver?.nationality] || driver?.nationality || '—';

  return (
    <div style={{ background: '#0a0a0a', padding: '24px 20px 40px' }}>
      <div
        style={{
          fontFamily: 'var(--sans)',
          fontWeight: 900,
          fontSize: 28,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          color: '#fff',
          marginBottom: 24,
        }}
      >
        BIOGRAPHY
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 16px' }}>
        {[
          { label: 'Date of Birth', value: dob },
          { label: 'Place of Birth', value: placeOfBirth },
          { label: 'Nationality', value: driver?.nationality || '—' },
          { label: 'Car Number', value: driver?.number || '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 400,
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                marginBottom: 6,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 700,
                fontSize: 20,
                color: '#fff',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              {value}
            </div>
          </div>
        ))}
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
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
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
      if (d.error) {
        setError(d.error.message);
        setLoading(false);
        return;
      }
      if (rr.error) {
        setError(rr.error.message);
        setLoading(false);
        return;
      }
      if (ss.error) {
        setError(ss.error.message);
        setLoading(false);
        return;
      }
      setDriver(d.data);
      setResults(rr.data || []);
      setStandings(ss.data || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [driverId]);

  const team = driver?.teams || null;
  const teamColor = team?.team_color || '#e8002d';

  const currentYear = new Date().getFullYear();
  const statsYear = useMemo(() => {
    const hasCurrent = (results || []).some((r) => Number(r.races?.season_year) === Number(currentYear));
    if (hasCurrent) return currentYear;
    const years = (results || []).map((r) => Number(r.races?.season_year)).filter(Boolean);
    return years.length ? Math.max(...years) : currentYear;
  }, [results, currentYear]);

  // Keep prop for compatibility with existing callers.
  void onOpenTeamDetail;

  if (!driverId) return null;

  if (loading) {
    return (
      <div
        style={{
          background: '#0a0a0a',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 80,
        }}
      >
        <div style={{ fontFamily: 'var(--sans)', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Loading driver…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 20, paddingBottom: 80 }}>
        <div style={{ fontFamily: 'var(--sans)', color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 10 }}>Couldn’t load driver</div>
        <div style={{ fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{error}</div>
      </div>
    );
  }

  if (!driver) return null;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', paddingBottom: 80 }}>
      <DriverHero driver={driver} team={team} teamColor={teamColor} onClose={onClose} />

      <div style={{ background: '#0a0a0a', padding: '24px 20px 8px' }}>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 28, letterSpacing: '-0.01em', textTransform: 'uppercase', color: '#fff' }}>
          STATISTICS
        </div>
      </div>

      <SeasonStats results={results} standings={standings} year={statsYear} />
      <CareerStats results={results} standings={standings} />
      <StripeDivider />
      <Biography driver={driver} />
    </div>
  );
}
