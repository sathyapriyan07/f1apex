// src/pages/Drivers.jsx
import { useState } from 'react';
import { db } from '../lib/supabase';
import { useCRUD } from '../hooks/useCRUD';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { DriverCard } from '../components/Images';
import DriverDetailPanel from '../components/DriverDetailPanel';

export default function DriversPage({ teams, detailId, onOpenDriver, onCloseDetail }) {
  const { isAdmin } = useAuth();
  const C = useCRUD(db.drivers);
  const [view, setView] = useState('grid'); // 'grid' | 'list'

  if (detailId) {
    return (
      <div>
        <DriverDetailPanel
          driverId={detailId}
          mode="page"
          onClose={onCloseDetail}
          onEdit={(driver) => C.openEdit(driver)}
        />

        {C.modal && (
          <Modal title={C.modal.mode === 'add' ? 'Add Driver' : 'Edit Driver'} onClose={() => C.setModal(null)}>
            <DriverForm initial={C.modal.data} teams={teams} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionHead
        title="Drivers" count={C.rows.length}
        search={C.search} setSearch={C.setSearch}
        onAdd={isAdmin ? C.openAdd : null}
        extra={<ViewToggle view={view} setView={setView} />}
      />
      {C.error && <div className="error-msg" style={{ marginBottom: 14 }}>{C.error}</div>}

      {C.loading ? <Loader /> : C.rows.length === 0 ? <Empty icon="👤" label="No drivers yet" /> : (
        view === 'grid' ? (
          <div className="grid drivers-grid">
            {C.rows.map(d => (
              <DriverCard
                key={d.id}
                driver={d}
                teamName={d.teams?.name}
                teamLogoUrl={teams.find(t => t.id === d.team_id)?.logo_url}
                teamColor={teams.find(t => t.id === d.team_id)?.team_color}
                isAdmin={isAdmin}
                onClick={() => onOpenDriver?.(d.id)}
                onEdit={() => C.openEdit(d)}
                onDelete={() => C.remove(d.id)}
              />
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="drivers-table">
              <thead>
                <tr><th>Photo</th><th>#</th><th>Name</th><th>Code</th><th>Nationality</th><th>Team</th><th>Status</th>{isAdmin && <th></th>}</tr>
              </thead>
              <tbody>
                {C.rows.map(d => (
                  <tr key={d.id} onClick={() => onOpenDriver?.(d.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ width: 44 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 3, overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0 }}>
                        {d.image_url
                          ? <img src={d.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} onError={e => e.target.style.display='none'} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{d.code?.slice(0,2)}</div>
                        }
                      </div>
                    </td>
                    <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>{d.number || '—'}</span></td>
                    <td><span style={{ fontWeight: 700 }}>{d.first_name} {d.last_name}</span></td>
                    <td><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)', letterSpacing: '.06em' }}>{d.code || '—'}</span></td>
                    <td style={{ color: 'var(--sub)', fontSize: 12 }}>{d.nationality || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {teams.find(t => t.id === d.team_id)?.logo_url && (
                          <img src={teams.find(t => t.id === d.team_id).logo_url} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                        )}
                        <span style={{ fontSize: 12 }}>{d.teams?.name || '—'}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${d.active ? 'badge-green' : 'badge-muted'}`}>{d.active ? 'Active' : 'Retired'}</span></td>
                    {isAdmin && <td><RowActions onEdit={() => C.openEdit(d)} onDelete={() => C.remove(d.id)} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {C.modal && (
        <Modal title={C.modal.mode === 'add' ? 'Add Driver' : 'Edit Driver'} onClose={() => C.setModal(null)}>
          <DriverForm initial={C.modal.data} teams={teams} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
        </Modal>
      )}
    </div>
  );
}

function DriverForm({ initial, teams, onSave, onCancel, saving, error }) {
  const [f, setF] = useState(() => {
    const merged = {
      first_name: '', last_name: '', code: '', number: '', dob: '',
      nationality: '', team_id: '', past_team_ids: [], active: true, wiki_url: '', image_url: '',
      ...initial,
    };
    return {
      ...merged,
      team_id: merged.team_id || merged.teams?.id || '',
      past_team_ids: Array.isArray(merged.past_team_ids) ? merged.past_team_ids : [],
    };
  });
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const setMulti = k => e => setF(p => ({ ...p, [k]: Array.from(e.target.selectedOptions).map(o => o.value).filter(Boolean) }));
  const submit = () => {
    const payload = { ...f };
    delete payload.teams;
    const prevTeamId = initial.team_id || initial.teams?.id || null;
    if (prevTeamId && prevTeamId !== payload.team_id) {
      payload.past_team_ids = [...new Set([...(payload.past_team_ids || []), prevTeamId])];
    }
    if (payload.number === '') payload.number = null;
    if (payload.team_id === '') payload.team_id = null;
    payload.past_team_ids = [...new Set((payload.past_team_ids || []).filter(Boolean))].filter(id => id !== payload.team_id);
    onSave(payload);
  };
  return (
    <div>
      {/* Image preview */}
      {f.image_url && (
        <div style={{ marginBottom: 16, height: 80, display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={f.image_url} alt="preview" style={{ height: 80, width: 60, objectFit: 'cover', objectPosition: 'top', borderRadius: 4, border: '1px solid var(--line2)' }} onError={e => e.target.style.display='none'} />
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Preview</span>
        </div>
      )}
      <div className="form-grid">
        <div className="form-group"><label>First Name</label><input value={f.first_name} onChange={set('first_name')} /></div>
        <div className="form-group"><label>Last Name</label><input value={f.last_name} onChange={set('last_name')} /></div>
        <div className="form-group"><label>Code (VER)</label><input value={f.code || ''} onChange={set('code')} maxLength={3} style={{ textTransform: 'uppercase' }} /></div>
        <div className="form-group"><label>Car Number</label><input type="number" value={f.number || ''} onChange={set('number')} /></div>
        <div className="form-group"><label>Date of Birth</label><input type="date" value={f.dob || ''} onChange={set('dob')} /></div>
        <div className="form-group"><label>Nationality</label><input value={f.nationality || ''} onChange={set('nationality')} /></div>
        <div className="form-group">
          <label>Team</label>
          <select value={f.team_id || ''} onChange={set('team_id')}>
            <option value="">— None —</option>
            {(teams || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group full">
          <label>Past Teams</label>
          <select multiple value={f.past_team_ids || []} onChange={setMulti('past_team_ids')} style={{ minHeight: 110 }}>
            {(teams || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={f.active ? 'true' : 'false'} onChange={e => setF(p => ({ ...p, active: e.target.value === 'true' }))}>
            <option value="true">Active</option>
            <option value="false">Retired</option>
          </select>
        </div>
        <div className="form-group full"><label>Photo URL (driver image)</label><input value={f.image_url || ''} onChange={set('image_url')} placeholder="https://…/driver.jpg" /></div>
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

// ── Shared sub-components exported for other pages ────────────────────────────
export function SectionHead({ title, count, search, setSearch, onAdd, extra }) {
  return (
    <div className="section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
      <div className="section-head__title" style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div>
          <div className="page-subtitle">F1 Database</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>{title}</h1>
        </div>
        <span className="section-head__count" style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {count} items
        </span>
      </div>
      <div className="section-head__actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {extra}
        <input className="section-head__search" style={{ minWidth: 180 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        {onAdd && <button className="btn btn-red" onClick={onAdd}>+ Add</button>}
      </div>
    </div>
  );
}

export function ViewToggle({ view, setView }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--line2)', borderRadius: 4, overflow: 'hidden' }}>
      {[['grid','⊞'],['list','☰']].map(([v,icon]) => (
        <button key={v} onClick={() => setView(v)}
          style={{ padding: '5px 10px', background: view === v ? 'var(--bg3)' : 'transparent', border: 'none', color: view === v ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', fontSize: 14, transition: 'all .1s' }}>
          {icon}
        </button>
      ))}
    </div>
  );
}

export function RowActions({ onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      <button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); onEdit(); }}>Edit</button>
      <button className="btn btn-danger btn-xs" onClick={(e) => { e.stopPropagation(); onDelete(); }}>Del</button>
    </div>
  );
}

export function Empty({ icon, label }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
    </div>
  );
}

export function Loader() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><span className="spinner spinner-lg" /></div>;
}
