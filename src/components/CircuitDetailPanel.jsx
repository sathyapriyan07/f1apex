import { useEffect, useMemo, useState } from 'react';
import { db, circuit_detail } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CircuitLayout, DriverPhoto } from './Images';

function TabButton({ id, active, onClick, children }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: '8px 10px',
        background: active ? 'rgba(220,38,38,.14)' : 'transparent',
        border: `1px solid ${active ? 'rgba(220,38,38,.35)' : 'var(--line2)'}`,
        borderRadius: 6,
        color: active ? '#fff' : 'var(--sub)',
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        fontWeight: 800,
        fontSize: 11,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        transition: 'all .12s',
      }}
    >
      {children}
    </button>
  );
}

function StatCounter({ label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 10px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '.09em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{value ?? '—'}</div>
    </div>
  );
}

function formatLapTime(ms) {
  if (!ms) return '—';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
}

function RaceHistoryRow({ race, winner }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 12,
      padding: 12,
      border: '1px solid var(--line)',
      borderRadius: 10,
      background: 'rgba(255,255,255,.02)',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            {race.season_year} · R{race.round}
          </span>
          {race.sprint ? <span className="badge badge-yellow">Sprint</span> : null}
        </div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{race.name || 'Race'}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>
          {race.date || '—'}
        </div>
      </div>
      {winner ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Winner</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DriverPhoto src={winner.drivers?.image_url} name={`${winner.drivers?.first_name} ${winner.drivers?.last_name}`} size={22} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{winner.drivers?.first_name} {winner.drivers?.last_name}</span>
              <span style={{ fontSize: 10, color: 'var(--sub)' }}>{winner.teams?.name || ''}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecordCard({ title, records, renderItem }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,.03)', borderBottom: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {title}
      </div>
      {records.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No data available</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {records.map(renderItem)}
        </div>
      )}
    </div>
  );
}

function DriverWinsRow({ record, index }) {
  const driver = record.drivers;
  const wins = record.count;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 36px 1fr auto',
      gap: 10,
      padding: '8px 12px',
      borderBottom: '1px solid var(--line)',
      alignItems: 'center',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>#{index + 1}</div>
      <DriverPhoto src={driver?.image_url} name={`${driver?.first_name} ${driver?.last_name}`} size={32} />
      <div style={{ fontSize: 12, fontWeight: 600 }}>{driver?.first_name} {driver?.last_name}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{wins} W</div>
    </div>
  );
}

function DriverAppearancesRow({ record, index }) {
  const driver = record.drivers;
  const appearances = record.count;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 36px 1fr auto',
      gap: 10,
      padding: '8px 12px',
      borderBottom: '1px solid var(--line)',
      alignItems: 'center',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>#{index + 1}</div>
      <DriverPhoto src={driver?.image_url} name={`${driver?.first_name} ${driver?.last_name}`} size={32} />
      <div style={{ fontSize: 12, fontWeight: 600 }}>{driver?.first_name} {driver?.last_name}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{appearances}</div>
    </div>
  );
}

export default function CircuitDetailPanel({ circuitId, onClose, onEdit, mode = 'panel' }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('history');
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
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'rgba(17,17,19,.9)',
          borderBottom: '1px solid var(--line)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>Back</button>
            <div style={{ fontWeight: 900, letterSpacing: '-.01em' }}>{title}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin && circuit ? (
              <button className="btn btn-blue btn-xs" onClick={() => onEdit?.(circuit)}>Edit Circuit</button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><span className="spinner spinner-lg" /></div>
        ) : error ? (
          <div style={{ padding: 16 }}><div className="error-msg">{error}</div></div>
        ) : circuit ? (
          <div>
            <div style={{
              padding: '18px 16px 16px',
              borderBottom: '1px solid var(--line)',
              background: 'linear-gradient(180deg, rgba(220,38,38,.12), rgba(0,0,0,0))',
            }}>
              <div style={{
                height: 140,
                background: 'var(--bg3)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {circuit.layout_url ? (
                  <img
                    src={circuit.layout_url}
                    alt={`${circuit.name} layout`}
                    style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', filter: 'invert(1) opacity(.7)' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>NO LAYOUT</span>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 22, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1.1 }}>
                  {circuit.name}
                </div>
                <div style={{ marginTop: 4, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--sub)' }}>
                  {circuit.locality}{circuit.country ? `, ${circuit.country}` : ''}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                <StatCounter label="Total Races" value={computed.totalRaces} />
                <StatCounter label="First Year" value={computed.firstYear} />
                <StatCounter label="Latest Year" value={computed.lastYear} />
                <StatCounter label="Length km" value={circuit.length_km ? `${circuit.length_km}` : null} />
              </div>

              {(circuit.lat || circuit.lng) ? (
                <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {circuit.lat}, {circuit.lng}
                </div>
              ) : null}
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
              <TabButton id="history" active={tab === 'history'} onClick={setTab}>Race History</TabButton>
              <TabButton id="records" active={tab === 'records'} onClick={setTab}>Records</TabButton>
              <TabButton id="info" active={tab === 'info'} onClick={setTab}>Info</TabButton>
            </div>

            <div style={{ padding: '16px 16px 24px' }}>
              {tab === 'history' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {races.length === 0 ? (
                    <div className="info-msg">No races found for this circuit.</div>
                  ) : (
                    races.map(race => (
                      <RaceHistoryRow key={race.id} race={race} winner={winnerMap.get(race.id)} />
                    ))
                  )}
                </div>
              ) : null}

              {tab === 'records' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {fastestLap ? (
                    <RecordCard title="Fastest Lap Ever" records={[fastestLap]}>
                      <div style={{
                        padding: '10px 12px',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 10,
                        alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {fastestLap.drivers?.first_name} {fastestLap.drivers?.last_name}
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>
                            Season {fastestLap.races?.season_year}
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                          {formatLapTime(fastestLap.lap_duration_ms)}
                        </div>
                      </div>
                    </RecordCard>
                  ) : null}

                  <RecordCard title="Most Wins at This Circuit" records={winsCounted}>
                    {winsCounted.map((record, i) => (
                      <DriverWinsRow key={record.driver_id} record={record} index={i} />
                    ))}
                  </RecordCard>

                  <RecordCard title="Most Appearances" records={appearancesCounted}>
                    {appearancesCounted.map((record, i) => (
                      <DriverAppearancesRow key={record.driver_id} record={record} index={i} />
                    ))}
                  </RecordCard>
                </div>
              ) : null}

              {tab === 'info' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {[
                          ['Full Name', circuit.name || '—'],
                          ['City', circuit.locality || '—'],
                          ['Country', circuit.country || '—'],
                          ['Latitude', circuit.lat ?? '—'],
                          ['Longitude', circuit.lng ?? '—'],
                          ['Length', circuit.length_km ? `${circuit.length_km} km` : '—'],
                        ].map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', borderBottom: '1px solid var(--line)', width: 110 }}>{k}</td>
                            <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--text)' }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {circuit.layout_url ? (
                    <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={circuit.layout_url}
                        alt={`${circuit.name} layout`}
                        style={{ width: '100%', display: 'block', filter: 'invert(1) opacity(.5)' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        pointerEvents: 'none',
                      }} />
                    </div>
                  ) : null}

                  {(circuit.lat && circuit.lng) ? (
                    <div style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                        Coordinates
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text)' }}>
                        {circuit.lat}, {circuit.lng}
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${circuit.lat},${circuit.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-xs"
                        style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        Open in Google Maps ↗
                      </a>
                    </div>
                  ) : null}

                  {circuit.wiki_url ? (
                    <a className="btn btn-ghost" href={circuit.wiki_url} target="_blank" rel="noreferrer" style={{ width: 'fit-content' }}>
                      Wikipedia
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </PanelTag>
    </Wrapper>
  );
}
