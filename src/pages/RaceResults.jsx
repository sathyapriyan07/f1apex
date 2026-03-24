// src/pages/RaceResults.jsx
import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/supabase';
import { Loader } from './Drivers';
import { useAuth } from '../hooks/useAuth';

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export default function RaceResultsPage({ races = [], seasons = [], teams = [], onOpenDriver, detailRaceId }) {
  const { isAdmin } = useAuth();
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [filterYear, setFilterYear] = useState(() => {
    const ys = (seasons || []).map((s) => Number(s.year)).filter(Boolean);
    if (ys.length) return Math.max(...ys);
    const ry = (races || []).map((r) => Number(r.season_year)).filter(Boolean);
    return ry.length ? Math.max(...ry) : null;
  });

  const [results, setResults] = useState([]);
  const [topThree, setTopThree] = useState([]);
  const [fastestLapResult, setFastestLapResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [highlights, setHighlights] = useState([]);
  const [activeHlIdx, setActiveHlIdx] = useState(0);
  const [addingHl, setAddingHl] = useState(false);
  const [hlForm, setHlForm] = useState({ title: '', url: '' });
  const [savingHl, setSavingHl] = useState(false);

  useEffect(() => {
    if (!detailRaceId) return;
    const next = String(detailRaceId);
    setSelectedRaceId((prev) => (String(prev) === next ? prev : next));
  }, [detailRaceId]);

  const filteredRaces = useMemo(() => {
    const list = [...(races || [])];
    if (filterYear) return list.filter((r) => Number(r.season_year) === Number(filterYear)).sort((a, b) => (a.round || 0) - (b.round || 0));
    return list.sort((a, b) => (b.season_year - a.season_year) || (a.round || 0) - (b.round || 0));
  }, [races, filterYear]);

  const selectedRace = useMemo(() => (races || []).find((r) => String(r.id) === String(selectedRaceId)) || null, [races, selectedRaceId]);

  useEffect(() => {
    if (!selectedRaceId) return;
    let alive = true;
    setAddingHl(false);
    setHlForm({ title: '', url: '' });
    setActiveHlIdx(0);
    setHighlights([]);
    (async () => {
      setLoading(true);
      setError('');
      const [{ data, error: e }, { data: hlData }] = await Promise.all([
        db.race_results.listByRace(selectedRaceId),
        db.race_highlights.listByRace(selectedRaceId),
      ]);
      if (!alive) return;
      if (e) { setError(e.message); setLoading(false); return; }
      const rows = data || [];
      setResults(rows);
      setHighlights(hlData || []);
      const podium = rows
        .filter((r) => Number(r.position) && Number(r.position) <= 3)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      setTopThree(podium);
      setFastestLapResult(rows.find((r) => r.fastest_lap) || null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [selectedRaceId]);

  useEffect(() => {
    const cls = 'hide-mobile-header';
    if (!selectedRaceId) return undefined;
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [selectedRaceId]);

  if (!selectedRaceId) {
    return (
      <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 80 }}>
        <div style={{ padding: '16px 20px 12px' }}>
          <h1 style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>
            Results
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(seasons || []).map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterYear(s.year)}
              type="button"
              style={{
                padding: '6px 16px', borderRadius: 980, flexShrink: 0,
                background: Number(filterYear) === Number(s.year) ? '#e8002d' : 'rgba(255,255,255,0.08)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12,
                color: Number(filterYear) === Number(s.year) ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              {s.year}
            </button>
          ))}
        </div>

        {filteredRaces.map((race) => (
          <div
            key={race.id}
            onClick={() => setSelectedRaceId(race.id)}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRaceId(race.id); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 48, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {race.circuits?.layout_url ? (
                <img src={race.circuits.layout_url} alt=""
                  style={{ maxWidth: 48, maxHeight: 36, objectFit: 'contain' }}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>R{race.round}</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 14, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {race.name}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                Round {race.round} · {race.circuits?.country} · {race.date}
              </div>
            </div>

            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }} aria-hidden="true">›</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Back button */}
      <div style={{ padding: '16px 20px 8px' }}>
        <button onClick={() => setSelectedRaceId(null)} type="button" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#fff', fontSize: 20, padding: 0,
          display: 'flex', alignItems: 'center',
        }} aria-label="Back">←</button>
      </div>

      {/* Race header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        gap: 12, padding: '8px 20px 16px', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
            Round {String(selectedRace?.round || 0).padStart(2, '0')}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.1, marginBottom: 14 }}>
            {(selectedRace?.name || '').replace('Grand Prix', 'GP')}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {topThree.map((result) => {
              const teamColor = teams.find((t) => t.id === result.team_id || t.name === result.teams?.name)?.team_color || '#fff';
              return (
                <div key={result.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {[0.9, 0.6, 0.35].map((op, li) => (
                      <div key={li} style={{
                        width: 4, height: 16, background: teamColor,
                        opacity: op, borderRadius: 1, transform: 'skewX(-12deg)',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color: '#fff', letterSpacing: '0.04em' }}>
                    {result.drivers?.code || '???'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ width: 120, height: 100, flexShrink: 0 }}>
          {selectedRace?.circuits?.layout_url ? (
            <img src={selectedRace.circuits.layout_url} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.6 }}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : null}
        </div>
      </div>

      {/* Fastest lap + winner badges */}
      {(fastestLapResult || topThree[0]) && (
        <div style={{ margin: '0 16px 16px', background: '#1a1a1a', borderRadius: 16, overflow: 'hidden' }}>
          {fastestLapResult && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
              borderBottom: topThree[0] ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(10,132,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>⏱</div>
              <div>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: '#fff' }}>
                  {fastestLapResult.drivers?.first_name} {fastestLapResult.drivers?.last_name}
                  {fastestLapResult.fastest_lap_time && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> · {fastestLapResult.fastest_lap_time}</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Fastest Lap</div>
              </div>
            </div>
          )}
          {topThree[0] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(255,214,10,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>🏆</div>
              <div>
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 13, color: '#fff' }}>
                  {topThree[0].drivers?.first_name} {topThree[0].drivers?.last_name}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Race Winner</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 0 4px' }} />

      {/* Race Highlights */}
      {(highlights.length > 0 || isAdmin) && (
        <div style={{ margin: '16px 16px 0' }}>
          {highlights.length > 0 && (() => {
            const active = highlights[Math.min(activeHlIdx, highlights.length - 1)];
            const ytId = getYouTubeId(active?.url);
            return (
              <>
                {/* Tab strip */}
                {highlights.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {highlights.map((h, i) => (
                      <button key={h.id} type="button" onClick={() => setActiveHlIdx(i)}
                        style={{
                          flexShrink: 0, padding: '5px 12px', borderRadius: 980,
                          background: i === activeHlIdx ? '#e8002d' : 'rgba(255,255,255,0.08)',
                          border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 11,
                          color: i === activeHlIdx ? '#fff' : 'rgba(255,255,255,0.45)',
                        }}
                      >
                        {h.title || `Video ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                {/* Player */}
                {ytId && (
                  <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', background: '#111' }}>
                    <iframe
                      key={ytId}
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={active.title || 'Race Highlights'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    />
                  </div>
                )}
                {/* Admin: per-video delete */}
                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <button type="button"
                      onClick={async () => {
                        await db.race_highlights.remove(active.id);
                        setHighlights(prev => {
                          const next = prev.filter(h => h.id !== active.id);
                          setActiveHlIdx(i => Math.min(i, Math.max(0, next.length - 1)));
                          return next;
                        });
                      }}
                      style={{
                        background: 'rgba(232,0,45,0.12)', border: '1px solid rgba(232,0,45,0.3)',
                        borderRadius: 8, padding: '5px 12px', color: '#ff453a',
                        cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 11,
                      }}
                    >Remove this video</button>
                  </div>
                )}
              </>
            );
          })()}

          {/* Admin: add new video */}
          {isAdmin && (
            <div style={{ marginTop: highlights.length > 0 ? 10 : 0 }}>
              {addingHl ? (
                <div style={{ background: '#1a1a1a', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={hlForm.title}
                    onChange={e => setHlForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Label (e.g. Race Highlights, Sprint)"
                    style={{
                      background: '#111', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8, padding: '8px 12px', color: '#fff',
                      fontFamily: 'var(--sans)', fontSize: 12,
                    }}
                  />
                  <input
                    value={hlForm.url}
                    onChange={e => setHlForm(p => ({ ...p, url: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=…"
                    style={{
                      background: '#111', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8, padding: '8px 12px', color: '#fff',
                      fontFamily: 'var(--mono)', fontSize: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={savingHl || !hlForm.url}
                      onClick={async () => {
                        if (!hlForm.url) return;
                        setSavingHl(true);
                        const { data } = await db.race_highlights.insert({
                          race_id: selectedRaceId,
                          title: hlForm.title,
                          url: hlForm.url,
                          sort_order: highlights.length,
                        });
                        if (data) {
                          setHighlights(prev => [...prev, data]);
                          setActiveHlIdx(highlights.length);
                        }
                        setHlForm({ title: '', url: '' });
                        setAddingHl(false);
                        setSavingHl(false);
                      }}
                      style={{
                        background: '#e8002d', border: 'none', borderRadius: 8,
                        padding: '8px 16px', color: '#fff', cursor: 'pointer',
                        fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 12,
                      }}
                    >{savingHl ? '…' : 'Add'}</button>
                    <button type="button" onClick={() => { setAddingHl(false); setHlForm({ title: '', url: '' }); }}
                      style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
                        padding: '8px 14px', color: '#fff', cursor: 'pointer',
                        fontFamily: 'var(--sans)', fontSize: 12,
                      }}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingHl(true)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: 8, padding: '8px 14px', color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12, width: '100%',
                  }}
                >+ Add Highlight Video</button>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '16px 0 4px' }} />

      {error && <div style={{ margin: '14px 20px', color: '#ff453a', fontFamily: 'var(--sans)', fontSize: 13 }}>{error}</div>}
      {loading ? <Loader /> : results.map((result) => {
        const teamName = result.teams?.name;
        const teamColor = teams.find((t) => t.name === teamName || t.id === result.team_id)?.team_color || 'rgba(255,255,255,0.3)';
        const posChange = result.grid_position != null && result.position != null
          ? Number(result.grid_position) - Number(result.position) : null;
        const hasPoints = Number(result.points || 0) > 0;

        return (
          <div key={result.id}
            onClick={() => onOpenDriver?.(result.driver_id || result.drivers?.id)}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenDriver?.(result.driver_id || result.drivers?.id); }}
            style={{
              display: 'grid', gridTemplateColumns: '56px 1fr auto 20px',
              alignItems: 'center', padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.01em' }}>
                {String(result.position ?? 'R').padStart(2, '0')}
              </span>
              {posChange !== null && (
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 9,
                  color: posChange > 0 ? '#30d158' : posChange < 0 ? '#ff453a' : 'rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', gap: 2,
                }}>
                  {posChange > 0 ? '↑' : posChange < 0 ? '↓' : '='} {Math.abs(posChange) || 0}
                </span>
              )}
            </div>

            <div>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '-0.01em' }}>
                {result.drivers?.first_name} {result.drivers?.last_name}
              </div>
              {result.teams?.logo_url ? (
                <img src={result.teams.logo_url} alt={teamName || ''}
                  style={{ height: 12, width: 'auto', maxWidth: 40, objectFit: 'contain', marginTop: 3 }}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 11, color: teamColor, marginTop: 2 }}>
                  {teamName || '—'}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right', marginRight: 10 }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 14, color: '#fff', letterSpacing: '-0.02em' }}>
                {hasPoints ? result.points : ''}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                {result.time_or_gap || (hasPoints ? 'PTS' : (result.status || '—'))}
              </div>
            </div>

            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 16 }}>›</span>
          </div>
        );
      })}
    </div>
  );
}

