// src/pages/ChartsPage.jsx
import { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { Loader } from './Drivers';

const COLORS = [
  '#e10600','#1e88e5','#ff8c00','#00c853','#ab47bc',
  '#00bcd4','#ff6f00','#ec407a','#78909c','#26a69a',
  '#f06292','#aed581','#4fc3f7','#ffb74d','#ba68c8',
  '#4db6ac','#e57373','#81c784','#64b5f6','#fff176',
];

export default function ChartsPage({ seasons }) {
  const [year, setYear] = useState(seasons[0]?.year || '');
  const [loading, setLoading] = useState(false);
  const [driverStandings, setDriverStandings] = useState([]);
  const [constructorStandings, setConstructorStandings] = useState([]);
  const [raceResults, setRaceResults] = useState([]);   // [{race, results[]}]
  const [races, setRaces] = useState([]);
  const [activeChart, setActiveChart] = useState('progression');

  useEffect(() => {
    if (!year) return;
    setLoading(true);
    Promise.all([
      db.driver_standings.listBySeason(year),
      db.constructor_standings.listBySeason(year),
      db.races.list(),
    ]).then(async ([ds, cs, racesRes]) => {
      setDriverStandings(ds.data || []);
      setConstructorStandings(cs.data || []);
      const seasonRaces = (racesRes.data || [])
        .filter(r => String(r.season_year) === String(year))
        .sort((a, b) => a.round - b.round);
      setRaces(seasonRaces);

      // Load results for all races
      const allResults = [];
      for (const race of seasonRaces) {
        const { data } = await db.race_results.listByRace(race.id);
        if (data?.length) allResults.push({ race, results: data });
      }
      setRaceResults(allResults);
      setLoading(false);
    });
  }, [year]);

  const charts = [
    { id: 'progression',   label: 'Points Progression' },
    { id: 'constructors',  label: 'Constructor Points' },
    { id: 'wins',          label: 'Wins Distribution' },
    { id: 'grid_vs_finish','label': 'Grid vs Finish' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed'", fontSize: 30, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
          Season <span style={{ color: 'var(--red)' }}>Charts</span>
        </h1>
        <select value={year} onChange={e => setYear(e.target.value)} style={{ minWidth: 120 }}>
          <option value="">— Season —</option>
          {seasons.map(s => <option key={s.id} value={s.year}>{s.year}</option>)}
        </select>
      </div>

      {!year && <div className="card" style={{ padding: 48, textAlign: 'center' }}><span style={{ fontSize: 52 }}>📊</span><p style={{ color: 'var(--muted)', marginTop: 12 }}>Select a season to view charts</p></div>}

      {year && (loading ? <Loader /> : (
        <>
          {/* Chart nav */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {charts.map(c => (
              <button key={c.id} className={`btn btn-sm ${activeChart === c.id ? 'btn-red' : 'btn-ghost'}`} onClick={() => setActiveChart(c.id)}>{c.label}</button>
            ))}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="svg-scroll">
              {activeChart === 'progression'  && <PointsProgressionChart raceResults={raceResults} races={races} driverStandings={driverStandings} />}
              {activeChart === 'constructors' && <ConstructorPointsChart constructorStandings={constructorStandings} raceResults={raceResults} races={races} />}
              {activeChart === 'wins'         && <WinsChart driverStandings={driverStandings} constructorStandings={constructorStandings} />}
              {activeChart === 'grid_vs_finish' && <GridVsFinishChart raceResults={raceResults} />}
            </div>
          </div>
        </>
      ))}
    </div>
  );
}

// ── Points Progression Chart ──────────────────────────────────────────────────
function PointsProgressionChart({ raceResults, races, driverStandings }) {
  // Build cumulative points per driver across rounds
  const TOP_N = 6;
  const topDriverIds = driverStandings.slice(0, TOP_N).map(d => d.driver_id);

  // Build round-by-round cumulative
  const cum = {};
  for (const id of topDriverIds) cum[id] = [];

  let running = {};
  for (const { race, results } of raceResults) {
    for (const id of topDriverIds) {
      const res = results.find(r => r.driver_id === id);
      running[id] = (running[id] || 0) + parseFloat(res?.points || 0);
      cum[id].push({ round: race.round, name: race.name.replace('Grand Prix','GP'), pts: running[id] });
    }
  }

  const allPts = Object.values(cum).flat().map(d => d.pts);
  if (!allPts.length) return <EmptyChart msg="No race results data. Add results first." />;

  const W = 900, H = 340, PADL = 55, PADR = 100, PADT = 24, PADB = 44;
  const cW = W - PADL - PADR, cH = H - PADT - PADB;
  const maxPts = Math.max(...allPts) * 1.05;
  const maxRound = races.length || 1;

  const x = (round) => PADL + ((round - 1) / Math.max(maxRound - 1, 1)) * cW;
  const y = (pts)   => PADT + (1 - pts / maxPts) * cH;

  const yTicks = 5;

  return (
    <div>
      <ChartTitle>Driver Points Progression</ChartTitle>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Y grid */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const pts = (maxPts / yTicks) * i;
          const yy = y(pts);
          return (
            <g key={i}>
              <line x1={PADL} y1={yy} x2={W - PADR} y2={yy} stroke="var(--line)" strokeWidth="1" />
              <text x={PADL - 6} y={yy + 4} fill="var(--muted)" fontSize="10" textAnchor="end">{Math.round(pts)}</text>
            </g>
          );
        })}
        {/* Race labels on X */}
        {raceResults.map(({ race }) => (
          <text key={race.round} x={x(race.round)} y={H - PADB + 14} fill="var(--muted)" fontSize="9" textAnchor="middle"
            transform={`rotate(-35, ${x(race.round)}, ${H - PADB + 14})`}>
            {race.name.replace('Grand Prix','GP').replace('Formula 1 ','')}
          </text>
        ))}
        {/* Lines */}
        {topDriverIds.map((id, ci) => {
          const pts = cum[id];
          if (pts.length < 2) return null;
          const color = COLORS[ci % COLORS.length];
          const path = pts.map(p => `${x(p.round)},${y(p.pts)}`).join(' ');
          const last = pts[pts.length - 1];
          const d = driverStandings.find(s => s.driver_id === id);
          return (
            <g key={id}>
              <polyline points={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
              {/* End label */}
              <circle cx={x(last.round)} cy={y(last.pts)} r="4" fill={color} />
              <text x={x(last.round) + 8} y={y(last.pts) + 4} fill={color} fontSize="11" fontFamily="'Barlow Condensed'" fontWeight="700">
                {d?.drivers?.code || id.slice(0,3).toUpperCase()} {Math.round(last.pts)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Constructor Points Bar Chart ──────────────────────────────────────────────
function ConstructorPointsChart({ constructorStandings }) {
  if (!constructorStandings.length) return <EmptyChart msg="No constructor standings data." />;

  const sorted = [...constructorStandings].sort((a, b) => b.points - a.points);
  const maxPts = sorted[0]?.points || 1;
  const BAR_H = 36, GAP = 10, PADL = 160, PADR = 80, PADT = 20;
  const W = 900;
  const H = PADT + sorted.length * (BAR_H + GAP);

  return (
    <div>
      <ChartTitle>Constructor Championship Points</ChartTitle>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {sorted.map((s, i) => {
          const barW = Math.max(((s.points / maxPts) * (W - PADL - PADR)), 2);
          const yy = PADT + i * (BAR_H + GAP);
          const color = COLORS[i % COLORS.length];
          return (
            <g key={s.id}>
              <text x={PADL - 8} y={yy + BAR_H / 2 + 5} fill="var(--text)" fontSize="13" textAnchor="end" fontFamily="'Barlow Condensed'" fontWeight="700">{s.teams?.name}</text>
              <rect x={PADL} y={yy} width={barW} height={BAR_H} fill={color} opacity="0.85" rx="3" />
              <text x={PADL + barW + 8} y={yy + BAR_H / 2 + 5} fill={color} fontSize="14" fontFamily="'Barlow Condensed'" fontWeight="900">{s.points}</text>
              {s.wins > 0 && <text x={PADL + barW - 8} y={yy + BAR_H / 2 + 5} fill="rgba(0,0,0,.8)" fontSize="11" textAnchor="end" fontFamily="'Barlow Condensed'" fontWeight="700">{s.wins}W</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Wins Distribution (donut-style) ──────────────────────────────────────────
function WinsChart({ driverStandings, constructorStandings }) {
  const winners = driverStandings.filter(d => d.wins > 0);
  if (!winners.length) return <EmptyChart msg="No wins data. Add race results first." />;

  const total = winners.reduce((s, d) => s + d.wins, 0);
  const CX = 180, CY = 180, R = 140, R2 = 80;
  const W = 700, H = 380;

  let angle = -Math.PI / 2;
  const slices = winners.map((w, i) => {
    const sweep = (w.wins / total) * 2 * Math.PI;
    const a1 = angle, a2 = angle + sweep;
    angle += sweep;
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2), y2 = CY + R * Math.sin(a2);
    const lx = CX + (R + 20) * Math.cos((a1 + a2) / 2);
    const ly = CY + (R + 20) * Math.sin((a1 + a2) / 2);
    const ix = CX + R2 * Math.cos(a1), iy = CY + R2 * Math.sin(a1);
    const ix2 = CX + R2 * Math.cos(a2), iy2 = CY + R2 * Math.sin(a2);
    const large = sweep > Math.PI ? 1 : 0;
    return { w, i, x1, y1, x2, y2, ix, iy, ix2, iy2, lx, ly, large, a1, a2, sweep };
  });

  return (
    <div>
      <ChartTitle>Wins Distribution</ChartTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 700, height: 'auto' }}>
          {slices.map(s => {
            const color = COLORS[s.i % COLORS.length];
            const path = `M ${s.ix} ${s.iy} L ${s.x1} ${s.y1} A ${R} ${R} 0 ${s.large} 1 ${s.x2} ${s.y2} L ${s.ix2} ${s.iy2} A ${R2} ${R2} 0 ${s.large} 0 ${s.ix} ${s.iy} Z`;
            const midAngle = (s.a1 + s.a2) / 2;
            const labelR = R * 0.72 + R2 * 0.28;
            const lx = CX + labelR * Math.cos(midAngle);
            const ly = CY + labelR * Math.sin(midAngle);
            return (
              <g key={s.w.id}>
                <path d={path} fill={color} opacity="0.9">
                  <title>{s.w.drivers?.last_name}: {s.w.wins} wins</title>
                </path>
                {s.sweep > 0.25 && (
                  <text x={lx} y={ly + 4} fill="rgba(0,0,0,.85)" fontSize="12" textAnchor="middle" fontFamily="'Barlow Condensed'" fontWeight="900">
                    {s.w.wins}
                  </text>
                )}
              </g>
            );
          })}
          {/* Center */}
          <text x={CX} y={CY - 8}  fill="var(--text)"  fontSize="32" textAnchor="middle" fontFamily="'Barlow Condensed'" fontWeight="900">{total}</text>
          <text x={CX} y={CY + 14} fill="var(--muted)" fontSize="11" textAnchor="middle" fontFamily="'Barlow Condensed'" letterSpacing="1">WINS</text>

          {/* Legend on right */}
          {slices.map((s, i) => {
            const color = COLORS[s.i % COLORS.length];
            const lx = 400, ly = 40 + i * 26;
            if (ly > H - 20) return null;
            return (
              <g key={s.w.id}>
                <rect x={lx} y={ly - 10} width={14} height={14} rx="2" fill={color} />
                <text x={lx + 22} y={ly + 2} fill="var(--text)" fontSize="12" fontFamily="'Barlow Condensed'" fontWeight="700">
                  {s.w.drivers?.first_name?.slice(0,1)}. {s.w.drivers?.last_name}
                </text>
                <text x={lx + 22} y={ly + 15} fill={color} fontSize="11" fontFamily="'Barlow Condensed'">
                  {s.w.wins} win{s.w.wins !== 1 ? 's' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Grid vs Finish scatter ────────────────────────────────────────────────────
function GridVsFinishChart({ raceResults }) {
  const points = raceResults.flatMap(({ results }) =>
    results.filter(r => r.grid_position && r.position).map(r => ({ x: r.grid_position, y: r.position, name: `${r.drivers?.code} - ${r.time_or_gap || ''}` }))
  );
  if (!points.length) return <EmptyChart msg="No grid/finish data available." />;

  const W = 900, H = 380, PAD = 50;
  const cW = W - PAD * 2, cH = H - PAD * 2;
  const maxV = Math.max(...points.map(p => Math.max(p.x, p.y)), 20);
  const xP = v => PAD + ((v - 1) / (maxV - 1)) * cW;
  const yP = v => PAD + ((v - 1) / (maxV - 1)) * cH;

  return (
    <div>
      <ChartTitle>Grid Position vs Finishing Position</ChartTitle>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
        {/* Diagonal reference */}
        <line x1={xP(1)} y1={yP(1)} x2={xP(maxV)} y2={yP(maxV)} stroke="var(--line)" strokeWidth="1.5" strokeDasharray="6,4" />
        {/* Axis labels */}
        <text x={W / 2} y={H - 8} fill="var(--muted)" fontSize="11" textAnchor="middle" fontFamily="'Barlow Condensed'" letterSpacing="1">GRID POSITION</text>
        <text x={14} y={H / 2} fill="var(--muted)" fontSize="11" textAnchor="middle" fontFamily="'Barlow Condensed'" letterSpacing="1" transform={`rotate(-90, 14, ${H/2})`}>FINISH POSITION</text>
        {/* Tick marks */}
        {[1,5,10,15,20].filter(v => v <= maxV).map(v => (
          <g key={v}>
            <text x={xP(v)} y={H - PAD + 16} fill="var(--muted)" fontSize="9" textAnchor="middle">{v}</text>
            <text x={PAD - 8} y={yP(v) + 4} fill="var(--muted)" fontSize="9" textAnchor="end">{v}</text>
          </g>
        ))}
        {/* Points */}
        {points.map((p, i) => {
          const improved = p.y < p.x;
          const same = p.y === p.x;
          return (
            <circle key={i} cx={xP(p.x)} cy={yP(p.y)} r="5"
              fill={same ? 'var(--muted)' : improved ? '#22c55e' : '#e10600'}
              opacity="0.7">
              <title>{p.name} — Grid: {p.x} → Finish: {p.y}</title>
            </circle>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
        {[['#22c55e','Gained positions'],['#e10600','Lost positions'],['var(--muted)','No change']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ChartTitle({ children }) {
  return <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 16, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>{children}</div>;
}

function EmptyChart({ msg }) {
  return <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>{msg}</div>;
}
