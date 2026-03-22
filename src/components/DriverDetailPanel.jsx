// src/components/DriverDetailPanel.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { db, driver_career } from '../lib/supabase';

function sum(nums) {
  return (nums || []).reduce((acc, n) => acc + (Number(n) || 0), 0);
}

const NATIONALITY_FLAGS = {
  British: '🇬🇧',
  German: '🇩🇪',
  Spanish: '🇪🇸',
  Finnish: '🇫🇮',
  Brazilian: '🇧🇷',
  French: '🇫🇷',
  Australian: '🇦🇺',
  Dutch: '🇳🇱',
  Mexican: '🇲🇽',
  Monegasque: '🇲🇨',
  Canadian: '🇨🇦',
  Italian: '🇮🇹',
  Thai: '🇹🇭',
  Japanese: '🇯🇵',
  Danish: '🇩🇰',
  Chinese: '🇨🇳',
  American: '🇺🇸',
  Swiss: '🇨🇭',
  Austrian: '🇦🇹',
  Argentine: '🇦🇷',
  'New Zealander': '🇳🇿',
  Polish: '🇵🇱',
};

function nationalityToFlag(nationality) {
  return NATIONALITY_FLAGS[nationality] || '🏳';
}

function InfoIcon({ children }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export default function DriverDetailPanel({ driverId, onClose, onOpenTeamDetail, mode = 'panel' }) {
  const [driver, setDriver] = useState(null);
  const [results, setResults] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const chartRef = useRef(null);

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
      if (d.error) { setError(d.error.message); setLoading(false); return; }
      if (rr.error) { setError(rr.error.message); setLoading(false); return; }
      if (ss.error) { setError(ss.error.message); setLoading(false); return; }
      setDriver(d.data);
      setResults(rr.data || []);
      setStandings(ss.data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [driverId]);

  const team = driver?.teams || null;
  const teamColor = team?.team_color || '#ffffff';

  const computed = useMemo(() => {
    const years = (results || []).map((r) => r.races?.season_year).filter(Boolean);
    const debutYear = years.length ? Math.min(...years) : null;
    const totalRaces = (results || []).length;
    const totalPoints = sum((results || []).map((r) => r.points));
    const totalWins = (results || []).filter((r) => r.position === 1).length;
    const totalPodiums = (results || []).filter((r) => r.position != null && r.position <= 3).length;
    const totalPoles = (results || []).filter((r) => r.grid_position === 1).length;
    const topTens = (results || []).filter((r) => r.position != null && r.position <= 10).length;
    const totalDNFs = (results || []).filter((r) => {
      const st = String(r.status || '');
      return st && !st.includes('Finished') && !st.includes('Lap');
    }).length;
    return { debutYear, totalRaces, totalPoints, totalWins, totalPodiums, totalPoles, topTens, totalDNFs };
  }, [results]);

  const championships = useMemo(() => (standings || []).filter((s) => Number(s.position) === 1).length, [standings]);

  const currentYear = new Date().getFullYear();
  const chartYear = useMemo(() => {
    const inCurrent = (results || []).some((r) => Number(r.races?.season_year) === Number(currentYear));
    if (inCurrent) return currentYear;
    const years = (results || []).map((r) => Number(r.races?.season_year)).filter(Boolean);
    return years.length ? Math.max(...years) : currentYear;
  }, [results, currentYear]);

  const currentSeasonResults = useMemo(() => {
    return (results || [])
      .filter((r) => Number(r.races?.season_year) === Number(chartYear))
      .slice()
      .sort((a, b) => (Number(a.races?.round) || 0) - (Number(b.races?.round) || 0));
  }, [results, chartYear]);

  const sortedResults = useMemo(() => {
    const list = [...(results || [])];
    list.sort((a, b) => new Date(a.races?.date || 0).getTime() - new Date(b.races?.date || 0).getTime());
    return list;
  }, [results]);
  const firstEntry = sortedResults[0] || null;
  const firstWin = sortedResults.find((r) => r.position === 1) || null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner spinner-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', padding: 20 }}>
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  if (!driver) return null;

  const flagEmoji = nationalityToFlag(driver.nationality);

  const infoRows = [
    {
      icon: (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          🚗
        </div>
      ),
      value: driver.number || '—',
      valueColor: teamColor,
      valueFontSize: 26,
      valueStyle: { fontStyle: 'italic', fontWeight: 900, letterSpacing: '-0.02em' },
      label: 'Driver Code',
      extra: (
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontWeight: 700,
            fontSize: 18,
            color: '#fff',
            letterSpacing: '0.04em',
            marginLeft: 8,
          }}
        >
          {driver.code || '—'}
        </span>
      ),
    },
    {
      icon: team?.logo_url ? (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
          }}
        >
          <img
            src={team.logo_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      ) : (
        <div style={{ width: 40, height: 40, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          🏎
        </div>
      ),
      value: team?.name || '—',
      label: 'Team',
      onClick: () => onOpenTeamDetail?.(team?.id),
      clickable: !!team?.id,
    },
    {
      icon: <InfoIcon>🏁</InfoIcon>,
      value: firstEntry ? `${firstEntry.races?.season_year} ${firstEntry.races?.name}` : '—',
      label: 'First Entry',
    },
    {
      icon: <InfoIcon>🥇</InfoIcon>,
      value: firstWin ? `${firstWin.races?.season_year} ${firstWin.races?.name}` : '—',
      label: 'First Win',
    },
    {
      icon: <InfoIcon>🏆</InfoIcon>,
      value: String(championships || 0).padStart(2, '0'),
      label: 'World Championships',
    },
    {
      icon: <InfoIcon>📅</InfoIcon>,
      value: driver.dob ? new Date(driver.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      label: 'Date of Birth',
    },
    {
      icon: (
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          {flagEmoji}
        </div>
      ),
      value: driver.nationality || '—',
      label: 'Country',
    },
  ];

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      {/* ── HERO ── */}
      <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#000', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: `radial-gradient(
              ellipse at 70% 30%,
              ${teamColor}60 0%,
              ${teamColor}20 35%,
              transparent 65%
            )`,
          }}
          aria-hidden="true"
        />

        <div
          style={{
            position: 'absolute',
            right: -40,
            bottom: '20%',
            width: 200,
            height: 200,
            zIndex: 0,
            background: 'radial-gradient(circle, rgba(255,160,0,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        {driver.image_url ? (
          <img
            src={driver.image_url}
            alt=""
            style={{
              position: 'absolute',
              right: -20,
              top: 0,
              height: '100%',
              width: '80%',
              objectFit: 'cover',
              objectPosition: 'top center',
              zIndex: 1,
              maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
            }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: 'linear-gradient(to right, rgba(0,0,0,0.88) 30%, rgba(0,0,0,0.15) 70%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        <button
          onClick={onClose}
          type="button"
          style={{
            position: 'relative',
            zIndex: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
            fontSize: 22,
            padding: '16px 20px',
            display: 'block',
          }}
          aria-label="Back"
        >
          ←
        </button>

        <div style={{ position: 'relative', zIndex: 10, padding: '4px 24px 32px' }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 38, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1, marginBottom: 2 }}>
            {driver.first_name}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 38, letterSpacing: '-0.03em', color: teamColor, lineHeight: 1, marginBottom: 8 }}>
            {driver.last_name}
          </div>

          <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 28 }}>
            Since Debut {computed.debutYear || '—'} - {new Date().getFullYear()}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 52, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {computed.totalRaces}
              </span>
              <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>GPs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 52, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {Math.round(computed.totalPoints)}
              </span>
              <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>PTS</span>
            </div>
          </div>

          {[
            { icon: '🏆', value: computed.totalWins, label: 'Wins' },
            { icon: '📊', value: computed.totalPodiums, label: 'Podiums' },
            { icon: '🎯', value: computed.totalPoles, label: 'Poles' },
            { icon: '↑', value: computed.topTens, label: 'Top 10s' },
            { icon: '⊘', value: computed.totalDNFs, label: 'DNFs' },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
                {icon}
              </div>
              <span style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.02em', minWidth: 48 }}>
                {String(value ?? 0).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                {label}
              </span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              onClick={() => chartRef.current?.scrollIntoView({ behavior: 'smooth' })}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: 'none',
                borderRadius: 980,
                padding: '12px 22px',
                cursor: 'pointer',
                fontFamily: 'var(--sans)',
                fontWeight: 600,
                fontSize: 14,
                color: '#fff',
              }}
            >
              <span aria-hidden="true">📊</span> Timeline
            </button>
          </div>
        </div>
      </div>

      {/* ── BAR CHART ── */}
      <div ref={chartRef} style={{ background: '#000', padding: '24px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: 160,
              marginRight: 8,
              flexShrink: 0,
              paddingBottom: 20,
            }}
          >
            {[25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0].map((v) => (
              <span key={v} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>
                {v}
              </span>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 3 }}>
              {currentSeasonResults.map((r, i) => {
                const pts = parseFloat(r.points || 0);
                const maxPts = 25;
                const h = Math.max((pts / maxPts) * 130, pts > 0 ? 4 : 2);
                return (
                  <div
                    key={`${r.id}-${i}`}
                    style={{
                      flex: 1,
                      minWidth: 6,
                      height: h,
                      background: pts > 0 ? teamColor : 'rgba(255,255,255,0.1)',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.4s ease',
                    }}
                  />
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 3, marginTop: 4, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--sans)', fontSize: 9, color: 'rgba(255,255,255,0.35)', marginRight: 4, flexShrink: 0 }}>
                Rounds
              </span>
              {currentSeasonResults.map((r, i) => (
                <span key={`${r.id}-round-${i}`} style={{ flex: 1, minWidth: 6, fontFamily: 'var(--mono)', fontSize: 7, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                  {String(r.races?.round || i + 1).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── INFO ROWS ── */}
      <div style={{ background: '#000', paddingTop: 8 }}>
        {infoRows.map((row, idx) => (
          <div
            key={idx}
            onClick={row.onClick}
            role={row.clickable ? 'button' : undefined}
            tabIndex={row.clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (!row.clickable) return;
              if (e.key === 'Enter' || e.key === ' ') row.onClick?.();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              cursor: row.clickable ? 'pointer' : 'default',
              transition: row.clickable ? 'background 0.15s' : 'none',
            }}
            onMouseEnter={(e) => {
              if (row.clickable) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
            onMouseLeave={(e) => {
              if (row.clickable) e.currentTarget.style.background = 'transparent';
            }}
          >
            {row.icon}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: 'var(--sans)',
                  fontWeight: 700,
                  fontSize: row.valueFontSize || 17,
                  color: row.valueColor || '#fff',
                  letterSpacing: '-0.01em',
                  ...(row.valueStyle || {}),
                }}
              >
                {row.value}
                {row.extra}
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {row.label}
              </div>
            </div>
            {row.clickable ? <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }} aria-hidden="true">›</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

