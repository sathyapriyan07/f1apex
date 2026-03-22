// src/components/DriverDetailPanel.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { db, driver_career } from '../lib/supabase';

function sum(arr) { return arr.reduce((a, b) => a + (Number(b) || 0), 0); }

export default function DriverDetailPanel({ driverId, onClose, onOpenTeamDetail, mode = 'panel' }) {
  const [driver, setDriver] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activePage, setActivePage] = useState(0); // 0 hero, 1 chart + info
  const scrollRef = useRef(null);
  const touchStartX = useRef(null);

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
    scrollRef.current?.scrollTo?.({ top: 0, left: 0, behavior: 'instant' });
  }, [activePage]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      const [d, rr] = await Promise.all([
        db.drivers.byId(driverId),
        driver_career.results(driverId),
      ]);
      if (!alive) return;
      if (d.error) { setError(d.error.message); setLoading(false); return; }
      if (rr.error) { setError(rr.error.message); setLoading(false); return; }
      setDriver(d.data);
      setResults(rr.data || []);
      setLoading(false);
      setActivePage(0);
    })();
    return () => { alive = false; };
  }, [driverId]);

  const team = driver?.teams || null;
  const teamColor = team?.team_color || '#ffffff';

  const computed = useMemo(() => {
    const totalRaces = results.length;
    const totalPoints = sum(results.map((r) => r.points));
    const totalWins = results.filter((r) => r.position === 1).length;
    const totalPodiums = results.filter((r) => r.position != null && r.position <= 3).length;
    const topTens = results.filter((r) => r.position != null && r.position <= 10).length;
    const years = results.map((r) => r.races?.season_year).filter(Boolean);
    const debutYear = years.length ? Math.min(...years) : (driver?.dob ? Number(String(driver.dob).slice(0, 4)) : null);
    const latestYear = years.length ? Math.max(...years) : null;
    return { totalRaces, totalPoints, totalWins, totalPodiums, topTens, debutYear, latestYear };
  }, [results, driver?.dob]);

  const currentYear = new Date().getFullYear();
  const chartYear = useMemo(() => {
    const inCurrent = results.some((r) => Number(r.races?.season_year) === Number(currentYear));
    return inCurrent ? currentYear : (computed.latestYear || currentYear);
  }, [results, computed.latestYear, currentYear]);

  const currentSeasonResults = useMemo(() => {
    return results
      .filter((r) => Number(r.races?.season_year) === Number(chartYear))
      .slice()
      .sort((a, b) => (Number(a.races?.round) || 0) - (Number(b.races?.round) || 0));
  }, [results, chartYear]);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (e) => {
    const start = touchStartX.current;
    const end = e.changedTouches?.[0]?.clientX ?? null;
    touchStartX.current = null;
    if (start == null || end == null) return;
    const dx = end - start;
    if (Math.abs(dx) < 44) return;
    if (dx < 0) setActivePage((p) => Math.min(1, p + 1));
    else setActivePage((p) => Math.max(0, p - 1));
  };

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

  return (
    <div
      ref={scrollRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#000',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Back arrow — bare */}
      <button
        onClick={onClose}
        type="button"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 30,
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

      {/* Slider */}
      <div
        style={{
          display: 'flex',
          width: '200%',
          transform: `translateX(-${activePage * 50}%)`,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Page 1: Hero */}
        <div
          style={{
            width: '100%',
            minHeight: '100vh',
            background: '#000',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background: `radial-gradient(
                ellipse at 70% 30%,
                ${teamColor}60 0%,
                ${teamColor}20 30%,
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
              background: 'radial-gradient(circle, rgba(255,180,0,0.25) 0%, transparent 70%)',
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
                height: '85%',
                width: '75%',
                objectFit: 'cover',
                objectPosition: 'top center',
                zIndex: 1,
                maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
              }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : null}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              background: 'linear-gradient(to right, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.2) 70%, transparent 100%)',
            }}
            aria-hidden="true"
          />

          <div style={{ position: 'relative', zIndex: 10, padding: '56px 24px 32px' }}>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 900,
                fontSize: 38,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                lineHeight: 1,
                marginBottom: 2,
              }}
            >
              {driver.first_name}
            </div>
            <div
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 900,
                fontSize: 38,
                letterSpacing: '-0.03em',
                color: teamColor,
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {driver.last_name}
            </div>

            <div
              style={{
                fontFamily: 'var(--sans)',
                fontWeight: 600,
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
                marginBottom: 28,
              }}
            >
              Since Debut {computed.debutYear || '—'} - {new Date().getFullYear()}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 52, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1 }}>
                  {computed.totalRaces}
                </span>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>GPs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 52, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1 }}>
                  {Math.round(computed.totalPoints)}
                </span>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>PTS</span>
              </div>
            </div>

            {[
              { icon: '🏆', value: computed.totalWins, label: 'Wins' },
              { icon: '📊', value: computed.totalPodiums, label: 'Podiums' },
              { icon: '🎯', value: 0, label: 'Poles' },
              { icon: '↑', value: computed.topTens, label: 'Top 10s' },
            ].map(({ icon, value, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: icon === '↑' ? 18 : 16, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
                  {icon}
                </div>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.02em', minWidth: 36 }}>
                  {String(value).padStart(2, '0')}
                </span>
                <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                  {label}
                </span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setActivePage(1)}
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
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                <span style={{ fontSize: 16 }} aria-hidden="true">📊</span>
                Timeline
              </button>
            </div>
          </div>
        </div>

        {/* Page 2: Chart + info */}
        <div style={{ width: '100%', minHeight: '100vh', background: '#000', paddingBottom: 100 }}>
          <div style={{ display: 'flex', gap: 6, padding: '16px 20px 8px', background: '#000' }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  width: i === activePage ? 16 : 8,
                  height: 8,
                  borderRadius: 980,
                  background: i === activePage ? teamColor : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>

          <div style={{ background: '#000', padding: '8px 20px 24px' }}>
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
                  <span key={v} style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>
                    {v}
                  </span>
                ))}
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 3 }}>
                  {currentSeasonResults.map((r, i) => {
                    const pts = parseFloat(r.points || 0);
                    const maxPts = 25;
                    const barH = Math.max((pts / maxPts) * 130, pts > 0 ? 4 : 2);
                    return (
                      <div
                        key={`${r.id}-${i}`}
                        style={{
                          flex: 1,
                          minWidth: 6,
                          height: barH,
                          background: pts > 0 ? teamColor : 'rgba(255,255,255,0.1)',
                          borderRadius: '2px 2px 0 0',
                          transition: 'height 0.4s ease',
                        }}
                        title={`${pts} pts`}
                      />
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--sans)', color: 'rgba(255,255,255,0.4)', marginRight: 4, flexShrink: 0, fontSize: 9 }}>
                    Rounds
                  </span>
                  {currentSeasonResults.map((r, i) => (
                    <span key={`${r.id}-round-${i}`} style={{ flex: 1, minWidth: 6, fontFamily: 'var(--mono)', fontSize: 7, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                      {String(r.races?.round || i + 1).padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#000', padding: '0 0 100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 52, letterSpacing: '-0.04em', color: teamColor, lineHeight: 1, minWidth: 80 }}>
                {driver.number || '—'}
              </div>

              <div>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '0.04em' }}>
                  {driver.code || '—'}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  Driver Code
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                cursor: team?.id ? 'pointer' : 'default',
              }}
              role={team?.id ? 'button' : undefined}
              tabIndex={team?.id ? 0 : undefined}
              onClick={() => (team?.id ? onOpenTeamDetail?.(team.id) : null)}
              onKeyDown={(e) => {
                if (!team?.id) return;
                if (e.key === 'Enter' || e.key === ' ') onOpenTeamDetail?.(team.id);
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 8 }}>
                {team?.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: teamColor }}>
                    {team?.name?.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, color: '#fff', letterSpacing: '-0.01em' }}>
                  {team?.name || '—'}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  Team
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page dots (overlay) */}
      <div
        style={{
          position: 'fixed',
          left: 20,
          bottom: 74,
          zIndex: 40,
          display: 'flex',
          gap: 6,
          pointerEvents: 'auto',
        }}
      >
        {[0, 1].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActivePage(i)}
            aria-label={i === 0 ? 'Hero page' : 'Timeline page'}
            style={{
              width: i === activePage ? 16 : 8,
              height: 8,
              borderRadius: 980,
              background: i === activePage ? teamColor : 'rgba(255,255,255,0.2)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

