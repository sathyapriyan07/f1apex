// src/pages/StandingsHub.jsx
import { useState } from 'react';
import { DriverStandingsPage, ConstructorStandingsPage } from './Standings';

export default function StandingsHub({ seasons }) {
  const [mode, setMode] = useState('drivers'); // drivers | constructors

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setMode('drivers')}
          style={{
            borderColor: mode === 'drivers' ? 'rgba(232,0,45,.6)' : 'var(--line)',
            background: mode === 'drivers' ? 'rgba(232,0,45,.10)' : 'transparent',
          }}
        >
          Drivers
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setMode('constructors')}
          style={{
            borderColor: mode === 'constructors' ? 'rgba(232,0,45,.6)' : 'var(--line)',
            background: mode === 'constructors' ? 'rgba(232,0,45,.10)' : 'transparent',
          }}
        >
          Teams
        </button>
      </div>

      {mode === 'drivers' ? <DriverStandingsPage seasons={seasons} /> : <ConstructorStandingsPage seasons={seasons} />}
    </div>
  );
}

