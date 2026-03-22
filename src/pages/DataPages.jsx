// src/pages/DataPages.jsx — Teams, Seasons, Circuits, Races
import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { useCRUD } from '../hooks/useCRUD';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { CircuitCard } from '../components/Images';
import { SectionHead, RowActions, Empty, Loader, ViewToggle } from './Drivers';
import CircuitDetailPanel from '../components/CircuitDetailPanel';
import TeamDetailPanel from '../components/TeamDetailPanel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MapIcon from '@mui/icons-material/Map';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

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
          onEdit={(team) => C.openEdit(team)}
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
    <div>
      <SectionHead title="Teams" count={C.rows.length} search={C.search} setSearch={C.setSearch}
        onAdd={isAdmin ? C.openAdd : null}
        extra={<ViewToggle view={view} setView={setView} />}
      />
      {C.error && <div className="error-msg" style={{ marginBottom: 14 }}>{C.error}</div>}

      {C.loading ? <Loader /> : C.rows.length === 0 ? <Empty icon={<EmojiEventsIcon sx={{ fontSize: 28, color: 'var(--muted)' }} />} label="No teams yet" /> : (
        view === 'grid' ? (
          <div className="grid teams-grid">
            {C.rows.map(t => (
              <TeamCard key={t.id} team={t} isAdmin={isAdmin} onClick={() => onOpenTeam?.(t.id)} onEdit={() => C.openEdit(t)} onDelete={() => C.remove(t.id)} />
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="teams-table">
              <thead><tr><th>Logo</th><th>Name</th><th>Nationality</th><th>Base</th><th>WCC</th><th>Founded</th>{isAdmin && <th></th>}</tr></thead>
              <tbody>
                {C.rows.map(t => (
                  <tr key={t.id} onClick={() => onOpenTeam?.(t.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ width: 44 }}>
                      <div style={{ width: 36, height: 24, display: 'flex', alignItems: 'center' }}>
                        {t.logo_url
                          ? <img src={t.logo_url} alt="" style={{ maxWidth: 36, maxHeight: 24, objectFit: 'contain' }} onError={e => e.target.style.display='none'} />
                          : <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>{t.name?.slice(0,4)}</span>
                        }
                      </div>
                    </td>
                    <td><b>{t.name}</b></td>
                    <td style={{ color: 'var(--sub)', fontSize: 12 }}>{t.nationality || '—'}</td>
                    <td style={{ color: 'var(--sub)', fontSize: 12 }}>{t.base || '—'}</td>
                    <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 500 }}>{t.championships ?? '—'}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--sub)' }}>{t.first_entry || '—'}</td>
                    {isAdmin && <td onClick={e => e.stopPropagation()}><RowActions onEdit={() => C.openEdit(t)} onDelete={() => C.remove(t.id)} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
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
    <div>
      <SectionHead title="Seasons" count={C.rows.length} search={C.search} setSearch={C.setSearch} onAdd={isAdmin ? C.openAdd : null} />
      {C.error && <div className="error-msg" style={{ marginBottom: 14 }}>{C.error}</div>}
      {C.loading ? <Loader /> : C.rows.length === 0 ? <Empty icon={<CalendarMonthIcon sx={{ fontSize: 28, color: 'var(--muted)' }} />} label="No seasons yet" /> : (
        <div className="table-wrap">
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
          onEdit={(circuit) => C.openEdit(circuit)}
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
    <div>
      <SectionHead title="Circuits" count={C.rows.length} search={C.search} setSearch={C.setSearch}
        onAdd={isAdmin ? C.openAdd : null}
        extra={<ViewToggle view={view} setView={setView} />}
      />
      {C.error && <div className="error-msg" style={{ marginBottom: 14 }}>{C.error}</div>}
      {C.loading ? <Loader /> : C.rows.length === 0 ? <Empty icon={<MapIcon sx={{ fontSize: 28, color: 'var(--muted)' }} />} label="No circuits yet" /> : (
        view === 'grid' ? (
          <div className="grid circuits-grid">
            {C.rows.map(c => (
              <CircuitCard key={c.id} circuit={c} isAdmin={isAdmin} onClick={() => onOpenCircuit?.(c.id)} onEdit={() => C.openEdit(c)} onDelete={() => C.remove(c.id)} />
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="circuits-table">
              <thead><tr><th>Layout</th><th>Name</th><th>City</th><th>Country</th><th>Length</th>{isAdmin && <th></th>}</tr></thead>
              <tbody>
                {C.rows.map(c => (
                  <tr key={c.id} onClick={() => onOpenCircuit?.(c.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ width: 60 }}>
                      <div style={{ width: 56, height: 36, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.layout_url
                          ? <img src={c.layout_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'invert(1) opacity(.5)' }} onError={e => e.target.style.display='none'} />
                          : <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)' }}>—</span>
                        }
                      </div>
                    </td>
                    <td><b>{c.name}</b></td>
                    <td style={{ fontSize: 12, color: 'var(--sub)' }}>{c.locality || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--sub)' }}>{c.country || '—'}</td>
                    <td><span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--sub)' }}>{c.length_km ? `${c.length_km} km` : '—'}</span></td>
                    {isAdmin && <td onClick={e => e.stopPropagation()}><RowActions onEdit={() => C.openEdit(c)} onDelete={() => C.remove(c.id)} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
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
    <div>
      <SectionHead title="Races" count={C.rows.length} search={C.search} setSearch={C.setSearch} onAdd={isAdmin ? C.openAdd : null} />
      {C.error && <div className="error-msg" style={{ marginBottom: 14 }}>{C.error}</div>}
      {C.loading ? <Loader /> : C.rows.length === 0 ? <Empty icon={<SportsScoreIcon sx={{ fontSize: 28, color: 'var(--muted)' }} />} label="No races yet" /> : (
        <div className="table-wrap races-table-wrap">
          <div className="races-cards" aria-label="Races list">
            {C.rows.map((r) => {
              const circuit = circuits.find((c) => c.id === r.circuit_id);
              const circuitName = r.circuits?.name || circuit?.name || 'â€”';
              const country = r.circuits?.country || circuit?.country || '';
              return (
                <div key={r.id} className="race-card">
                  {circuit?.layout_url ? (
                    <img
                      src={circuit.layout_url}
                      alt=""
                      className="race-card__thumb"
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                  ) : null}
                  <div className="race-card__content">
                    <div className="race-card__name">{r.name}</div>
                    <div className="race-card__meta">
                      <span>{r.season_year} · R{r.round}</span>
                      <span>·</span>
                      <span>{r.date || 'â€”'}</span>
                      {r.sprint ? <span className="badge badge-yellow">Sprint</span> : null}
                    </div>
                    <div className="race-card__sub">
                      {circuitName}{country ? ` · ${country}` : ''}
                    </div>
                  </div>
                  {isAdmin ? (
                    <div className="race-card__actions">
                      <RowActions onEdit={() => C.openEdit(r)} onDelete={() => C.remove(r.id)} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <table className="races-table">
            <thead><tr><th>Season</th><th>Rnd</th><th>Race</th><th>Circuit</th><th>Country</th><th>Date</th><th>Sprint</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {C.rows.map(r => (
                <tr key={r.id}>
                  <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--red)', fontSize: 12, fontWeight: 500 }}>{r.season_year}</span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', color: 'var(--sub)', fontSize: 12 }}>{r.round}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {circuits.find(c => c.id === r.circuit_id)?.layout_url && (
                        <img src={circuits.find(c => c.id === r.circuit_id).layout_url} alt=""
                          className="race-thumb"
                          style={{ width: 40, height: 26, objectFit: 'contain', filter: 'invert(1) opacity(.4)', flexShrink: 0 }}
                          onError={e => e.target.style.display='none'} />
                      )}
                      <b style={{ fontSize: 13 }}>{r.name}</b>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--sub)' }}>{r.circuits?.name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{r.circuits?.country || '—'}</td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sub)' }}>{r.date || '—'}</span></td>
                  <td>{r.sprint ? <span className="badge badge-yellow">Sprint</span> : '—'}</td>
                  {isAdmin && <td><RowActions onEdit={() => C.openEdit(r)} onDelete={() => C.remove(r.id)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
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
