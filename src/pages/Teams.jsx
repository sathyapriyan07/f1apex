// src/pages/Teams.jsx
import { useState } from 'react';
import { db } from '../lib/supabase';
import { useCRUD } from '../hooks/useCRUD';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import TeamDetailPanel from '../components/TeamDetailPanel';
import { TeamForm } from './DataPages';
import { Loader } from './Drivers';

export default function TeamsPage({ detailId, onOpenTeam, onCloseDetail, onOpenDriver, onOpenRace } = {}) {
  const { isAdmin } = useAuth();
  const C = useCRUD(db.teams);
  const [view, setView] = useState('grid'); // 'grid' | 'list'

  if (detailId) {
    return (
      <div>
        <TeamDetailPanel
          teamId={detailId}
          mode="page"
          onClose={onCloseDetail}
          onOpenDriver={onOpenDriver}
          onOpenRace={onOpenRace}
        />

        {C.modal && (
          <Modal title={C.modal.mode === 'add' ? 'Add Team' : 'Edit Team'} onClose={() => C.setModal(null)}>
            <TeamForm initial={C.modal.data} onSave={C.save} onCancel={() => C.setModal(null)} saving={C.saving} error={C.error} />
          </Modal>
        )}
      </div>
    );
  }

  const filteredTeams = C.rows || [];

  return (
    <div style={{ background: '#000', minHeight: '100%', color: 'var(--text)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          background: '#000',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--sans)',
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Teams
        </h1>

        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <button
            onClick={() => setView('grid')}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 8px',
              fontSize: 18,
              color: view === 'grid' ? 'var(--text)' : 'rgba(255,255,255,0.3)',
              transition: 'color 0.15s',
            }}
            aria-label="Grid view"
          >
            ⊞
          </button>
          <button
            onClick={() => setView('list')}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 8px',
              fontSize: 18,
              color: view === 'list' ? 'var(--text)' : 'rgba(255,255,255,0.3)',
              transition: 'color 0.15s',
            }}
            aria-label="List view"
          >
            ☰
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px 16px', background: '#000' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '11px 16px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ color: 'var(--muted)', fontSize: 15 }} aria-hidden="true">🔍</span>
          <input
            placeholder="Search"
            value={C.search}
            onChange={(e) => C.setSearch(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--sans)',
              fontSize: 15,
              color: 'var(--text)',
              width: '100%',
            }}
            aria-label="Search teams"
          />
        </div>
      </div>

      {C.error && <div className="error-msg" style={{ margin: '0 20px 14px' }}>{C.error}</div>}

      {C.loading ? (
        <Loader />
      ) : filteredTeams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏎</div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
            {C.search ? `No teams matching "${C.search}"` : 'No teams yet'}
          </div>
        </div>
      ) : (
        view === 'grid' ? (
          <div className="teams-grid">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onClick={() => onOpenTeam?.(team.id)}
                isAdmin={isAdmin}
                onEdit={() => C.openEdit(team)}
                onDelete={() => C.remove(team.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', background: '#000' }}>
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                onClick={() => onOpenTeam?.(team.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpenTeam?.(team.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt=""
                      style={{ maxWidth: 40, maxHeight: 40, objectFit: 'contain' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12, color: team.team_color || 'var(--muted)' }}>
                      {team.name?.slice(0, 3).toUpperCase()}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                    {team.name}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {team.nationality || '—'}{team.base ? ` · ${team.base}` : ''}
                  </div>
                </div>

                {Number(team.championships || 0) > 0 ? (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--yellow)', flexShrink: 0 }}>
                    {team.championships}× 🏆
                  </div>
                ) : null}
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

function TeamCard({ team, onClick, isAdmin, onEdit, onDelete }) {
  return (
    <div
      className="team-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      style={{
        background: '#1e1e1e',
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        height: 160,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 16px 14px',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        transform: 'scale(1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div style={{ alignSelf: 'flex-start' }}>
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt={team.name}
            style={{ width: 52, height: 52, objectFit: 'contain', objectPosition: 'left center' }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mono)',
              fontWeight: 700,
              fontSize: 16,
              color: team.team_color || 'rgba(255,255,255,0.3)',
            }}
          >
            {team.name?.slice(0, 3).toUpperCase()}
          </div>
        )}
      </div>

      <div
        style={{
          fontFamily: 'var(--sans)',
          fontWeight: 800,
          fontSize: 18,
          color: '#ffffff',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {team.name}
      </div>

      {isAdmin ? (
        <div
          className="admin-actions"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
        >
          <button
            className="btn btn-ghost btn-xs"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
          >
            Edit
          </button>
          <button
            className="btn btn-danger btn-xs"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          >
            Del
          </button>
        </div>
      ) : null}
    </div>
  );
}

