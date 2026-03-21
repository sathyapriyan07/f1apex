// src/components/Images.jsx
// Reusable image components + F1-style cards

import { useState } from 'react';

function Img({ src, alt, className, style, fallback, imgStyle, onLoad }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || broken) {
    return (
      <div className="img-fallback" style={style}>
        {fallback}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      {!loaded && (
        <div className="img-fallback" style={{ position: 'absolute', inset: 0 }}>
          {fallback}
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ width: '100%', height: '100%', display: loaded ? 'block' : 'none', ...imgStyle }}
        onError={() => setBroken(true)}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
      />
    </div>
  );
}

export function DriverPhoto({ src, name = '', size = 48, rounded = false }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Img
      src={src}
      alt={name}
      className="img-driver"
      style={{ width: size, height: size, borderRadius: rounded ? 999 : 4, overflow: 'hidden', flexShrink: 0 }}
      imgStyle={{ objectFit: 'cover', objectPosition: 'top center' }}
      fallback={
        <span style={{ fontSize: Math.max(10, size * 0.32), fontWeight: 800, color: 'var(--sub)', fontFamily: 'var(--sans)' }}>
          {initials || '?'}
        </span>
      }
    />
  );
}

export function TeamLogo({ src, name = '', size = 32 }) {
  const abbr = (name || '').slice(0, 3).toUpperCase();
  return (
    <Img
      src={src}
      alt={name}
      className="img-logo"
      style={{ width: size, height: size, flexShrink: 0 }}
      imgStyle={{ objectFit: 'contain' }}
      fallback={
        <span style={{ fontSize: Math.max(8, size * 0.3), fontWeight: 800, color: 'var(--muted)', fontFamily: 'var(--sans)', letterSpacing: '.06em' }}>
          {abbr || '—'}
        </span>
      }
    />
  );
}

export function CircuitLayout({ src, name = '', width = 120, height = 80 }) {
  return (
    <Img
      src={src}
      alt={`${name} circuit layout`}
      className="img-circuit"
      style={{ width, height, flexShrink: 0 }}
      imgStyle={{ objectFit: 'contain', filter: 'invert(1) opacity(.6)' }}
      fallback={<span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--sans)', fontWeight: 800, letterSpacing: '.12em' }}>NO MAP</span>}
    />
  );
}

export function DriverCard({ driver, teamName, teamLogoUrl, teamColor, onClick, isAdmin, onEdit, onDelete }) {
  const fullName = `${driver?.first_name || ''} ${driver?.last_name || ''}`.trim();
  const number = driver?.number ?? '';
  const code = driver?.code || '—';
  const nationality = driver?.nationality || '—';
  const color = teamColor || 'var(--red)';

  return (
    <div className="driver-card" style={{ ['--team-color']: color }} onClick={onClick}>
      <div className="driver-card__stripe" />

      {isAdmin ? (
        <div className="driver-card__actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-xs" onClick={onEdit} type="button">
            Edit
          </button>
          <button className="btn btn-danger btn-xs" onClick={onDelete} type="button">
            Del
          </button>
        </div>
      ) : null}

      <div className="driver-card__number" aria-hidden="true">
        {number || ' '}
      </div>

      {driver?.image_url ? (
        <img className="driver-card__photo" src={driver.image_url} alt={fullName} onError={(e) => (e.currentTarget.style.display = 'none')} />
      ) : null}

      <div className="driver-card__name">
        <div className="driver-card__first">{driver?.first_name || '—'}</div>
        <div className="driver-card__last">{driver?.last_name || '—'}</div>
      </div>

      <div className="driver-card__meta">
        <span>{code}</span>
        <span>{nationality}</span>
        {teamName ? <span style={{ color: 'var(--text)', letterSpacing: '.02em' }}>{teamName}</span> : null}
      </div>

      {teamLogoUrl ? (
        <img className="driver-card__teamlogo" src={teamLogoUrl} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
      ) : null}
    </div>
  );
}

export function TeamCard({ team, isAdmin, onEdit, onDelete, onClick }) {
  const color = team?.team_color || 'var(--red)';
  return (
    <div className="team-card" style={{ ['--team-color']: color }} onClick={onClick}>
      <div className="team-card__stripe" />
      <div className="team-card__logo">
        {team?.logo_url ? (
          <img src={team.logo_url} alt={team.name} onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div className="img-fallback" style={{ width: '100%', height: '100%' }}>
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 24, letterSpacing: '.12em', color: 'var(--line2)' }}>
              {(team?.name || 'TEAM').slice(0, 4).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="team-card__body">
        <div className="team-card__name">{team?.name || '—'}</div>
        <div className="team-card__sub">{team?.nationality || '—'}{team?.base ? ` • ${team.base}` : ''}</div>

        <div className="team-card__stats">
          <div>
            <div className="team-card__statlabel">Founded</div>
            <div className="team-card__statval">{team?.first_entry || '—'}</div>
          </div>
          <div>
            <div className="team-card__statlabel">Championships</div>
            <div className="team-card__statval">
              <span className="trophy" aria-hidden="true">🏆</span>
              {team?.championships ?? '—'}
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-xs" onClick={onEdit} type="button">
              Edit
            </button>
            <button className="btn btn-danger btn-xs" onClick={onDelete} type="button">
              Del
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CircuitCard({ circuit, isAdmin, onEdit, onDelete, onClick }) {
  return (
    <div className="circuit-card" onClick={onClick}>
      <div className="circuit-card__map">
        {circuit?.layout_url ? (
          <img src={circuit.layout_url} alt={`${circuit.name} layout`} onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <span style={{ fontFamily: 'var(--sans)', fontSize: 11, color: 'var(--muted)', fontWeight: 800, letterSpacing: '.12em' }}>NO LAYOUT</span>
        )}
      </div>
      <div className="circuit-card__body">
        <div className="circuit-card__name">{circuit?.name || '—'}</div>
        <div className="circuit-card__meta">
          {circuit?.country ? `${circuit.country}` : '—'}
          {circuit?.locality ? ` • ${circuit.locality}` : ''}
          {circuit?.length_km ? ` • ${circuit.length_km} km` : ''}
        </div>

        {isAdmin ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-xs" onClick={onEdit} type="button">
              Edit
            </button>
            <button className="btn btn-danger btn-xs" onClick={onDelete} type="button">
              Del
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Stat({ label, val, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--text)' }}>
        {val}
      </span>
    </div>
  );
}
