// src/pages/LapTimes.jsx
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Loader, Empty } from './Drivers';

const DRIVER_COLORS = [
  '#e10600','#1e88e5','#ff8c00','#00c853','#ab47bc',
  '#00bcd4','#ff6f00','#ec407a','#78909c','#26a69a',
  '#f06292','#aed581','#4fc3f7','#ffb74d','#ba68c8',
  '#4db6ac','#e57373','#81c784','#64b5f6','#fff176',
];

function msToTime(ms) {
  if (!ms) return '—';
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
}

async function fetchOpenF1(path) {
  const r = await fetch(`https://api.openf1.org/v1${path}`);
  if (!r.ok) throw new Error(`OpenF1 ${r.status}`);
  return r.json();
}

function dateOnly(iso) {
  if (!iso) return null;
  return String(iso).slice(0, 10);
}

function pickBestSessionForRace(race, sessions) {
  const raceDate = race?.date ? String(race.date).slice(0, 10) : null;
  const raceCountry = race?.circuits?.country ? String(race.circuits.country).toLowerCase() : null;
  const circuitName = race?.circuits?.name ? String(race.circuits.name).toLowerCase() : null;

  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  if (raceDate) {
    const byDate = sessions.filter(s => dateOnly(s.date_start) === raceDate);
    if (byDate.length) return byDate[0];
  }

  const byCountry = raceCountry
    ? sessions.filter(s => String(s.country_name || '').toLowerCase() === raceCountry || String(s.location || '').toLowerCase().includes(raceCountry))
    : [];

  if (byCountry.length && raceDate) {
    const target = new Date(raceDate).getTime();
    let best = byCountry[0];
    let bestDist = Infinity;
    for (const s of byCountry) {
      const t = new Date(s.date_start).getTime();
      const d = Math.abs(t - target);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    return best;
  }

  if (circuitName) {
    const byCircuit = sessions.filter(s => String(s.circuit_short_name || '').toLowerCase() && circuitName.includes(String(s.circuit_short_name).toLowerCase()));
    if (byCircuit.length) return byCircuit[0];
  }

  if (byCountry.length) return byCountry[0];
  return sessions[0];
}

export default function LapTimesPage({ races, drivers }) {
  const { isAdmin } = useAuth();
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [allLaps, setAllLaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [error, setError] = useState('');
  const [selectedDriverIds, setSelectedDriverIds] = useState([]);
  const [chartType, setChartType] = useState('lapTimes'); // lapTimes | gapToLeader | sectorComp

  const sortedRaces = [...races].sort((a, b) => b.season_year - a.season_year || a.round - b.round);

  const loadLaps = async (raceId) => {
    setLoading(true); setError('');
    const { data, error } = await db.lap_times.listByRace(raceId);
    if (error) setError(error.message);
    else {
      setAllLaps(data || []);
      // Auto-select top 5 unique drivers
      const uniqueDriverIds = [...new Set((data || []).map(l => l.driver_id))].slice(0, 5);
      setSelectedDriverIds(uniqueDriverIds);
    }
    setLoading(false);
  };

  useEffect(() => { if (selectedRaceId) loadLaps(selectedRaceId); }, [selectedRaceId]);

  // Import lap times from OpenF1
  const importFromOpenF1 = async () => {
    const race = races.find(r => r.id === selectedRaceId);
    if (!race) return;
    setImporting(true); setImportStatus('Fetching session from OpenF1…');

    try {
      // OpenF1 meeting_key is not the same as F1 round. Fetch all race sessions and best-match by date/country.
      const sessions = await fetchOpenF1(`/sessions?year=${race.season_year}&session_type=Race`);
      const session = pickBestSessionForRace(race, sessions);
      if (!session) throw new Error(`No OpenF1 race session found for ${race.season_year} ${race.name || ''}`);

      setImportStatus(`Found session ${session.session_key}. Fetching lap data…`);

      // Fetch laps for this session
      const lapsRaw = await fetchOpenF1(`/laps?session_key=${session.session_key}`);

      setImportStatus(`Processing ${lapsRaw.length} lap records…`);

      // Fetch drivers for this session (to match OpenF1 driver_number → our driver_id)
      const openF1Drivers = await fetchOpenF1(`/drivers?session_key=${session.session_key}`);

      // Map car_number → our driver_id
      const numToId = {};
      for (const od of openF1Drivers) {
        const match = drivers.find(d =>
          String(d.number) === String(od.driver_number) ||
          d.code?.toLowerCase() === od.name_acronym?.toLowerCase()
        );
        if (match) numToId[od.driver_number] = match.id;
      }

      // Build upsert rows
      const rows = lapsRaw
        .filter(l => numToId[l.driver_number] && l.lap_duration != null)
        .map(l => ({
          race_id:       selectedRaceId,
          driver_id:     numToId[l.driver_number],
          lap_number:    l.lap_number,
          lap_duration_ms: Math.round(l.lap_duration * 1000),
          sector1_ms:    l.duration_sector_1 != null ? Math.round(l.duration_sector_1 * 1000) : null,
          sector2_ms:    l.duration_sector_2 != null ? Math.round(l.duration_sector_2 * 1000) : null,
          sector3_ms:    l.duration_sector_3 != null ? Math.round(l.duration_sector_3 * 1000) : null,
          is_pit_out_lap: !!l.is_pit_out_lap,
        }));

      if (rows.length === 0) throw new Error('No matchable lap records found. Make sure drivers are imported with correct car numbers.');

      // Batch upsert in chunks of 500
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await db.lap_times.upsert(rows.slice(i, i + CHUNK));
        if (error) throw new Error(error.message);
        setImportStatus(`Saving… ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
      }

      setImportStatus(`✓ Imported ${rows.length} laps for ${Object.keys(numToId).length} drivers`);
      await loadLaps(selectedRaceId);
    } catch (e) {
      setImportStatus(`✗ ${e.message}`);
    }
    setImporting(false);
  };

  // Group laps by driver for chart
  const driverIds = [...new Set(allLaps.map(l => l.driver_id))];
  const filteredDriverIds = selectedDriverIds.length > 0 ? selectedDriverIds : driverIds.slice(0, 5);

  const lapsByDriver = {};
  for (const did of driverIds) {
    lapsByDriver[did] = allLaps.filter(l => l.driver_id === did && !l.is_pit_out_lap).sort((a, b) => a.lap_number - b.lap_number);
  }

  const driverInfo = (id) => {
    const lap = allLaps.find(l => l.driver_id === id);
    return lap?.drivers || drivers.find(d => d.id === id) || {};
  };

  const maxLap = Math.max(...allLaps.map(l => l.lap_number), 0);

  const toggleDriver = (id) => {
    setSelectedDriverIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed'", fontSize: 30, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
          Lap <span style={{ color: 'var(--red)' }}>Times</span>
        </h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedRaceId} onChange={e => setSelectedRaceId(e.target.value)} style={{ minWidth: 280 }}>
            <option value="">— Select a Race —</option>
            {sortedRaces.map(r => <option key={r.id} value={r.id}>{r.season_year} R{r.round} – {r.name}</option>)}
          </select>
          {isAdmin && selectedRaceId && (
            <button className="btn btn-yellow btn-sm" onClick={importFromOpenF1} disabled={importing}>
              {importing ? <span className="spinner" /> : '⚡'} Import from OpenF1
            </button>
          )}
        </div>
      </div>

      {importStatus && (
        <div className={importStatus.startsWith('✓') ? 'success-msg' : importStatus.startsWith('✗') ? 'error-msg' : 'success-msg'}
          style={{ marginBottom: 16, background: importStatus.startsWith('✗') ? undefined : 'rgba(59,130,246,.1)', color: importStatus.startsWith('✗') ? undefined : '#60a5fa', borderColor: importStatus.startsWith('✗') ? undefined : 'rgba(59,130,246,.2)' }}>
          {importStatus}
        </div>
      )}

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      {!selectedRaceId && <div className="card" style={{ padding: 48, textAlign: 'center' }}><span style={{ fontSize: 52 }}>⏱</span><p style={{ color: 'var(--muted)', marginTop: 12 }}>Select a race to view lap times</p></div>}

      {selectedRaceId && (loading ? <Loader /> : allLaps.length === 0
        ? <Empty icon="⏱" label="No lap data. Use 'Import from OpenF1' to fetch telemetry." />
        : (
          <div>
            {/* Driver selector */}
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, fontWeight: 700 }}>Select Drivers</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {driverIds.map((id, i) => {
                  const d = driverInfo(id);
                  const color = DRIVER_COLORS[i % DRIVER_COLORS.length];
                  const active = filteredDriverIds.includes(id);
                  return (
                    <button key={id} onClick={() => toggleDriver(id)}
                      style={{ padding: '5px 12px', borderRadius: 4, border: `2px solid ${active ? color : 'var(--line)'}`, background: active ? `${color}22` : 'var(--bg3)', color: active ? color : 'var(--muted)', fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}>
                      {d.code || d.last_name || id.slice(0,6)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chart type selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[['lapTimes','Lap Times'],['gapToLeader','Gap to Leader'],['sectorComp','Sector Comparison']].map(([v, label]) => (
                <button key={v} className={`btn btn-sm ${chartType === v ? 'btn-red' : 'btn-ghost'}`} onClick={() => setChartType(v)}>{label}</button>
              ))}
            </div>

            {/* Chart */}
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              {chartType === 'lapTimes'  && <LapTimeChart   lapsByDriver={lapsByDriver} filteredDriverIds={filteredDriverIds} driverInfo={driverInfo} maxLap={maxLap} />}
              {chartType === 'gapToLeader' && <GapChart      lapsByDriver={lapsByDriver} filteredDriverIds={filteredDriverIds} driverInfo={driverInfo} maxLap={maxLap} />}
              {chartType === 'sectorComp'  && <SectorChart   lapsByDriver={lapsByDriver} filteredDriverIds={filteredDriverIds} driverInfo={driverInfo} />}
            </div>

            {/* Data table */}
            <FastestLapsTable lapsByDriver={lapsByDriver} filteredDriverIds={filteredDriverIds} driverInfo={driverInfo} />
          </div>
        )
      )}
    </div>
  );
}

// ── Lap Time Chart (SVG) ──────────────────────────────────────────────────────
function LapTimeChart({ lapsByDriver, filteredDriverIds, driverInfo, maxLap }) {
  const W = 900, H = 320, PADL = 70, PADR = 20, PADT = 20, PADB = 40;
  const cW = W - PADL - PADR, cH = H - PADT - PADB;

  const allMs = filteredDriverIds.flatMap(id => lapsByDriver[id]?.map(l => l.lap_duration_ms).filter(Boolean) || []);
  if (allMs.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No data</div>;

  const minMs = Math.min(...allMs) * 0.998;
  const maxMs = Math.max(...allMs) * 1.002;

  const x = (lap)  => PADL + ((lap - 1) / Math.max(maxLap - 1, 1)) * cW;
  const y = (ms)   => PADT + (1 - (ms - minMs) / (maxMs - minMs)) * cH;

  const yTicks = 5;
  const yStep = (maxMs - minMs) / yTicks;

  return (
    <div>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Lap Time Trace</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {/* Grid lines */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const ms = minMs + yStep * i;
          const yy = y(ms);
          return (
            <g key={i}>
              <line x1={PADL} y1={yy} x2={W - PADR} y2={yy} stroke="var(--line)" strokeWidth="1" />
              <text x={PADL - 6} y={yy + 4} fill="var(--muted)" fontSize="10" textAnchor="end">{msToTime(Math.round(ms))}</text>
            </g>
          );
        })}
        {/* Lap axis labels */}
        {Array.from({ length: Math.min(maxLap, 20) }, (_, i) => {
          const lap = Math.round(1 + (i / 19) * (maxLap - 1));
          return <text key={lap} x={x(lap)} y={H - PADB + 14} fill="var(--muted)" fontSize="10" textAnchor="middle">{lap}</text>;
        })}
        {/* Axis label */}
        <text x={W / 2} y={H - 4} fill="var(--muted)" fontSize="11" textAnchor="middle" fontFamily="'Barlow Condensed'" letterSpacing="1">LAP</text>

        {/* Lines per driver */}
        {filteredDriverIds.map((id, ci) => {
          const laps = lapsByDriver[id]?.filter(l => l.lap_duration_ms) || [];
          if (laps.length < 2) return null;
          const color = DRIVER_COLORS[ci % DRIVER_COLORS.length];
          const pts = laps.map(l => `${x(l.lap_number)},${y(l.lap_duration_ms)}`).join(' ');
          return (
            <g key={id}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" opacity="0.9" />
              {laps.map(l => (
                <circle key={l.lap_number} cx={x(l.lap_number)} cy={y(l.lap_duration_ms)} r="2.5" fill={color} opacity="0.7">
                  <title>{driverInfo(id).code} L{l.lap_number}: {msToTime(l.lap_duration_ms)}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10 }}>
        {filteredDriverIds.map((id, ci) => {
          const d = driverInfo(id);
          const color = DRIVER_COLORS[ci % DRIVER_COLORS.length];
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />
              <span style={{ fontSize: 12, fontFamily: "'Barlow Condensed'", fontWeight: 700, color }}>{d.code || d.last_name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Gap to Leader Chart ───────────────────────────────────────────────────────
function GapChart({ lapsByDriver, filteredDriverIds, driverInfo, maxLap }) {
  const W = 900, H = 320, PADL = 70, PADR = 20, PADT = 20, PADB = 40;
  const cW = W - PADL - PADR, cH = H - PADT - PADB;

  // Compute cumulative time per driver per lap
  const cumulative = {};
  for (const id of filteredDriverIds) {
    let sum = 0;
    cumulative[id] = {};
    for (const l of (lapsByDriver[id] || [])) {
      if (l.lap_duration_ms) { sum += l.lap_duration_ms; cumulative[id][l.lap_number] = sum; }
    }
  }

  // Gap to P1 per lap
  const gapData = {};
  for (const id of filteredDriverIds) gapData[id] = [];

  const lapNums = [...new Set(filteredDriverIds.flatMap(id => Object.keys(cumulative[id]).map(Number)))].sort((a,b)=>a-b);
  for (const lap of lapNums) {
    const times = filteredDriverIds.map(id => ({ id, t: cumulative[id][lap] })).filter(x => x.t);
    if (times.length === 0) continue;
    const leader = Math.min(...times.map(x => x.t));
    for (const { id, t } of times) gapData[id].push({ lap, gap: (t - leader) / 1000 });
  }

  const allGaps = Object.values(gapData).flat().map(g => g.gap);
  if (allGaps.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No data</div>;

  const maxGap = Math.max(...allGaps) * 1.05;
  const x = (lap) => PADL + ((lap - 1) / Math.max(maxLap - 1, 1)) * cW;
  const y = (gap) => PADT + (gap / Math.max(maxGap, 1)) * cH;

  return (
    <div>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Gap to Leader (seconds)</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const gap = maxGap * pct;
          const yy = y(gap);
          return (
            <g key={pct}>
              <line x1={PADL} y1={yy} x2={W - PADR} y2={yy} stroke="var(--line)" strokeWidth="1" />
              <text x={PADL - 6} y={yy + 4} fill="var(--muted)" fontSize="10" textAnchor="end">{gap.toFixed(1)}s</text>
            </g>
          );
        })}
        <line x1={PADL} y1={PADT} x2={PADL} y2={H - PADB} stroke="var(--line)" strokeWidth="1" />

        {filteredDriverIds.map((id, ci) => {
          const pts = gapData[id];
          if (pts.length < 2) return null;
          const color = DRIVER_COLORS[ci % DRIVER_COLORS.length];
          const path = pts.map(p => `${x(p.lap)},${y(p.gap)}`).join(' ');
          return (
            <g key={id}>
              <polyline points={path} fill="none" stroke={color} strokeWidth="2" opacity="0.9" />
            </g>
          );
        })}

        {/* X labels */}
        {Array.from({ length: Math.min(maxLap, 20) }, (_, i) => {
          const lap = Math.round(1 + (i / 19) * (maxLap - 1));
          return <text key={lap} x={x(lap)} y={H - PADB + 14} fill="var(--muted)" fontSize="10" textAnchor="middle">{lap}</text>;
        })}
        <text x={W / 2} y={H - 4} fill="var(--muted)" fontSize="11" textAnchor="middle" fontFamily="'Barlow Condensed'" letterSpacing="1">LAP</text>
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10 }}>
        {filteredDriverIds.map((id, ci) => {
          const d = driverInfo(id);
          const color = DRIVER_COLORS[ci % DRIVER_COLORS.length];
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />
              <span style={{ fontSize: 12, fontFamily: "'Barlow Condensed'", fontWeight: 700, color }}>{d.code || d.last_name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sector Comparison Bar Chart ───────────────────────────────────────────────
function SectorChart({ lapsByDriver, filteredDriverIds, driverInfo }) {
  // Best sector time per driver
  const best = {};
  for (const id of filteredDriverIds) {
    const laps = (lapsByDriver[id] || []).filter(l => l.sector1_ms && l.sector2_ms && l.sector3_ms);
    if (!laps.length) { best[id] = null; continue; }
    best[id] = {
      s1: Math.min(...laps.map(l => l.sector1_ms)),
      s2: Math.min(...laps.map(l => l.sector2_ms)),
      s3: Math.min(...laps.map(l => l.sector3_ms)),
    };
  }

  const validIds = filteredDriverIds.filter(id => best[id]);
  if (!validIds.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No sector data available for this race.</div>;

  const maxTotal = Math.max(...validIds.map(id => best[id].s1 + best[id].s2 + best[id].s3));

  return (
    <div>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>Best Sector Times</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {validIds.map((id, ci) => {
          const d = driverInfo(id);
          const color = DRIVER_COLORS[ci % DRIVER_COLORS.length];
          const b = best[id];
          const total = b.s1 + b.s2 + b.s3;
          const W = 100;
          const s1w = (b.s1 / total) * W;
          const s2w = (b.s2 / total) * W;
          const s3w = (b.s3 / total) * W;
          const barW = (total / maxTotal) * 100;
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, color }}>{d.code || '???'}</div>
              <div style={{ flex: 1, position: 'relative', height: 28, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${barW}%`, display: 'flex' }}>
                  <div style={{ flex: s1w, background: '#3b82f6', transition: 'flex .4s' }} title={`S1: ${msToTime(b.s1)}`} />
                  <div style={{ flex: s2w, background: color,   transition: 'flex .4s' }} title={`S2: ${msToTime(b.s2)}`} />
                  <div style={{ flex: s3w, background: '#22c55e',transition: 'flex .4s' }} title={`S3: ${msToTime(b.s3)}`} />
                </div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8, pointerEvents: 'none' }}>
                  <span style={{ fontFamily: "'Barlow Condensed'", fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
                    {msToTime(b.s1)} | {msToTime(b.s2)} | {msToTime(b.s3)}
                  </span>
                </div>
              </div>
              <div style={{ width: 70, fontFamily: 'monospace', fontSize: 12, textAlign: 'right', color: 'var(--muted)' }}>{msToTime(total)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
        {[['S1', '#3b82f6'], ['S2', 'var(--muted)'], ['S3', '#22c55e']].map(([s, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sector {s[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Fastest Laps summary table ────────────────────────────────────────────────
function FastestLapsTable({ lapsByDriver, filteredDriverIds, driverInfo }) {
  const rows = filteredDriverIds.map((id, ci) => {
    const laps = lapsByDriver[id]?.filter(l => l.lap_duration_ms) || [];
    if (!laps.length) return null;
    const fastest = laps.reduce((a, b) => a.lap_duration_ms < b.lap_duration_ms ? a : b);
    const avg     = laps.reduce((s, l) => s + l.lap_duration_ms, 0) / laps.length;
    return { id, ci, d: driverInfo(id), fastest, avg, count: laps.length };
  }).filter(Boolean);

  const bestMs = Math.min(...rows.map(r => r.fastest.lap_duration_ms));

  return (
    <div>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>Fastest Laps Summary</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Driver</th><th>Fastest Lap</th><th>On Lap</th><th>Avg Lap</th><th>Laps</th><th>Δ Fastest</th></tr>
          </thead>
          <tbody>
            {rows.sort((a, b) => a.fastest.lap_duration_ms - b.fastest.lap_duration_ms).map(r => {
              const delta = r.fastest.lap_duration_ms - bestMs;
              const color = DRIVER_COLORS[r.ci % DRIVER_COLORS.length];
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
                      <b style={{ color }}>{r.d.code}</b>
                      <span>{r.d.first_name} {r.d.last_name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: delta === 0 ? 'var(--accent)' : 'var(--text)' }}>
                    {delta === 0 ? '⚡ ' : ''}{msToTime(r.fastest.lap_duration_ms)}
                  </td>
                  <td>{r.fastest.lap_number}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>{msToTime(Math.round(r.avg))}</td>
                  <td>{r.count}</td>
                  <td style={{ fontFamily: 'monospace', color: delta === 0 ? 'var(--accent)' : '#f87171' }}>
                    {delta === 0 ? 'FASTEST' : `+${(delta / 1000).toFixed(3)}s`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
