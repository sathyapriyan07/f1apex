// src/pages/RaceResults.jsx
import { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { Loader, Empty } from './Drivers';
import { DriverPhoto, TeamLogo } from '../components/Images';
import DriverDetailPanel from '../components/DriverDetailPanel';

const POSITION_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const STATUS_OPTIONS = ['Finished', '+1 Lap', '+2 Laps', 'DNF', 'DNS', 'DSQ', 'Accident', 'Engine', 'Gearbox', 'Hydraulics', 'Brakes', 'Electrical', 'Retired'];

export default function RaceResultsPage({ races, drivers, teams }) {
  const { isAdmin } = useAuth();
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState(null);

  // Sort races newest first
  const sortedRaces = [...races].sort((a, b) => b.season_year - a.season_year || a.round - b.round);

  const loadResults = async (raceId) => {
    if (!raceId) return;
    setLoading(true); setError('');
    const { data, error } = await db.race_results.listByRace(raceId);
    if (error) setError(error.message);
    else setResults(data || []);
    setLoading(false);
  };

  useEffect(() => { if (selectedRaceId) loadResults(selectedRaceId); }, [selectedRaceId]);

  const save = async (formData) => {
    setSaving(true); setError('');
    const payload = { ...formData, race_id: selectedRaceId };
    let result;
    if (modal.mode === 'add') result = await db.race_results.insert(payload);
    else result = await db.race_results.update(modal.data.id, payload);
    if (result.error) { setError(result.error.message); setSaving(false); return; }
    await loadResults(selectedRaceId);
    setModal(null); setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Delete this result?')) return;
    await db.race_results.remove(id);
    setResults(r => r.filter(x => x.id !== id));
  };

  const selectedRace = races.find(r => r.id === selectedRaceId);

  // Medal colors
  const posColor = (pos) => pos === 1 ? '#f5c518' : pos === 2 ? '#c0c0c0' : pos === 3 ? '#cd7f32' : 'var(--muted)';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-subtitle">Results</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>
            Race <span style={{ color: 'var(--red)' }}>Results</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedRaceId} onChange={e => setSelectedRaceId(e.target.value)} style={{ minWidth: 280 }}>
            <option value="">— Select a Race —</option>
            {sortedRaces.map(r => (
              <option key={r.id} value={r.id}>{r.season_year} R{r.round} – {r.name}</option>
            ))}
          </select>
          {isAdmin && selectedRaceId && (
            <button className="btn btn-red" onClick={() => setModal({ mode: 'add', data: {} })}>+ Add Result</button>
          )}
        </div>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

      {!selectedRaceId && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <span style={{ fontSize: 52 }}>🏁</span>
          <p style={{ color: 'var(--muted)', marginTop: 12 }}>Select a race to view results</p>
        </div>
      )}

      {selectedRaceId && selectedRace && (
        <div style={{ marginBottom: 16 }} className="card">
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Info label="Circuit"  val={selectedRace.circuits?.name || '—'} />
            <Info label="Date"     val={selectedRace.date || '—'} />
            <Info label="Season"   val={selectedRace.season_year} />
            <Info label="Round"    val={selectedRace.round} />
            <Info label="Sprint"   val={selectedRace.sprint ? 'Yes' : 'No'} />
            <Info label="Results"  val={results.length} />
          </div>
        </div>
      )}

      {selectedRaceId && (
        loading ? <Loader /> : results.length === 0
          ? <Empty icon="📋" label="No results for this race" />
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pos</th><th>Driver</th><th>Code</th><th>Team</th>
                    <th>Grid</th><th>Pts</th><th>Status</th>
                    <th>Gap / Time</th><th>FL</th><th>Laps</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id}>
                      <td>
                        <span style={{
                          fontFamily: "'Barlow Condensed'", fontWeight: 900, fontSize: 18,
                          color: posColor(r.position),
                        }}>
                          {r.position ?? 'DNF'}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                          onClick={() => r.drivers?.id && setDetailId(r.drivers.id)}
                        >
                          <DriverPhoto src={r.drivers?.image_url} name={`${r.drivers?.first_name} ${r.drivers?.last_name}`} size={28} />
                          <b>{r.drivers?.first_name} {r.drivers?.last_name}</b>
                        </div>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>{r.drivers?.code || '—'}</span></td>
                      <td>
                        {r.teams?.logo_url ? (
                          <TeamLogo src={r.teams.logo_url} name={r.teams?.name} size={24} />
                        ) : (
                          <span>{r.teams?.name || '—'}</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{r.grid_position ?? '—'}</td>
                      <td>
                        <span className={`badge ${r.points > 0 ? 'badge-yellow' : 'badge-muted'}`}>
                          {r.points ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.status === 'Finished' ? 'badge-green' : r.status?.startsWith('+') ? 'badge-blue' : 'badge-red'}`}>
                          {r.status || '—'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.time_or_gap || '—'}</td>
                      <td>{r.fastest_lap ? <span title={r.fastest_lap_time} style={{ color: 'var(--accent)', fontSize: 16 }}>⚡</span> : '—'}</td>
                      <td>{r.laps_completed ?? '—'}</td>
                      {isAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setModal({ mode: 'edit', data: r })}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Del</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Race Result' : 'Edit Race Result'} onClose={() => setModal(null)}>
          <ResultForm
            initial={modal.data}
            drivers={drivers} teams={teams}
            onSave={save} onCancel={() => setModal(null)}
            saving={saving} error={error}
          />
        </Modal>
      )}
      {detailId && (
        <DriverDetailPanel
          driverId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

function Info({ label, val }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
      <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15 }}>{val}</span>
    </div>
  );
}

function ResultForm({ initial, drivers, teams, onSave, onCancel, saving, error }) {
  const [f, setF] = useState(() => {
    const merged = {
      driver_id: '', team_id: '', position: '', grid_position: '',
      points: '', status: 'Finished', fastest_lap: false,
      fastest_lap_time: '', laps_completed: '', time_or_gap: '',
      ...initial,
    };
    return {
      ...merged,
      driver_id: merged.driver_id || merged.drivers?.id || '',
      team_id: merged.team_id || merged.teams?.id || '',
    };
  });
  const set  = k => e  => setF(p => ({ ...p, [k]: e.target.value }));
  const setB = k => e  => setF(p => ({ ...p, [k]: e.target.checked }));

  const submit = () => {
    const payload = { ...f };
    delete payload.drivers; delete payload.teams;
    ['position','grid_position','laps_completed'].forEach(k => { if (payload[k] === '') payload[k] = null; else payload[k] = parseInt(payload[k]); });
    if (payload.points === '') payload.points = 0; else payload.points = parseFloat(payload.points);
    if (payload.team_id === '') payload.team_id = null;
    onSave(payload);
  };

  // Auto-fill points when position changes
  const handlePositionChange = (e) => {
    const pos = parseInt(e.target.value);
    setF(p => ({ ...p, position: e.target.value, points: (!isNaN(pos) && pos >= 1 && pos <= 10) ? String(POSITION_POINTS[pos - 1]) : '0' }));
  };

  return (
    <div>
      <div className="form-grid">
        <div className="form-group full">
          <label>Driver *</label>
          <select value={f.driver_id} onChange={set('driver_id')}>
            <option value="">— Select Driver —</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name} ({d.code || '?'})</option>)}
          </select>
        </div>
        <div className="form-group full">
          <label>Team</label>
          <select value={f.team_id || ''} onChange={set('team_id')}>
            <option value="">— Select Team —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Finish Position</label><input type="number" min="1" value={f.position || ''} onChange={handlePositionChange} /></div>
        <div className="form-group"><label>Grid Position</label><input type="number" min="1" value={f.grid_position || ''} onChange={set('grid_position')} /></div>
        <div className="form-group"><label>Points</label><input type="number" step="0.5" value={f.points || ''} onChange={set('points')} /></div>
        <div className="form-group">
          <label>Status</label>
          <select value={f.status} onChange={set('status')}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Laps Completed</label><input type="number" value={f.laps_completed || ''} onChange={set('laps_completed')} /></div>
        <div className="form-group"><label>Gap / Race Time</label><input value={f.time_or_gap || ''} onChange={set('time_or_gap')} placeholder="+5.234s" /></div>
        <div className="form-group">
          <label>Fastest Lap</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" id="fl" checked={!!f.fastest_lap} onChange={setB('fastest_lap')} style={{ width: 'auto' }} />
            <label htmlFor="fl" style={{ margin: 0, textTransform: 'none', fontSize: 13 }}>Yes</label>
          </div>
        </div>
        <div className="form-group"><label>Fastest Lap Time</label><input value={f.fastest_lap_time || ''} onChange={set('fastest_lap_time')} placeholder="1:23.456" /></div>
      </div>
      {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-red" onClick={submit} disabled={saving}>{saving ? <span className="spinner" /> : null} Save</button>
      </div>
    </div>
  );
}
