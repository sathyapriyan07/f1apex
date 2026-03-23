import { useEffect, useMemo, useState } from 'react';
import { db, circuit_detail } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { DriverPhoto } from './Images';
import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from './Accordion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

function formatLapTime(ms) {
  if (!ms) return '—';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

function RaceHistoryRow({ race, winner }) {
  const winnerName = winner?.drivers ? `${winner.drivers.first_name || ''} ${winner.drivers.last_name || ''}`.trim() : '';
  return (
    <div className="detail-tv__row circuit-tv__raceRow">
      <div className="circuit-tv__raceKey">
        <span className="detail-tv__monoRed">{race.season_year ?? '—'}</span>
        <span className="detail-tv__monoSep">·</span>
        <span>R{race.round ?? '—'}</span>
        {race.sprint ? <span className="detail-tv__sprint">Sprint</span> : null}
      </div>

      <div className="circuit-tv__raceMain">
        <div className="circuit-tv__raceName" title={race.name || ''}>{race.name || 'Race'}</div>
        <div className="circuit-tv__raceDate">{race.date || '—'}</div>
      </div>

      {winner ? (
        <div className="circuit-tv__raceWinner">
          <div className="detail-tv__kicker">WINNER</div>
          <div className="circuit-tv__raceWinnerRow">
            <DriverPhoto src={winner.drivers?.image_url} name={winnerName} size={28} rounded />
            <div className="circuit-tv__raceWinnerText">
              <div className="circuit-tv__raceWinnerName" title={winnerName}>{winnerName || '—'}</div>
              <div className="circuit-tv__raceWinnerTeam" title={winner.teams?.name || ''}>{winner.teams?.name || ''}</div>
            </div>
          </div>
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}

function RecordCard({ title, records, renderItem }) {
  return (
    <div className="detail-tv__section">
      <div className="detail-tv__sectionTitle">{title}</div>
      {records.length === 0 ? <div className="info-msg">No data available</div> : <div className="detail-tv__rows">{records.map(renderItem)}</div>}
    </div>
  );
}

function DriverWinsRow({ record, index }) {
  const driver = record.drivers;
  const wins = record.count;
  const name = driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : '';
  return (
    <div className="detail-tv__row detail-tv__recordRow">
      <div className="detail-tv__monoMuted">#{index + 1}</div>
      <DriverPhoto src={driver?.image_url} name={name} size={28} rounded />
      <div className="detail-tv__rowTitle" title={name}>{name || '—'}</div>
      <div className="detail-tv__rowRight">{wins} W</div>
    </div>
  );
}

function DriverAppearancesRow({ record, index }) {
  const driver = record.drivers;
  const appearances = record.count;
  const name = driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : '';
  return (
    <div className="detail-tv__row detail-tv__recordRow">
      <div className="detail-tv__monoMuted">#{index + 1}</div>
      <DriverPhoto src={driver?.image_url} name={name} size={28} rounded />
      <div className="detail-tv__rowTitle" title={name}>{name || '—'}</div>
      <div className="detail-tv__rowRight">{appearances}</div>
    </div>
  );
}

export default function CircuitDetailPanel({ circuitId, onClose, onEdit, onDelete, mode = 'panel' }) {
  const { isAdmin } = useAuth();
  const [circuit, setCircuit] = useState(null);
  const [races, setRaces] = useState([]);
  const [raceWinners, setRaceWinners] = useState([]);
  const [lapRecords, setLapRecords] = useState([]);
  const [mostWins, setMostWins] = useState([]);
  const [mostAppearances, setMostAppearances] = useState([]);
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
      const [c, rr, rw, lr, mw, ma] = await Promise.all([
        db.circuits.byId(circuitId),
        circuit_detail.races(circuitId),
        circuit_detail.raceWinners(circuitId),
        circuit_detail.lapRecords(circuitId),
        circuit_detail.mostWins(circuitId),
        circuit_detail.mostAppearances(circuitId),
      ]);
      if (!alive) return;
      if (c.error) { setError(c.error.message); setLoading(false); return; }
      setCircuit(c.data);
      setRaces(rr.data || []);
      setRaceWinners(rw.data || []);
      setLapRecords(lr.data || []);
      setMostWins(mw.data || []);
      setMostAppearances(ma.data || []);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [circuitId]);

  const computed = useMemo(() => {
    const totalRaces = races.length;
    const years = races.map(r => r.season_year).filter(y => y != null);
    const firstYear = years.length ? Math.min(...years) : null;
    const lastYear = years.length ? Math.max(...years) : null;
    return { totalRaces, firstYear, lastYear };
  }, [races]);

  const winnerMap = useMemo(() => {
    const map = new Map();
    for (const w of raceWinners) {
      if (w.race_id) map.set(w.race_id, w);
    }
    return map;
  }, [raceWinners]);

  const winsCounted = useMemo(() => {
    const counts = {};
    for (const w of mostWins) {
      const id = w.driver_id;
      if (!counts[id]) {
        counts[id] = { ...w, count: 0 };
      }
      counts[id].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [mostWins]);

  const appearancesCounted = useMemo(() => {
    const counts = {};
    for (const a of mostAppearances) {
      const id = a.driver_id;
      if (!counts[id]) {
        counts[id] = { ...a, count: 0 };
      }
      counts[id].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [mostAppearances]);

  const fastestLap = lapRecords[0] || null;

  const title = circuit?.name || 'Circuit';

  const Wrapper = mode === 'panel' ? 'div' : 'div';
  const PanelTag = mode === 'panel' ? 'aside' : 'div';
  const wrapperProps = mode === 'panel'
    ? { className: 'slidein-backdrop', onMouseDown: onClose, 'aria-label': 'Close circuit panel' }
    : {};
  const panelProps = mode === 'panel'
    ? { className: 'slidein-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onMouseDown: (e) => e.stopPropagation() }
    : { className: 'card', style: { width: '100%', overflow: 'hidden' } };

  return (
    <Wrapper {...wrapperProps}>
      <PanelTag {...panelProps}>
        <div className="detail-tv circuit-tv">
          <div className="detail-tv__topbar">
            <button type="button" className="detail-tv__back" onClick={onClose}>
              <ArrowBackIcon sx={{ fontSize: 14 }} /> Circuits
            </button>
            <div className="detail-tv__topTitle" title={title}>
              {title}
            </div>
            {isAdmin && circuit ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="detail-tv__edit" onClick={() => onEdit?.(circuit)}>
                  Edit Circuit
                </button>
                {onDelete && (
                  <button type="button" className="detail-tv__edit" style={{ background: 'rgba(232,0,45,0.2)', color: '#ff4d6d' }}
                    onClick={async () => {
                      if (!confirm(`Delete ${circuit.name}?`)) return;
                      await onDelete(circuit.id);
                      onClose?.();
                    }}>
                    Delete
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}
          </div>

          {loading ? (
            <div className="detail-tv__loading">
              <span className="spinner spinner-lg" />
            </div>
          ) : error ? (
            <div style={{ padding: 16 }}>
              <div className="error-msg">{error}</div>
            </div>
          ) : circuit ? (
            <div className="detail-tv__content">
              <div className="detail-tv__contentBar">
                <button type="button" className="detail-tv__back" onClick={onClose}>
                  <ArrowBackIcon sx={{ fontSize: 14 }} /> Back
                </button>
                {isAdmin ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="detail-tv__edit" onClick={() => onEdit?.(circuit)}>
                      Edit Circuit
                    </button>
                    {onDelete && (
                      <button type="button" className="detail-tv__edit" style={{ background: 'rgba(232,0,45,0.2)', color: '#ff4d6d' }}
                        onClick={async () => {
                          if (!confirm(`Delete ${circuit.name}?`)) return;
                          await onDelete(circuit.id);
                          onClose?.();
                        }}>
                        Delete
                      </button>
                    )}
                  </div>
                ) : (
                  <div />
                )}
              </div>
              <section className="circuit-tv__hero">
                <div className="circuit-tv__heroGlow" aria-hidden="true" />
                {circuit.layout_url ? (
                  <img
                    className="circuit-tv__heroImg"
                    src={circuit.layout_url}
                    alt={`${circuit.name} layout`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <div className="circuit-tv__heroOverlay">
                  <div className="circuit-tv__heroTitle">{circuit.name}</div>
                  <div className="circuit-tv__heroSub">
                    {circuit.locality || '—'}
                    {circuit.country ? `, ${circuit.country}` : ''}
                  </div>
                </div>
              </section>

              <div className="detail-tv__stats">
                <div className="detail-tv__stat">
                  <div className="detail-tv__statLabel">Total Races</div>
                  <div className="detail-tv__statValue">{computed.totalRaces ?? '—'}</div>
                </div>
                <div className="detail-tv__vdiv" />
                <div className="detail-tv__stat">
                  <div className="detail-tv__statLabel">First Year</div>
                  <div className="detail-tv__statValue">{computed.firstYear ?? '—'}</div>
                </div>
                <div className="detail-tv__vdiv" />
                <div className="detail-tv__stat">
                  <div className="detail-tv__statLabel">Latest Year</div>
                  <div className="detail-tv__statValue">{computed.lastYear ?? '—'}</div>
                </div>
                <div className="detail-tv__vdiv" />
                <div className="detail-tv__stat">
                  <div className="detail-tv__statLabel">Length</div>
                  <div className="detail-tv__statValue">{circuit.length_km ? `${circuit.length_km} km` : '—'}</div>
                </div>
              </div>

              <div className="detail-tv__tabs" style={{ padding: '0 24px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 0 }}>
                <Accordion defaultOpen="history" style={{ width: '100%', padding: '0 24px' }}>
                  <AccordionItem value="history">
                    <AccordionTrigger>Race History</AccordionTrigger>
                    <AccordionPanel>
                      <div className="detail-tv__rows">
                        {races.length === 0 ? (
                          <div className="info-msg">No races found for this circuit.</div>
                        ) : (
                          races.map((race) => <RaceHistoryRow key={race.id} race={race} winner={winnerMap.get(race.id)} />)
                        )}
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem value="records">
                    <AccordionTrigger>Records</AccordionTrigger>
                    <AccordionPanel>
                      <div className="detail-tv__stack">
                        {fastestLap ? (
                          <div className="detail-tv__section">
                            <div className="detail-tv__sectionTitle">Fastest Lap Ever</div>
                            <div className="detail-tv__row detail-tv__recordRow">
                              <div className="detail-tv__rowTitle">
                                {fastestLap.drivers ? `${fastestLap.drivers.first_name} ${fastestLap.drivers.last_name}` : '—'}
                                <div className="detail-tv__rowSub">Season {fastestLap.races?.season_year ?? '—'}</div>
                              </div>
                              <div className="detail-tv__time">{formatLapTime(fastestLap.lap_duration_ms)}</div>
                            </div>
                          </div>
                        ) : null}
                        <RecordCard title="Most Wins at This Circuit" records={winsCounted} renderItem={(record, i) => (
                          <DriverWinsRow key={record.driver_id || i} record={record} index={i} />
                        )} />
                        <RecordCard title="Most Appearances" records={appearancesCounted} renderItem={(record, i) => (
                          <DriverAppearancesRow key={record.driver_id || i} record={record} index={i} />
                        )} />
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem value="info" style={{ borderBottom: 'none' }}>
                    <AccordionTrigger>Circuit Info</AccordionTrigger>
                    <AccordionPanel>
                      <div className="detail-tv__stack">
                        <div className="detail-tv__kv">
                          {[
                            ['Full Name', circuit.name || '—'],
                            ['City', circuit.locality || '—'],
                            ['Country', circuit.country || '—'],
                            ['Length', circuit.length_km ? `${circuit.length_km} km` : '—'],
                            ['Latitude', circuit.lat ?? '—'],
                            ['Longitude', circuit.lng ?? '—'],
                          ].map(([k, v], idx) => (
                            <div key={k} className={`detail-tv__kvRow ${idx % 2 ? 'is-alt' : ''}`}>
                              <div className="detail-tv__kvKey">{k}</div>
                              <div className="detail-tv__kvVal">{v}</div>
                            </div>
                          ))}
                          {(circuit.lat && circuit.lng) ? (
                            <div className="detail-tv__kvRow is-alt">
                              <div className="detail-tv__kvKey">Maps</div>
                              <div className="detail-tv__kvVal">
                                <a className="detail-tv__link" href={`https://www.google.com/maps?q=${circuit.lat},${circuit.lng}`} target="_blank" rel="noreferrer">
                                  Open in Google Maps <OpenInNewIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} />
                                </a>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        {circuit.layout_url ? (
                          <div className="circuit-tv__layoutWide">
                            <img src={circuit.layout_url} alt={`${circuit.name} layout`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          </div>
                        ) : null}
                        {circuit.wiki_url ? (
                          <a className="detail-tv__pill" href={circuit.wiki_url} target="_blank" rel="noreferrer">
                            <OpenInNewIcon sx={{ fontSize: 12, verticalAlign: 'middle' }} /> Wikipedia
                          </a>
                        ) : null}
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
            </div>
          ) : null}
        </div>
      </PanelTag>
    </Wrapper>
  );
}
