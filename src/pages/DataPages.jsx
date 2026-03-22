// src/pages/DataPages.jsx — Teams, Seasons, Circuits, Races
import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { useCRUD } from '../hooks/useCRUD';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { PageHead, PageLoader, EmptyState, RowActions } from './Drivers';
import CircuitDetailPanel from '../components/CircuitDetailPanel';
import TeamDetailPanel from '../components/TeamDetailPanel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ══════════════════════════════════════════
// TEAMS
// ══════════════════════════════════════════
export function TeamsPage({ detailId, onOpenTeam, onCloseDetail, onOpenDriver } = {}) {
  const { isAdmin } = useAuth();
  const C = useCRUD(db.teams);
  const [view, setView] = useState('grid');

  if (detailId) {
    return (
      <div>
        <TeamDetailPanel
          teamId={detailId}
          mode="page"
          onClose={onCloseDetail}
          onOpenDriver={onOpenDriver}
          onEdit={team => C.openEdit(team)}
        />
        {C.modal && (
          <Modal title={C.modal.mode === 'add' ? 'Add Team' : 'Edit Team'} onClose={() => C.setModal(null)}>
            <TeamForm initial={C.modal.data} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      <PageHead
        title="Teams"
        search={C.search}
        setSearch={C.setSearch}
        view={view}
        setView={setView}
        extra={isAdmin && (
          <button className="btn btn-red" onClick={C.openAdd} type="button" style={{
            borderRadius: 980, padding: '8px 16px', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>+ Add</button>
        )}
      />
      {C.error && <div className="error-msg" style={{ margin: '0 20px 14px' }}>{C.error}</div>}

      {C.loading ? <PageLoader /> : C.rows.length === 0 ? <EmptyState message="No teams found" /> : (
        view === 'grid' ? (
          <div className="teams-grid">
            {C.rows.map(t => (
              <TeamCard key={t.id} team={t} isAdmin={isAdmin}
                onClick={() => onOpenTeam?.(t.id)}
                onEdit={() => C.openEdit(t)}
                onDelete={() => C.remove(t.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ background: '#000' }}>
            {C.rows.map((t, i) => (
              <div key={t.id}
                onClick={() => onOpenTeam?.(t.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '56px 1fr auto 24px',
                  alignItems: 'center', gap: 12, padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 40, height: 28, display: 'flex', alignItems: 'center' }}>
                  {t.logo_url
                    ? <img src={t.logo_url} alt="" style={{ maxWidth: 40, maxHeight: 28, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                    : <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{t.name?.slice(0, 4)}</span>
                  }
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.01em' }}>{t.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {[t.nationality, t.base].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                {t.championships > 0 && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--yellow, #ffd60a)', fontWeight: 700 }}>
                    {t.championships}x
                  </span>
                )}
                <ChevronRightIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.25)' }} />
              </div>
            ))}
          </div>
        )
      )}

      {C.modal && (
        <Modal title={C.modal.mode === 'add' ? 'Add Team' : 'Edit Team'} onClose={() => C.setModal(null)}>
          <TeamForm initial={C.modal.data} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
        </Modal>
      )}
    </div>
  );
}

function TeamCard({ team, isAdmin, onClick, onEdit, onDelete }) {
  return (
    <div
      className="team-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      style={{
        background: '#1a1a1a', borderRadius: 12, height: 160,
        padding: 16, position: 'relative', cursor: 'pointer',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {team.logo_url ? (
        <img src={team.logo_url} alt={team.name}
          style={{ height: 52, width: 'auto', objectFit: 'contain', objectPosition: 'left center', maxWidth: '70%' }}
          onError={e => e.target.style.display = 'none'}
        />
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, color: team.team_color || 'rgba(255,255,255,0.3)' }}>
          {team.name?.slice(0, 3).toUpperCase()}
        </div>
      )}
      <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
        {team.name}
      </div>
      {isAdmin && (
        <div
          className="card-admin-actions"
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s', zIndex: 3 }}
        >
          <button className="btn btn-ghost btn-xs" type="button" onClick={e => { e.stopPropagation(); onEdit?.(); }}>Edit</button>
          <button className="btn btn-danger btn-xs" type="button" onClick={e => { e.stopPropagation(); onDelete?.(); }}>Del</button>
        </div>
      )}
    </div>
  );
}

export function TeamForm({ initial, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({ name: '', nationality: '', base: '', team_color: '', championships: '', first_entry: '', wiki_url: '', logo_url: '', ...initial });
  const [allDrivers, setAllDrivers] = useState([]);
  const [currentDriverIds, setCurrentDriverIds] = useState([]);
  const [pastDriverIds, setPastDriverIds] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);

  useEffect(() => {
    if (!initial?.id) return;
    let alive = true;
    (async () => {
      setDriversLoading(true);
      const { data } = await db.drivers.list();
      if (!alive) return;
      const list = data || [];
      setAllDrivers(list);
      setCurrentDriverIds(list.filter(d => d.team_id === initial.id).map(d => d.id));
      setPastDriverIds(list.filter(d => (Array.isArray(d.past_team_ids) ? d.past_team_ids.includes(initial.id) : false)).map(d => d.id));
      setDriversLoading(false);
    })();
    return () => { alive = false; };
  }, [initial?.id]);

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const setMulti = (setter) => (e) => setter(Array.from(e.target.selectedOptions).map(o => o.value).filter(Boolean));

  const submit = async () => {
    const payload = { ...f };
    if (payload.championships === '') payload.championships = null;
    if (payload.first_entry === '') payload.first_entry = null;
    await onSave(payload);

    if (!initial?.id) return;

    const teamId = initial.id;
    const affected = new Set();
    allDrivers.forEach(d => {
      if (d.team_id === teamId) affected.add(d.id);
      if (Array.isArray(d.past_team_ids) && d.past_team_ids.includes(teamId)) affected.add(d.id);
    });
    currentDriverIds.forEach(id => affected.add(id));
    pastDriverIds.forEach(id => affected.add(id));

    for (const id of affected) {
      const d = allDrivers.find(x => x.id === id);
      if (!d) continue;

      let nextTeamId = d.team_id;
      let nextPast = Array.isArray(d.past_team_ids) ? d.past_team_ids.filter(Boolean) : [];

      const shouldBeCurrent = currentDriverIds.includes(id);
      const shouldBePast = pastDriverIds.includes(id);

      if (shouldBeCurrent) {
        nextTeamId = teamId;
        nextPast = nextPast.filter(x => x !== teamId);
      } else if (d.team_id === teamId) {
        nextTeamId = null;
      }

      if (shouldBePast) {
        if (!nextPast.includes(teamId)) nextPast = [...nextPast, teamId];
      } else {
        nextPast = nextPast.filter(x => x !== teamId);
      }

      // eslint-disable-next-line no-await-in-loop
      await db.drivers.update(id, { team_id: nextTeamId, past_team_ids: nextPast });
    }
  };
  return (
    <div>
      {f.logo_url && (
        <div style={{ marginBottom: 14, height: 48, background: 'var(--bg3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          <img src={f.logo_url} alt="preview" style={{ maxHeight: '100%', maxWidth: 140, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
        </div>
      )}
      <div className="form-grid">
        <div className="form-group full"><label>Team Name</label><input value={f.name} onChange={set('name')} /></div>
        <div className="form-group"><label>Nationality</label><input value={f.nationality || ''} onChange={set('nationality')} /></div>
        <div className="form-group"><label>Base / HQ</label><input value={f.base || ''} onChange={set('base')} /></div>
        <div className="form-group"><label>Team Color (hex)</label><input value={f.team_color || ''} onChange={set('team_color')} placeholder="#3671c6" /></div>
        <div className="form-group"><label>Championships</label><input type="number" value={f.championships || ''} onChange={set('championships')} /></div>
        <div className="form-group"><label>First Entry (year)</label><input type="number" value={f.first_entry || ''} onChange={set('first_entry')} /></div>
        <div className="form-group full"><label>Logo URL (PNG/SVG, white preferred)</label><input value={f.logo_url || ''} onChange={set('logo_url')} placeholder="https://…/logo.png" /></div>
        <div className="form-group full"><label>Wikipedia URL</label><input value={f.wiki_url || ''} onChange={set('wiki_url')} /></div>
      </div>

      {initial?.id ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Drivers
          </div>
          {driversLoading ? <div className="info-msg">Loading drivers…</div> : (
            <div className="form-grid">
              <div className="form-group full">
                <label>Current Drivers</label>
                <select multiple value={currentDriverIds} onChange={setMulti(setCurrentDriverIds)} style={{ minHeight: 110 }}>
                  {allDrivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name} {d.code ? `(${d.code})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group full">
                <label>Past Drivers</label>
                <select multiple value={pastDriverIds} onChange={setMulti(setPastDriverIds)} style={{ minHeight: 110 }}>
                  {allDrivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name} {d.code ? `(${d.code})` : ''}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="info-msg" style={{ marginTop: 14 }}>
          Save the team first to assign drivers.
        </div>
      )}

      {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-red" onClick={submit} disabled={saving}>{saving ? <span className="spinner" /> : null} Save</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// SEASONS
// ══════════════════════════════════════════
export function SeasonsPage() {
  const { isAdmin } = useAuth();
  const C = useCRUD(db.seasons);

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      <PageHead title="Seasons" search={C.search} setSearch={C.setSearch}
        extra={isAdmin && (
          <button className="btn btn-red" onClick={C.openAdd} type="button" style={{ borderRadius: 980, padding: '8px 16px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+ Add</button>
        )}
      />
      {C.error && <div className="error-msg" style={{ margin: '0 20px 14px' }}>{C.error}</div>}
      {C.loading ? <PageLoader /> : C.rows.length === 0 ? <EmptyState message="No seasons yet" /> : (
        <div className="table-wrap" style={{ padding: '0 20px' }}>
          <table className="seasons-table">
            <thead><tr><th>Year</th><th>Rounds</th><th>Champion Driver</th><th>Champion Team</th><th>Ref</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {C.rows.map(s => (
                <tr key={s.id}>
                  <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 500, color: 'var(--red)', fontSize: 13 }}>{s.year}</span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--sub)', fontSize: 12 }}>{s.rounds || '—'}</span></td>
                  <td><b>{s.champion_driver || '—'}</b></td>
                  <td style={{ color: 'var(--sub)' }}>{s.champion_team || '—'}</td>
                  <td>{s.url ? <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11, display: 'inline-flex', alignItems: 'center' }}><OpenInNewIcon sx={{ fontSize: 12 }} /></a> : '—'}</td>
                  {isAdmin && <td><RowActions onEdit={() => C.openEdit(s)} onDelete={() => C.remove(s.id)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {C.modal && (
        <Modal title={C.modal.mode === 'add' ? 'Add Season' : 'Edit Season'} onClose={() => C.setModal(null)}>
          <SeasonForm initial={C.modal.data} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
        </Modal>
      )}
    </div>
  );
}

function SeasonForm({ initial, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({ year: '', rounds: '', champion_driver: '', champion_team: '', url: '', ...initial });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = () => {
    const payload = { ...f };
    if (!payload.year) { alert('Year required'); return; }
    if (payload.rounds === '') payload.rounds = null;
    onSave(payload);
  };
  return (
    <div>
      <div className="form-grid">
        <div className="form-group"><label>Year *</label><input type="number" value={f.year} onChange={set('year')} /></div>
        <div className="form-group"><label>Rounds</label><input type="number" value={f.rounds || ''} onChange={set('rounds')} /></div>
        <div className="form-group"><label>Champion Driver</label><input value={f.champion_driver || ''} onChange={set('champion_driver')} /></div>
        <div className="form-group"><label>Champion Team</label><input value={f.champion_team || ''} onChange={set('champion_team')} /></div>
        <div className="form-group full"><label>Wikipedia URL</label><input value={f.url || ''} onChange={set('url')} /></div>
      </div>
      {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-red" onClick={submit} disabled={saving}>{saving ? <span className="spinner" /> : null} Save</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// CIRCUITS
// ══════════════════════════════════════════
export function CircuitsPage({ detailId, onOpenCircuit, onCloseDetail } = {}) {
  const { isAdmin } = useAuth();
  const C = useCRUD(db.circuits);
  const [view, setView] = useState('grid');

  if (detailId) {
    return (
      <div>
        <CircuitDetailPanel
          circuitId={detailId}
          mode="page"
          onClose={onCloseDetail}
          onEdit={circuit => C.openEdit(circuit)}
          onDelete={isAdmin ? async (id) => { await C.remove(id); onCloseDetail?.(); } : undefined}
        />
        {C.modal && (
          <Modal title={C.modal.mode === 'add' ? 'Add Circuit' : 'Edit Circuit'} onClose={() => C.setModal(null)}>
            <CircuitForm initial={C.modal.data} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      <PageHead
        title="Circuits"
        search={C.search}
        setSearch={C.setSearch}
        view={view}
        setView={setView}
        extra={isAdmin && (
          <button className="btn btn-red" onClick={C.openAdd} type="button" style={{
            borderRadius: 980, padding: '8px 16px', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>+ Add</button>
        )}
      />
      {C.error && <div className="error-msg" style={{ margin: '0 20px 14px' }}>{C.error}</div>}

      {C.loading ? <PageLoader /> : C.rows.length === 0 ? <EmptyState message="No circuits found" /> : (
        view === 'grid' ? (
          <div className="circuits-grid">
            {C.rows.map(c => (
              <CircuitCardNew key={c.id} circuit={c} isAdmin={isAdmin}
                onClick={() => onOpenCircuit?.(c.id)}
                onEdit={() => C.openEdit(c)}
                onDelete={() => C.remove(c.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ background: '#000' }}>
            {C.rows.map((c, i) => (
              <div key={c.id}
                onClick={() => onOpenCircuit?.(c.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '68px 1fr 24px',
                  alignItems: 'center', gap: 12, padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 60, height: 44, background: '#1a1a1a', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {c.layout_url
                    ? <img src={c.layout_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'invert(1) opacity(0.45)' }} onError={e => e.target.style.display = 'none'} />
                    : <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>—</span>
                  }
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.01em' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {[c.locality, c.country].filter(Boolean).join(', ')}{c.length_km ? ` · ${c.length_km}km` : ''}
                  </div>
                </div>
                <ChevronRightIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.25)' }} />
              </div>
            ))}
          </div>
        )
      )}
      {C.modal && (
        <Modal title={C.modal.mode === 'add' ? 'Add Circuit' : 'Edit Circuit'} onClose={() => C.setModal(null)}>
          <CircuitForm initial={C.modal.data} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
        </Modal>
      )}
    </div>
  );
}

function CircuitCardNew({ circuit: c, isAdmin, onClick, onEdit, onDelete }) {
  return (
    <div
      className="circuit-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      style={{
        background: '#1a1a1a', borderRadius: 12, height: 180,
        overflow: 'hidden', position: 'relative', cursor: 'pointer',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ flex: '0 0 55%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {c.layout_url
          ? <img src={c.layout_url} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain', filter: 'invert(1) opacity(0.5)' }} onError={e => e.target.style.display = 'none'} />
          : <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>—</span>
        }
      </div>
      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>{c.name}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
          {[c.locality, c.country].filter(Boolean).join(', ')}
        </div>
      </div>
      {isAdmin && (
        <div
          className="card-admin-actions"
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s', zIndex: 3 }}
        >
          <button className="btn btn-ghost btn-xs" type="button" onClick={e => { e.stopPropagation(); onEdit?.(); }}>Edit</button>
          <button className="btn btn-danger btn-xs" type="button" onClick={e => { e.stopPropagation(); onDelete?.(); }}>Del</button>
        </div>
      )}
    </div>
  );
}

function CircuitForm({ initial, onSave, onCancel, saving, error }) {
  const [f, setF] = useState({ name: '', locality: '', country: '', lat: '', lng: '', length_km: '', wiki_url: '', layout_url: '', ...initial });
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiPages, setWikiPages] = useState([]);
  const [wikiImages, setWikiImages] = useState([]);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [wikiError, setWikiError] = useState('');
  const [selectedWikiTitle, setSelectedWikiTitle] = useState('');
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = () => {
    const payload = { ...f };
    ['lat','lng','length_km'].forEach(k => { if (payload[k] === '') payload[k] = null; });
    onSave(payload);
  };

  const wikiSearch = async () => {
    const q = (wikiQuery || f.name || '').trim();
    if (!q) return;
    setWikiError('');
    setWikiLoading(true);
    setWikiPages([]);
    setWikiImages([]);
    setSelectedWikiTitle('');
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=8&format=json&origin=*`;
      const res = await fetch(url);
      const json = await res.json();
      const pages = (json?.query?.search || []).map((p) => ({
        title: p.title,
        snippet: (p.snippet || '').replace(/<[^>]+>/g, ''),
      }));
      setWikiPages(pages);
      if (!pages.length) setWikiError('No results found on Wikipedia.');
    } catch (e) {
      setWikiError('Wikipedia search failed.');
    } finally {
      setWikiLoading(false);
    }
  };

  const wikiLoadImages = async (title) => {
    if (!title) return;
    setWikiError('');
    setWikiLoading(true);
    setWikiImages([]);
    setSelectedWikiTitle(title);
    try {
      const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=images&titles=${encodeURIComponent(title)}&imlimit=50&format=json&origin=*`;
      const pageRes = await fetch(pageUrl);
      const pageJson = await pageRes.json();
      const pages = pageJson?.query?.pages || {};
      const page = Object.values(pages)[0] || {};
      const images = page?.images || [];
      const fileTitles = images
        .map((img) => img.title)
        .filter(Boolean)
        .filter((t) => !/\\.(gif|webm|ogv)$/i.test(t))
        .slice(0, 24);

      if (!fileTitles.length) {
        setWikiError('No images found on that page.');
        return;
      }

      const filesUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&titles=${encodeURIComponent(fileTitles.join('|'))}&iiprop=url&iiurlwidth=520&format=json&origin=*`;
      const filesRes = await fetch(filesUrl);
      const filesJson = await filesRes.json();
      const filesPages = filesJson?.query?.pages || {};
      const imgs = Object.values(filesPages)
        .map((p) => {
          const ii = p?.imageinfo?.[0];
          if (!ii?.url) return null;
          const fileName = (p?.title || '').replace(/^File:/, '');
          const thumb = ii?.thumburl || ii?.url;
          return { title: p?.title, fileName, url: ii.url, thumb };
        })
        .filter(Boolean);

      const score = (x) => {
        const n = (x.fileName || '').toLowerCase();
        let s = 0;
        if (n.includes('track')) s += 3;
        if (n.includes('layout')) s += 3;
        if (n.includes('circuit')) s += 2;
        if (n.includes('map')) s += 2;
        if (n.endsWith('.svg')) s += 2;
        return s;
      };

      const ranked = imgs.sort((a, b) => score(b) - score(a));
      setWikiImages(ranked.slice(0, 12));

      setF((p) => ({
        ...p,
        wiki_url: p.wiki_url || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      }));
    } catch (e) {
      setWikiError('Failed to load images from Wikipedia.');
    } finally {
      setWikiLoading(false);
    }
  };
  return (
    <div>
      {f.layout_url && (
        <div style={{ marginBottom: 14, height: 80, background: 'var(--bg3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          <img src={f.layout_url} alt="preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'invert(1) opacity(.6)' }} onError={e => e.target.style.display='none'} />
        </div>
      )}
      <div className="form-grid">
        <div className="form-group full"><label>Circuit Name *</label><input value={f.name} onChange={set('name')} /></div>
        <div className="form-group"><label>City / Locality</label><input value={f.locality || ''} onChange={set('locality')} /></div>
        <div className="form-group"><label>Country</label><input value={f.country || ''} onChange={set('country')} /></div>
        <div className="form-group"><label>Latitude</label><input type="number" step="any" value={f.lat || ''} onChange={set('lat')} /></div>
        <div className="form-group"><label>Longitude</label><input type="number" step="any" value={f.lng || ''} onChange={set('lng')} /></div>
        <div className="form-group"><label>Length (km)</label><input type="number" step="any" value={f.length_km || ''} onChange={set('length_km')} /></div>
        <div className="form-group full"><label>Circuit Layout Image URL</label><input value={f.layout_url || ''} onChange={set('layout_url')} placeholder="https://…/circuit.svg" /></div>
        <div className="form-group full"><label>Wikipedia URL</label><input value={f.wiki_url || ''} onChange={set('wiki_url')} /></div>
        <div className="form-group full">
          <label>Wikipedia image search</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={wikiQuery}
              onChange={(e) => setWikiQuery(e.target.value)}
              placeholder="Search Wikipedia (e.g. Silverstone Circuit)"
              style={{ flex: 1, minWidth: 220 }}
            />
            <button type="button" className="btn btn-ghost" onClick={wikiSearch} disabled={wikiLoading}>
              {wikiLoading ? <span className="spinner" /> : null} Search
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => wikiLoadImages(selectedWikiTitle || wikiPages?.[0]?.title)}
              disabled={wikiLoading || (!selectedWikiTitle && !wikiPages?.length)}
            >
              Images
            </button>
          </div>

          {wikiError ? <div className="error-msg" style={{ marginTop: 10 }}>{wikiError}</div> : null}

          {wikiPages.length ? (
            <div className="wiki-results">
              {wikiPages.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  className={`wiki-result ${selectedWikiTitle === p.title ? 'is-active' : ''}`}
                  onClick={() => wikiLoadImages(p.title)}
                >
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{p.title}</div>
                  {p.snippet ? <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{p.snippet}</div> : null}
                </button>
              ))}
            </div>
          ) : null}

          {wikiImages.length ? (
            <div className="wiki-images">
              {wikiImages.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  className="wiki-image"
                  onClick={() => setF((p) => ({ ...p, layout_url: img.url }))}
                  title="Use this image as the circuit layout URL"
                >
                  <img src={img.thumb} alt="" onError={(e) => (e.target.style.display = 'none')} />
                  <div className="wiki-image__cap">{img.fileName}</div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-red" onClick={submit} disabled={saving}>{saving ? <span className="spinner" /> : null} Save</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// RACES
// ══════════════════════════════════════════
export function RacesPage({ circuits, seasons }) {
  const { isAdmin } = useAuth();
  const C = useCRUD(db.races);

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      <PageHead
        title="Schedule"
        search={C.search}
        setSearch={C.setSearch}
        extra={isAdmin && (
          <button className="btn btn-red" onClick={C.openAdd} type="button" style={{
            borderRadius: 980, padding: '8px 16px', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>+ Add</button>
        )}
      />
      {C.error && <div className="error-msg" style={{ margin: '0 20px 14px' }}>{C.error}</div>}
      {C.loading ? <PageLoader /> : C.rows.length === 0 ? <EmptyState message="No races scheduled" /> : (
        <div>
          {C.rows.map((r) => {
            const circuit = circuits.find(c => c.id === r.circuit_id);
            const layoutUrl = r.circuits?.layout_url || circuit?.layout_url;
            const locality = r.circuits?.locality || circuit?.locality || r.circuits?.country || circuit?.country || '—';
            const d = r.date ? new Date(r.date) : null;
            const day = d ? String(d.getDate()).padStart(2, '0') : '—';
            const mon = d ? d.toLocaleDateString('en-GB', { month: 'short' }) : '';
            return (
              <div key={r.id}
                style={{
                  display: 'grid', gridTemplateColumns: '52px 1fr 68px auto',
                  alignItems: 'center', gap: 12, padding: '14px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 20, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{day}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{mon}</div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.01em' }}>
                      {r.name?.replace('Grand Prix', 'GP')}
                    </span>
                    {r.sprint && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color: '#ffd60a', background: 'rgba(255,214,10,0.12)', borderRadius: 4, padding: '2px 5px' }}>SPRINT</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    R{String(r.round || 0).padStart(2, '0')} · {locality}
                  </div>
                </div>
                <div style={{ width: 64, height: 40, flexShrink: 0 }}>
                  {layoutUrl && (
                    <img src={layoutUrl} alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1) opacity(0.5)' }}
                      onError={e => e.target.style.display = 'none'}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isAdmin && (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" type="button" onClick={() => C.openEdit(r)}>Edit</button>
                      <button className="btn btn-danger btn-xs" type="button" onClick={() => C.remove(r.id)}>Del</button>
                    </div>
                  )}
                  <ChevronRightIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.25)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {C.modal && (
        <Modal title={C.modal.mode === 'add' ? 'Add Race' : 'Edit Race'} onClose={() => C.setModal(null)}>
          <RaceForm initial={C.modal.data} circuits={circuits} seasons={seasons} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
        </Modal>
      )}
    </div>
  );
}


function RaceForm({ initial, circuits, seasons, onSave, onCancel, saving, error }) {
  const [f, setF] = useState(() => {
    const merged = {
      season_year: '', round: '', name: '', circuit_id: '',
      date: '', time_utc: '', sprint: false, wiki_url: '',
      ...initial,
    };
    return {
      ...merged,
      circuit_id: merged.circuit_id || merged.circuits?.id || '',
    };
  });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = () => {
    const payload = { ...f };
    delete payload.circuits;
    if (payload.circuit_id === '') payload.circuit_id = null;
    if (payload.round === '') payload.round = null;
    if (!payload.season_year) { alert('Season year required'); return; }
    onSave(payload);
  };
  return (
    <div>
      <div className="form-grid">
        <div className="form-group">
          <label>Season *</label>
          <select value={f.season_year} onChange={set('season_year')}>
            <option value="">— Select —</option>
            {(seasons || []).map(s => <option key={s.id} value={s.year}>{s.year}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Round</label><input type="number" value={f.round || ''} onChange={set('round')} /></div>
        <div className="form-group full"><label>Race Name *</label><input value={f.name} onChange={set('name')} /></div>
        <div className="form-group full">
          <label>Circuit</label>
          <select value={f.circuit_id || ''} onChange={set('circuit_id')}>
            <option value="">— Select —</option>
            {(circuits || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Date</label><input type="date" value={f.date || ''} onChange={set('date')} /></div>
        <div className="form-group"><label>Time UTC</label><input type="time" value={f.time_utc || ''} onChange={set('time_utc')} /></div>
        <div className="form-group">
          <label>Sprint Weekend</label>
          <select value={f.sprint ? 'true' : 'false'} onChange={e => setF(p => ({ ...p, sprint: e.target.value === 'true' }))}>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
        <div className="form-group full"><label>Wikipedia URL</label><input value={f.wiki_url || ''} onChange={set('wiki_url')} /></div>
      </div>
      {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-red" onClick={submit} disabled={saving}>{saving ? <span className="spinner" /> : null} Save</button>
      </div>
    </div>
  );
}
