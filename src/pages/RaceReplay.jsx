// f1db/src/pages/RaceReplay.jsx
import { useEffect, useMemo, useRef, useState } from 'react';

const TEAM_COLORS = {
  'red bull': '#3671c6',
  ferrari: '#e8002d',
  mercedes: '#27f4d2',
  mclaren: '#ff8000',
  'aston martin': '#229971',
  alpine: '#ff87bc',
  williams: '#64c4ff',
  rb: '#6692ff',
  haas: '#b6babd',
  sauber: '#52e252',
  kick: '#52e252',
};

const getTeamColor = (teamName) => {
  if (!teamName) return '#ffffff';
  const key = Object.keys(TEAM_COLORS).find((k) => String(teamName).toLowerCase().includes(k));
  return key ? TEAM_COLORS[key] : '#ffffff';
};

const TYRE_COLORS = {
  SOFT: '#e8002d',
  MEDIUM: '#ffd60a',
  HARD: '#ffffff',
  INTER: '#43b02a',
  INTERMEDIATE: '#43b02a',
  WET: '#0067ff',
};

function fmtRaceLabel(r) {
  const year = r?.season_year ?? '—';
  const round = r?.round ?? '—';
  const name = r?.name ?? 'Race';
  return `${year} R${round} — ${name}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatClock(ms) {
  const clamped = Math.max(0, Math.round(ms || 0));
  const totalSeconds = Math.floor(clamped / 1000);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

function addPaging(url, { limit, offset }) {
  const u = new URL(url);
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('offset', String(offset));
  return u.toString();
}

async function fetchJson(url, { signal } = {}) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`OpenF1 ${r.status} ${r.statusText}`);
  return r.json();
}

async function fetchWithRetry(url, { signal, retries = 3 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(url, { signal });
      if (r.ok) return r.json();
      const retryable = r.status >= 500 || r.status === 429;
      if (!retryable) throw new Error(`OpenF1 ${r.status} ${r.statusText}`);
      lastErr = new Error(`OpenF1 ${r.status} ${r.statusText}`);
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
    }
    const backoff = Math.min(2000, 400 * (attempt + 1) * (attempt + 1));
    // eslint-disable-next-line no-await-in-loop
    await new Promise((res) => setTimeout(res, backoff));
  }
  throw lastErr || new Error('OpenF1 request failed');
}

async function fetchAllPages(url, { signal, limit = 10000, onProgress, label = 'rows' } = {}) {
  const out = [];
  for (let offset = 0; offset < 2_000_000; offset += limit) {
    const pageUrl = addPaging(url, { limit, offset });
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchWithRetry(pageUrl, { signal, retries: 4 });
    if (!Array.isArray(page) || page.length === 0) break;
    out.push(...page);
    onProgress?.({ count: out.length, label });
    if (page.length < limit) break;
  }
  return out;
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
    const byDate = sessions.filter((s) => dateOnly(s.date_start) === raceDate);
    if (byDate.length) return byDate[0];
  }

  const byCountry = raceCountry
    ? sessions.filter((s) => String(s.country_name || '').toLowerCase() === raceCountry || String(s.location || '').toLowerCase().includes(raceCountry))
    : [];

  if (byCountry.length && raceDate) {
    const target = new Date(raceDate).getTime();
    let best = byCountry[0];
    let bestDist = Infinity;
    for (const s of byCountry) {
      const t = new Date(s.date_start).getTime();
      const d = Math.abs(t - target);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  if (circuitName) {
    const byCircuit = sessions.filter((s) => {
      const short = String(s.circuit_short_name || '').toLowerCase();
      return short && circuitName.includes(short);
    });
    if (byCircuit.length) return byCircuit[0];
  }

  if (byCountry.length) return byCountry[0];
  return sessions[0];
}

function groupByDriverNumber(rows, { key = 'driver_number' } = {}) {
  const by = {};
  for (const r of rows || []) {
    const dn = r?.[key];
    if (dn == null) continue;
    const k = String(dn);
    if (!by[k]) by[k] = [];
    by[k].push(r);
  }
  return by;
}

function normalizeAndGroupLocations(locationData, sessionStartMs) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const d of locationData) {
    const x = Number(d.x);
    const y = Number(d.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const rangeX = Math.max(1e-9, maxX - minX);
  const rangeY = Math.max(1e-9, maxY - minY);

  const byDriver = {};
  let totalDurationMs = 0;

  for (const d of locationData) {
    const driverNumber = d?.driver_number;
    const x = Number(d.x);
    const y = Number(d.y);
    const dateMs = d?.date ? new Date(d.date).getTime() : NaN;
    if (driverNumber == null || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(dateMs)) continue;
    const ms = Math.max(0, dateMs - sessionStartMs);
    const nx = ((x - minX) / rangeX) * 900 + 50;
    const ny = ((y - minY) / rangeY) * 500 + 50;
    const k = String(driverNumber);
    if (!byDriver[k]) byDriver[k] = [];
    byDriver[k].push({ ms, nx, ny });
    if (ms > totalDurationMs) totalDurationMs = ms;
  }

  for (const k of Object.keys(byDriver)) {
    byDriver[k].sort((a, b) => a.ms - b.ms);
  }

  return { byDriver, totalDurationMs };
}

function normalizeCarData(carData, sessionStartMs) {
  const by = {};
  for (const d of carData || []) {
    const driverNumber = d?.driver_number;
    const dateMs = d?.date ? new Date(d.date).getTime() : NaN;
    if (driverNumber == null || !Number.isFinite(dateMs)) continue;
    const ms = Math.max(0, dateMs - sessionStartMs);
    const k = String(driverNumber);
    if (!by[k]) by[k] = [];
    by[k].push({
      ms,
      speed: Number(d.speed),
      n_gear: Number(d.n_gear),
      drs: Number(d.drs),
      throttle: Number(d.throttle),
      brake: Number(d.brake),
    });
  }
  for (const k of Object.keys(by)) by[k].sort((a, b) => a.ms - b.ms);
  return by;
}

function normalizeRaceControl(raceControlData, sessionStartMs) {
  const events = (raceControlData || [])
    .map((e) => ({
      ms: e?.date ? Math.max(0, new Date(e.date).getTime() - sessionStartMs) : null,
      message: String(e?.message || ''),
      category: String(e?.category || ''),
    }))
    .filter((e) => e.ms != null)
    .sort((a, b) => a.ms - b.ms);

  const timeline = [];
  let sc = false;
  let vsc = false;

  for (const e of events) {
    const msg = `${e.category} ${e.message}`.toLowerCase();
    const mentionsSC = msg.includes('safety car') || msg.includes('full safety car') || msg.includes(' sc ') || msg.endsWith(' sc');
    const mentionsVSC = msg.includes('virtual safety') || msg.includes('vsc');

    if (mentionsSC && (msg.includes('deploy') || msg.includes('deployed') || msg.includes('start'))) sc = true;
    if (mentionsSC && (msg.includes('ending') || msg.includes('in this lap') || msg.includes('end'))) sc = false;

    if (mentionsVSC && (msg.includes('deploy') || msg.includes('deployed') || msg.includes('start'))) vsc = true;
    if (mentionsVSC && (msg.includes('ending') || msg.includes('end'))) vsc = false;

    if (mentionsSC || mentionsVSC) timeline.push({ ms: e.ms, sc, vsc });
  }

  return timeline.sort((a, b) => a.ms - b.ms);
}

function binarySearchFirstGreater(points, t) {
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].ms > t) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function interpolatePosition(points, currentMs) {
  if (!points || points.length === 0) return null;
  const idx = binarySearchFirstGreater(points, currentMs);
  if (idx <= 0) return points[0];
  if (idx >= points.length) return points[points.length - 1];
  const prev = points[idx - 1];
  const next = points[idx];
  const denom = Math.max(1e-9, next.ms - prev.ms);
  const t = (currentMs - prev.ms) / denom;
  return { nx: prev.nx + (next.nx - prev.nx) * t, ny: prev.ny + (next.ny - prev.ny) * t };
}

function downsample(points, maxPoints = 1400) {
  if (!points || points.length <= maxPoints) return points || [];
  const step = Math.ceil(points.length / maxPoints);
  const out = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  return out;
}

function tyreForLap(stintsByDriver, driverNumber, lap) {
  const stints = stintsByDriver?.[String(driverNumber)] || [];
  if (!stints.length || !lap) return null;
  const match = stints.find((s) => Number(s.lap_start) <= lap && (s.lap_end == null || Number(s.lap_end) >= lap));
  return match?.compound ? String(match.compound).toUpperCase() : null;
}

function nearestCarSample(samples, ms) {
  if (!samples || samples.length === 0) return null;
  const idx = binarySearchFirstGreater(samples, ms);
  if (idx <= 0) return samples[0];
  if (idx >= samples.length) return samples[samples.length - 1];
  const a = samples[idx - 1];
  const b = samples[idx];
  return (ms - a.ms) < (b.ms - ms) ? a : b;
}

function stateAtTime(timeline, ms) {
  if (!timeline || timeline.length === 0) return { sc: false, vsc: false };
  const idx = binarySearchFirstGreater(timeline, ms) - 1;
  if (idx < 0) return { sc: false, vsc: false };
  return { sc: !!timeline[idx].sc, vsc: !!timeline[idx].vsc };
}

function Bar({ label, value, color }) {
  const v = Number(value);
  const pct = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'white' }}>{Number.isFinite(v) ? `${Math.round(pct)}%` : '—'}</div>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function RaceReplayPage({ races = [], circuits = [], drivers = [] }) {
  const sortedRaces = useMemo(
    () => [...(races || [])].sort((a, b) => b.season_year - a.season_year || a.round - b.round),
    [races],
  );

  const [selectedRaceId, setSelectedRaceId] = useState(() => sortedRaces[0]?.id || '');
  const [sessionType, setSessionType] = useState('Race'); // Race | Qualifying | Sprint

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [progress, setProgress] = useState({ location: 0, car: 0, note: '' });
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const [session, setSession] = useState(null);
  const [openDrivers, setOpenDrivers] = useState([]);
  const [stintsByDriver, setStintsByDriver] = useState({});
  const [raceControlTimeline, setRaceControlTimeline] = useState([]);
  const [locationsByDriver, setLocationsByDriver] = useState({});
  const [carByDriver, setCarByDriver] = useState({});
  const [totalDurationMs, setTotalDurationMs] = useState(0);

  const [selectedDriver, setSelectedDriver] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animFrameRef = useRef(null);
  const lastTickRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!selectedRaceId && sortedRaces[0]?.id) setSelectedRaceId(sortedRaces[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedRaces?.length]);

  const selectedRace = useMemo(() => (races || []).find((r) => String(r.id) === String(selectedRaceId)) || null, [races, selectedRaceId]);
  const selectedCircuit = useMemo(() => {
    const circuitId = selectedRace?.circuit_id;
    return (circuits || []).find((c) => String(c.id) === String(circuitId)) || selectedRace?.circuits || null;
  }, [circuits, selectedRace]);

  const totalLaps = Number(selectedRace?.laps || 0) || null;
  const estLap = useMemo(() => {
    if (!totalDurationMs || !currentTime) return 1;
    if (!totalLaps) return null;
    return Math.min(totalLaps, Math.max(1, Math.floor((currentTime / totalDurationMs) * totalLaps) + 1));
  }, [currentTime, totalDurationMs, totalLaps]);

  const togglePlay = () => setIsPlaying((p) => !p);

  const tick = (ts) => {
    if (!lastTickRef.current) lastTickRef.current = ts;
    const elapsed = (ts - lastTickRef.current) * playbackSpeed;
    lastTickRef.current = ts;

    setCurrentTime((prev) => {
      const next = prev + elapsed;
      if (next >= totalDurationMs) {
        setIsPlaying(false);
        return totalDurationMs;
      }
      return next;
    });

    animFrameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return undefined;
    }
    lastTickRef.current = null;
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playbackSpeed, totalDurationMs]);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'ArrowLeft') setCurrentTime((t) => Math.max(0, t - 10_000));
      if (e.code === 'ArrowRight') setCurrentTime((t) => Math.min(totalDurationMs || 0, t + 10_000));
      if (e.key === '+') setPlaybackSpeed((s) => Math.min(16, s * 2));
      if (e.key === '-') setPlaybackSpeed((s) => Math.max(1, s / 2));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [totalDurationMs]);

  useEffect(() => () => abortRef.current?.abort?.(), []);

  const driversByNumber = useMemo(() => {
    const m = {};
    for (const d of openDrivers) {
      const k = String(d.driver_number);
      if (!m[k]) m[k] = d;
    }
    return m;
  }, [openDrivers]);

  const driversAtCurrentTime = useMemo(() => {
    const out = [];
    for (const [dn, points] of Object.entries(locationsByDriver || {})) {
      const pos = interpolatePosition(points, currentTime);
      const meta = driversByNumber[dn] || {};
      if (!pos) continue;
      out.push({
        driver_number: dn,
        nx: pos.nx,
        ny: pos.ny,
        name_acronym: meta.name_acronym || meta.broadcast_name || dn,
        team_name: meta.team_name,
      });
    }
    return out;
  }, [locationsByDriver, currentTime, driversByNumber]);

  const leaderboard = useMemo(() => {
    const rows = [];
    for (const [dn, points] of Object.entries(locationsByDriver || {})) {
      const idx = Math.max(0, binarySearchFirstGreater(points, currentTime) - 1);
      const meta = driversByNumber[dn] || {};
      rows.push({
        driver_number: dn,
        distance: idx,
        name_acronym: meta.name_acronym || dn,
        team_name: meta.team_name,
      });
    }
    rows.sort((a, b) => b.distance - a.distance);

    const leader = rows[0];
    const leaderPoints = leader ? locationsByDriver[String(leader.driver_number)] : null;
    const leaderAvgMsPerPoint = leaderPoints && leaderPoints.length > 2
      ? (leaderPoints[Math.min(leaderPoints.length - 1, 200)].ms - leaderPoints[0].ms) / Math.min(200, leaderPoints.length - 1)
      : 150;

    return rows.map((r, i) => {
      const gapSec = leader ? Math.max(0, (leader.distance - r.distance) * leaderAvgMsPerPoint / 1000) : 0;
      return { ...r, pos: i + 1, gap: i === 0 ? (estLap ? `Lap ${estLap}` : 'Leader') : `+${gapSec.toFixed(1)}s` };
    });
  }, [locationsByDriver, currentTime, driversByNumber, estLap]);

  useEffect(() => {
    if (!selectedDriver && leaderboard?.[0]?.driver_number) setSelectedDriver(String(leaderboard[0].driver_number));
  }, [leaderboard, selectedDriver]);

  const currentTelemetry = useMemo(() => {
    if (!selectedDriver) return null;
    const samples = carByDriver?.[String(selectedDriver)];
    return nearestCarSample(samples, currentTime);
  }, [selectedDriver, currentTime, carByDriver]);

  const safety = useMemo(() => stateAtTime(raceControlTimeline, currentTime), [raceControlTimeline, currentTime]);

  const trackPolyline = useMemo(() => {
    const someDriver = Object.keys(locationsByDriver || {})[0];
    if (!someDriver) return '';
    const pts = downsample(locationsByDriver[someDriver], 1600);
    return pts.map((p) => `${p.nx.toFixed(1)},${p.ny.toFixed(1)}`).join(' ');
  }, [locationsByDriver]);

  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackSpeed(1);
    setSelectedDriver(null);
  };

  const loadReplay = async () => {
    abortRef.current?.abort?.();
    const ac = new AbortController();
    abortRef.current = ac;

    setError('');
    setWarning('');
    setProgress({ location: 0, car: 0, note: '' });
    setIsLoading(true);
    setLoadingMsg('Finding OpenF1 session…');
    resetPlayback();

    const race = (races || []).find((r) => String(r.id) === String(selectedRaceId));
    if (!race) {
      setIsLoading(false);
      setError('Select a race first.');
      return;
    }

    const year = Number(race.season_year);
    const round = race.round;
    if (year && year < 2023) setWarning('OpenF1 covers 2023 onwards — older races may not have replay data.');

    try {
      const SESSION_TYPE_MAP = {
        Race: 'Race',
        Qualifying: 'Qualifying',
        Sprint: 'Sprint',
        'Sprint Qualifying': 'Sprint Shootout',
      };
      const openF1SessionType = SESSION_TYPE_MAP[sessionType] || 'Race';

      const delay = (ms) => new Promise((res) => setTimeout(res, ms));

      const fetchOpenF1 = async (url, retries = 3, waitMs = 2000) => {
        let lastErr = null;
        let backoffMs = waitMs;
        for (let i = 0; i < retries; i++) {
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch(url, { signal: ac.signal });
          if (res.status === 429) {
            setLoadingMsg(`Rate limited by OpenF1 — waiting ${Math.round(backoffMs / 1000)}s before retry…`);
            // eslint-disable-next-line no-await-in-loop
            await delay(backoffMs);
            backoffMs *= 2;
            lastErr = new Error('OpenF1 429 Too Many Requests');
            continue;
          }
          if (!res.ok) {
            const err = new Error(`OpenF1 ${res.status} for ${url}`);
            lastErr = err;
            if (res.status >= 500) {
              setLoadingMsg(`OpenF1 error ${res.status} — retrying…`);
              // eslint-disable-next-line no-await-in-loop
              await delay(Math.min(3000, backoffMs));
              backoffMs *= 2;
              continue;
            }
            throw err;
          }
          return res.json();
        }
        throw lastErr || new Error('OpenF1 rate limit exceeded after retries. Wait 30 seconds and try again.');
      };

      setLoadingMsg('Fetching sessions…');
      const sessions = await fetchOpenF1(
        `https://api.openf1.org/v1/sessions?year=${year}&session_type=${encodeURIComponent(openF1SessionType)}`,
        5,
        1500,
      );

      const raceDate = race?.date ? new Date(`${String(race.date).slice(0, 10)}T00:00:00Z`) : null;
      const matched = (Array.isArray(sessions) && raceDate)
        ? sessions.reduce((best, s) => {
          const ds = s?.date_start ? new Date(s.date_start) : null;
          if (!ds || Number.isNaN(ds.getTime())) return best;
          const diff = Math.abs(ds.getTime() - raceDate.getTime());
          const bestDiff = best?.date_start ? Math.abs(new Date(best.date_start).getTime() - raceDate.getTime()) : Infinity;
          return diff < bestDiff ? s : best;
        }, null)
        : pickBestSessionForRace(race, sessions);

      if (!matched) throw new Error('No OpenF1 session found for this race. OpenF1 covers 2023+.');

      const sessionKey = matched.session_key;
      if (!sessionKey || Number.isNaN(Number(sessionKey))) {
        setError('Could not find OpenF1 session for this race. Try a different session type or a race from 2023 onwards.');
        setIsLoading(false);
        return;
      }

      setSession(matched);
      const sessionStartMs = matched.date_start ? new Date(matched.date_start).getTime() : null;
      if (!sessionStartMs) throw new Error('OpenF1 session missing date_start.');

      if (openF1SessionType === 'Race') {
        setLoadingMsg('Race sessions contain 50,000–500,000+ data points. This may take 30–60 seconds. Qualifying is much faster.');
        // eslint-disable-next-line no-await-in-loop
        await delay(2000);
      }

      setLoadingMsg('Fetching drivers…');
      const driversData = await fetchOpenF1(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`, 5, 1500);
      // eslint-disable-next-line no-await-in-loop
      await delay(500);

      setLoadingMsg('Fetching stints…');
      const stintsData = await fetchOpenF1(`https://api.openf1.org/v1/stints?session_key=${sessionKey}`, 5, 1500);
      // eslint-disable-next-line no-await-in-loop
      await delay(500);

      setLoadingMsg('Fetching race control…');
      const raceControlData = await fetchOpenF1(`https://api.openf1.org/v1/race_control?session_key=${sessionKey}`, 5, 1500);
      // eslint-disable-next-line no-await-in-loop
      await delay(500);

      setLoadingMsg('Fetching location data (this is the large one)…');
      const locationData = await fetchOpenF1(`https://api.openf1.org/v1/location?session_key=${sessionKey}`, 5, 2000);
      // eslint-disable-next-line no-await-in-loop
      await delay(1000);

      setLoadingMsg('Fetching car telemetry…');
      const carData = await fetchOpenF1(`https://api.openf1.org/v1/car_data?session_key=${sessionKey}`, 5, 2000);

      setProgress((p) => ({
        ...p,
        location: Array.isArray(locationData) ? locationData.length : 0,
        car: Array.isArray(carData) ? carData.length : 0,
        note: (Array.isArray(locationData) && locationData.length >= 50_000) ? 'Large dataset — race sessions can take a while.' : p.note,
      }));

      const uniqueDrivers = [];
      const seen = new Set();
      for (const d of driversData || []) {
        const dn = d?.driver_number;
        if (dn == null) continue;
        const k = String(dn);
        if (seen.has(k)) continue;
        seen.add(k);
        uniqueDrivers.push(d);
      }

      setOpenDrivers(uniqueDrivers);
      setStintsByDriver(groupByDriverNumber(stintsData || []));
      setRaceControlTimeline(normalizeRaceControl(raceControlData || [], sessionStartMs));

      setLoadingMsg('Processing telemetry…');

      const { byDriver, totalDurationMs: dur } = normalizeAndGroupLocations(locationData || [], sessionStartMs);
      const carBy = normalizeCarData(carData || [], sessionStartMs);

      setLocationsByDriver(byDriver);
      setCarByDriver(carBy);
      setTotalDurationMs(dur || 0);

      if ((locationData || []).length >= 200_000) {
        setWarning('Loaded a very large replay dataset. If performance is slow, try Qualifying or Sprint sessions.');
      }

      setLoadingMsg('');
      setIsLoading(false);
    } catch (e) {
      if (ac.signal.aborted) return;
      setIsLoading(false);
      setLoadingMsg('');
      setError(e?.message || 'Failed to load replay.');
    }
  };

  const replayReady = !!totalDurationMs && Object.keys(locationsByDriver || {}).length > 0;
  const selectedDriverMeta = selectedDriver ? (driversByNumber[String(selectedDriver)] || null) : null;
  const selectedTyre = selectedDriver && estLap ? tyreForLap(stintsByDriver, selectedDriver, estLap) : null;

  const speedButtons = [1, 2, 4, 8, 16];

  return (
    <div className="race-replay-page" style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 'calc(100vh - 96px)' }}>
      <div
        className="replay-head"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="page-title" style={{ fontSize: 26 }}>Race Replay</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
            OpenF1-powered — animated replay rendered with SVG in the browser
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="view-toggle" aria-label="Session type">
            {['Race', 'Qualifying', 'Sprint'].map((t) => (
              <button
                key={t}
                type="button"
                className={`view-toggle__btn ${sessionType === t ? 'is-active' : ''}`}
                onClick={() => setSessionType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <select
            value={selectedRaceId}
            onChange={(e) => setSelectedRaceId(e.target.value)}
            style={{
              minWidth: 280,
              maxWidth: 460,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              outline: 'none',
            }}
            aria-label="Select race"
          >
            {sortedRaces.map((r) => (
              <option key={r.id} value={r.id}>{fmtRaceLabel(r)}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadReplay}
            disabled={isLoading || !selectedRaceId}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.10)',
              background: isLoading ? 'rgba(255,255,255,0.08)' : 'var(--red)',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--sans)',
              fontWeight: 900,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              fontSize: 11,
            }}
          >
            {isLoading ? 'Loading…' : 'Load Replay'}
          </button>
        </div>
      </div>

      {warning ? (
        <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,214,10,0.10)', border: '1px solid rgba(255,214,10,0.22)', color: '#ffd60a', fontFamily: 'var(--mono)', fontSize: 12 }}>
          {warning}
        </div>
      ) : null}

      {error ? (
        <div className="error-msg" style={{ margin: '14px 0 0', padding: '12px 12px', borderRadius: 12, background: 'rgba(232,0,45,0.10)', border: '1px solid rgba(232,0,45,0.22)', color: 'white', fontFamily: 'var(--mono)' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Failed to load replay</div>
          <div style={{ fontSize: 12 }}>{error}</div>
          {String(error).toLowerCase().includes('429') || String(error).toLowerCase().includes('rate') ? (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--sub)' }}>
              Tip: OpenF1 limits free API usage. Wait 30–60 seconds then try again. Qualifying sessions use less data and load faster than full races.
            </div>
          ) : String(error).toLowerCase().includes('404') || String(error).toLowerCase().includes('session') || String(error).toLowerCase().includes('2023') ? (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--sub)' }}>
              Tip: OpenF1 only covers sessions from 2023 onwards. Try selecting a race from the 2023+ season, or switch session type.
            </div>
          ) : null}
        </div>
      ) : null}

      {!replayReady && !isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.35)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 30, textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>🏎</span>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 13 }}>
              Select a race and click Load Replay
            </p>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11, maxWidth: 560 }}>
              Tip: Qualifying loads faster. Race sessions can be very large (50k+ location rows).
            </p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.35)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30, textAlign: 'center' }}>
            <span className="spinner spinner-lg" />
            <p style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              {loadingMsg || 'Connecting to OpenF1…'}
            </p>
            {(progress.location || progress.car) ? (
              <p style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11 }}>
                Location: {progress.location.toLocaleString()} • Car: {progress.car.toLocaleString()}
              </p>
            ) : null}
            {progress.note ? (
              <p style={{ color: 'var(--muted)', fontSize: 11 }}>
                {progress.note}
              </p>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: 11 }}>
                OpenF1 is a free public API — rate limits apply. If you see errors, wait 30 seconds and try again.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {replayReady ? (
        <div className="replay-grid" style={{ flex: 1, minHeight: 520 }}>
          <div
            className="replay-canvas"
            style={{
              borderRadius: 16,
              border: '1px solid var(--line)',
              background: 'var(--bg)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <svg viewBox="0 0 1000 600" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
              <rect x="0" y="0" width="1000" height="600" fill="var(--bg)" />

              {selectedCircuit?.layout_url ? (
                <image
                  href={selectedCircuit.layout_url}
                  x="50"
                  y="50"
                  width="900"
                  height="500"
                  opacity="0.15"
                  style={{ filter: 'invert(var(--circuit-invert))' }}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <polyline points={trackPolyline} stroke="var(--line2)" strokeWidth="3" fill="none" />
              )}

              {(safety.sc || safety.vsc) ? (
                <text
                  x="500"
                  y="30"
                  textAnchor="middle"
                  fill="#ffd60a"
                  fontSize="14"
                  fontFamily="var(--sans)"
                  fontWeight="800"
                  letterSpacing="0.1em"
                >
                  ⚠ {safety.sc ? 'SAFETY CAR' : 'VSC'}
                </text>
              ) : null}

              {driversAtCurrentTime.map((d) => {
                const color = getTeamColor(d.team_name);
                const isSel = String(d.driver_number) === String(selectedDriver);
                return (
                  <g key={d.driver_number} opacity={isSel ? 1 : 0.92}>
                    <circle cx={d.nx} cy={d.ny} r={isSel ? 9 : 8} fill={color} opacity={0.9} />
                    <circle cx={d.nx} cy={d.ny} r={isSel ? 18 : 14} fill={color} opacity={0.15} />
                    <text
                      x={d.nx}
                      y={d.ny - 14}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      fontFamily="var(--mono)"
                      fontWeight="600"
                    >
                      {d.name_acronym}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            className="replay-side"
            style={{
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(0,0,0,0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 520,
            }}
          >
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 12, letterSpacing: '0.12em', color: 'var(--muted)' }}>
                LEADERBOARD
              </div>
            </div>

            <div style={{ padding: '0 14px', overflowY: 'auto', maxHeight: 300 }}>
              {leaderboard.slice(0, 24).map((d) => {
                const teamColor = getTeamColor(d.team_name);
                const tyre = tyreForLap(stintsByDriver, d.driver_number, estLap);
                const tyreColor = tyre ? (TYRE_COLORS[tyre] || '#ffffff') : 'var(--muted)';
                return (
                  <div
                    key={d.driver_number}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      background: String(selectedDriver) === String(d.driver_number) ? 'rgba(255,255,255,0.05)' : 'transparent',
                    }}
                    onClick={() => setSelectedDriver(String(d.driver_number))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedDriver(String(d.driver_number));
                    }}
                    title="Select driver"
                  >
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--muted)', width: 22 }}>{d.pos}</span>
                    <div style={{ width: 3, height: 22, borderRadius: 2, background: teamColor, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: teamColor, width: 32 }}>{d.name_acronym}</span>
                    <span style={{ fontSize: 10, color: tyreColor }}>{tyre || '—'}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)', marginLeft: 'auto' }}>
                      {d.gap}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 12, letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 10 }}>
                TELEMETRY
              </div>

              {selectedDriver && currentTelemetry ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11 }}>Speed</div>
                      <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 32, color: 'var(--red)', lineHeight: 1 }}>
                        {Number.isFinite(currentTelemetry.speed) ? Math.round(currentTelemetry.speed) : '—'}
                        <span style={{ fontSize: 12, marginLeft: 6, color: 'var(--muted)', fontFamily: 'var(--mono)', fontWeight: 700 }}>km/h</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                      <div style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11 }}>Gear</div>
                      <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 32, color: 'var(--text)', lineHeight: 1 }}>
                        {Number.isFinite(currentTelemetry.n_gear) ? currentTelemetry.n_gear : '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>DRS</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: currentTelemetry.drs ? 'var(--green)' : 'var(--muted)' }}>
                      {currentTelemetry.drs ? 'ON' : 'OFF'}
                    </div>
                  </div>

                  <Bar label="Throttle" value={currentTelemetry.throttle} color="var(--green)" />
                  <Bar label="Brake" value={currentTelemetry.brake} color="var(--red)" />

                  <div style={{ fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: 11 }}>
                    {selectedDriverMeta?.name_acronym || selectedDriver} • {selectedTyre ? `Tyre ${selectedTyre}` : 'Tyre —'}
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>
                  Select a driver in the leaderboard to view telemetry.
                </div>
              )}
            </div>
          </div>

          <div className="replay-controls">
            <div className="replay-controls__row">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {[
                  { icon: '⏮', action: () => setCurrentTime(0), title: 'Restart' },
                  { icon: '⏪', action: () => setCurrentTime((t) => Math.max(0, t - 30_000)), title: '-30s' },
                  { icon: isPlaying ? '⏸' : '▶', action: togglePlay, title: 'Play/Pause' },
                  { icon: '⏩', action: () => setCurrentTime((t) => Math.min(totalDurationMs, t + 30_000)), title: '+30s' },
                ].map((b) => (
                  <button
                    key={b.title}
                    type="button"
                    onClick={b.action}
                    title={b.title}
                    className="replay-btn"
                  >
                    {b.icon}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>Speed:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {speedButtons.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPlaybackSpeed(s)}
                      className={`speed-pill ${playbackSpeed === s ? 'is-active' : ''}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={totalDurationMs}
              value={Math.min(totalDurationMs, Math.max(0, currentTime))}
              onChange={(e) => setCurrentTime(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--red)' }}
              aria-label="Replay progress"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--sub)' }}>
              <span>{totalLaps ? `Lap ${estLap || 1} / ${totalLaps}` : (estLap ? `Lap ${estLap}` : 'Replay')}</span>
              <span>{formatClock(currentTime)} / {formatClock(totalDurationMs)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'none' }} aria-hidden="true">{session?.session_key}{drivers?.length}</div>
    </div>
  );
}
