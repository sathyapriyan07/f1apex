// src/pages/Drivers.jsx
import { useMemo, useState } from 'react';
import { db } from '../lib/supabase';
import { useCRUD } from '../hooks/useCRUD';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import DriverDetailPanel from '../components/DriverDetailPanel';
import GridViewIcon from '@mui/icons-material/GridView';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ── Shared helpers ──────────────────────────────────────────────

export function PageHead({ title, search, setSearch, view, setView, extra }) {
  return (
    <>
      <div style={{ padding: '16px 20px 10px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--sans)', fontWeight: 500,
          fontSize: 18, color: '#fff',
          letterSpacing: '-0.01em', margin: 0,
        }}>{title}</h1>
      </div>
      <div style={{ padding: '0 20px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          background: '#1a1a1a', borderRadius: 12, padding: '11px 16px',
        }}>
          <SearchIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.3)' }} aria-hidden="true" />
          <input
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--sans)', fontSize: 15,
              color: '#fff', width: '100%',
            }}
          />
        </div>
        {setView && (
          <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
            <button onClick={() => setView('grid')} type="button" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 8px', color: view === 'grid' ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'color 0.15s', display: 'flex', alignItems: 'center',
            }} aria-label="Grid view">
              <GridViewIcon sx={{ fontSize: 18 }} />
            </button>
            <button onClick={() => setView('list')} type="button" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 8px', color: view === 'list' ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'color 0.15s', display: 'flex', alignItems: 'center',
            }} aria-label="List view">
              <MenuIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        )}
        {extra}
      </div>
    </>
  );
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 20px' }}>
      <span className="spinner spinner-lg" />
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px', gap: 8,
    }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
        {message}
      </span>
    </div>
  );
}

export function RowActions({ onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); onEdit(); }} type="button">Edit</button>
      <button className="btn btn-danger btn-xs" onClick={e => { e.stopPropagation(); onDelete(); }} type="button">Del</button>
    </div>
  );
}

// Keep legacy exports so DataPages.jsx imports don't break
export const SectionHead = PageHead;
export const Loader = PageLoader;
export function Empty({ label }) { return <EmptyState message={label} />; }
export function ViewToggle({ view, setView }) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      <button onClick={() => setView('grid')} type="button" style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
        color: view === 'grid' ? '#fff' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center',
      }}><GridViewIcon sx={{ fontSize: 18 }} /></button>
      <button onClick={() => setView('list')} type="button" style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
        color: view === 'list' ? '#fff' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center',
      }}><MenuIcon sx={{ fontSize: 18 }} /></button>
    </div>
  );
}

// ── Drivers Page ────────────────────────────────────────────────

export default function DriversPage({ teams, detailId, onOpenDriver, onOpenTeam, onOpenRace, onCloseDetail }) {
  const { isAdmin } = useAuth();
  const C = useCRUD(db.drivers);
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'retired'
  const teamById = useMemo(() => new Map((teams || []).map(t => [t.id, t])), [teams]);

  if (detailId) {
    return (
      <div>
        <DriverDetailPanel
          driverId={detailId}
          mode="page"
          onClose={onCloseDetail}
          onEdit={isAdmin ? () => {
            const driver = C.allRows.find(d => String(d.id) === String(detailId));
            if (driver) C.openEdit(driver);
          } : undefined}
          onDelete={isAdmin ? async (id) => { await C.remove(id); onCloseDetail?.(); } : undefined}
          onOpenTeamDetail={onOpenTeam}
          onOpenRace={onOpenRace}
        />
        {C.modal && (
          <Modal title={C.modal.mode === 'add' ? 'Add Driver' : 'Edit Driver'} onClose={() => C.setModal(null)}>
            <DriverForm initial={C.modal.data} teams={teams} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
          </Modal>
        )}
      </div>
    );
  }

  const filtered = (C.rows || []).filter(d => {
    if (filter === 'active') return d.active !== false;
    if (filter === 'retired') return d.active === false;
    return true;
  });

  return (
    <div style={{ background: '#000', minHeight: '100vh', paddingBottom: 100 }}>
      <PageHead
        title="Drivers"
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

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[['all', 'All'], ['active', 'Active'], ['retired', 'Retired']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} type="button" style={{
            padding: '5px 14px', borderRadius: 980, flexShrink: 0, border: 'none', cursor: 'pointer',
            background: filter === id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
            fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 12,
            color: filter === id ? '#fff' : 'rgba(255,255,255,0.4)',
          }}>{label}</button>
        ))}
      </div>

      {C.error && <div className="error-msg" style={{ margin: '0 20px 14px' }}>{C.error}</div>}

      {C.loading ? <PageLoader /> : filtered.length === 0 ? <EmptyState message="No drivers found" /> : (
        view === 'grid' ? (
          <div className="drivers-grid">
            {filtered.map(driver => (
              <DriverCardGrid
                key={driver.id}
                driver={driver}
                team={teamById.get(driver.team_id) || driver.teams || null}
                onClick={() => onOpenDriver?.(driver.id)}
                isAdmin={isAdmin}
                onEdit={() => C.openEdit(driver)}
                onDelete={() => C.remove(driver.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ background: '#000' }}>
            {filtered.map((driver, i) => {
              const team = teamById.get(driver.team_id) || driver.teams || null;
              return (
                <div
                  key={driver.id}
                  onClick={() => onOpenDriver?.(driver.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '52px 48px 1fr auto 24px',
                    alignItems: 'center', gap: 12, padding: '14px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden', flexShrink: 0 }}>
                    {driver.image_url
                      ? <img src={driver.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} onError={e => e.currentTarget.style.display = 'none'} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{driver.code || '?'}</div>
                    }
                  </div>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.02em' }}>
                    {driver.number || '—'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.01em' }}>
                      {driver.first_name} {driver.last_name}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      {driver.code || '—'} · {driver.nationality || '—'}
                    </div>
                  </div>
                  {team?.logo_url
                    ? <img src={team.logo_url} alt="" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} onError={e => e.currentTarget.style.display = 'none'} />
                    : <div style={{ width: 24 }} />
                  }
                  <ChevronRightIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.25)' }} />
                </div>
              );
            })}
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

function DriverCardGrid({ driver, team, onClick, isAdmin, onEdit, onDelete }) {
  return (
    <div
      className="driver-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      style={{
        background: '#1a1a1a', borderRadius: 12, overflow: 'hidden',
        position: 'relative', cursor: 'pointer', height: 200,
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {driver.image_url ? (
        <img src={driver.image_url} alt=""
          style={{ position: 'absolute', right: 0, bottom: 0, height: '95%', width: '65%', objectFit: 'cover', objectPosition: 'top center' }}
          onError={e => e.currentTarget.style.display = 'none'}
        />
      ) : (
        <div style={{ position: 'absolute', right: 0, bottom: 0, width: '60%', height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 42, color: 'rgba(255,255,255,0.06)', letterSpacing: '0.04em' }}>
            {driver.code || '?'}
          </span>
        </div>
      )}

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(20,20,20,0.95) 35%, rgba(20,20,20,0.3) 70%, transparent 100%)' }} aria-hidden="true" />

      <div style={{ position: 'absolute', top: 12, right: 14, fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 22, color: '#fff', zIndex: 2, letterSpacing: '-0.02em' }}>
        {driver.number || '—'}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 14px', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.1 }}>{driver.first_name}</div>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 17, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{driver.last_name}</div>
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em', marginTop: 4 }}>{driver.code || '—'}</div>
        {team?.logo_url && (
          <img src={team.logo_url} alt="" style={{ width: 24, height: 24, objectFit: 'contain', marginTop: 6 }} onError={e => e.currentTarget.style.display = 'none'} />
        )}
      </div>

      {isAdmin && (
        <div
          className="card-admin-actions"
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s', zIndex: 3 }}
        >
          <button className="btn btn-ghost btn-xs" type="button" onClick={e => { e.stopPropagation(); onEdit?.(); }}>Edit</button>
          <button className="btn btn-danger btn-xs" type="button" onClick={e => { e.stopPropagation(); onDelete?.(); }}>Del</button>
        </div>
      )}
    </div>
  );
}

export function DriverForm({ initial, teams, onSave, onCancel, saving, error }) {
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
      {f.image_url && (
        <div style={{ marginBottom: 16, height: 80, display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={f.image_url} alt="preview" style={{ height: 80, width: 60, objectFit: 'cover', objectPosition: 'top', borderRadius: 4, border: '1px solid var(--line2)' }} onError={e => e.currentTarget.style.display = 'none'} />
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
        <div className="form-group full"><label>Photo URL</label><input value={f.image_url || ''} onChange={set('image_url')} placeholder="https://…/driver.jpg" /></div>
        <div className="form-group full"><label>Wikipedia URL</label><input value={f.wiki_url || ''} onChange={set('wiki_url')} /></div>
      </div>
      {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onCancel} type="button">Cancel</button>
        <button className="btn btn-red" onClick={submit} disabled={saving} type="button">{saving ? <span className="spinner" /> : null} Save</button>
      </div>
    </div>
  );
}
