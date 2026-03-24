// src/components/ModernMobileMenu.jsx
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MapIcon from '@mui/icons-material/Map';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import UploadIcon from '@mui/icons-material/Upload';
import { signOut } from '../lib/supabase';

export default function MobileMenu({ tab, activeTab, setTab, session, onSignIn, isAdmin }) {
  const currentTab = tab ?? activeTab ?? 'dashboard';
  const navItems = [
    { id: 'dashboard', label: 'HOME', Icon: HomeIcon },
    { id: 'drivers', label: 'DRIVERS', Icon: PersonIcon },
    { id: 'teams', label: 'TEAMS', Icon: DirectionsCarIcon },
    { id: 'races', label: 'RACES', Icon: SportsScoreIcon },
    { id: 'results', label: 'RESULTS', Icon: BarChartIcon },
    { id: 'standings', label: 'STANDINGS', Icon: EmojiEventsIcon },
    { id: 'circuits', label: 'CIRCUITS', Icon: MapIcon },
    ...(isAdmin ? [{ id: 'import', label: 'IMPORT', Icon: UploadIcon }] : []),
  ];

  const iconStyle = (isActive) => ({
    fontSize: 20,
    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.35)',
  });

  const btnStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    flex: 1,
    padding: '8px 0',
  };

  const labelStyle = (isActive) => ({
    fontFamily: 'var(--sans)',
    fontWeight: 700,
    fontSize: 8,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
  });

  return (
    <nav className="menu" aria-label="Primary">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        const Icon = item.Icon;
        return (
          <button
            key={item.id}
            onClick={() => setTab?.(item.id)}
            type="button"
            style={btnStyle}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon sx={iconStyle(isActive)} aria-hidden="true" />
            <span style={labelStyle(isActive)}>{item.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => session ? signOut() : onSignIn?.()}
        style={btnStyle}
        aria-label={session ? 'Sign out' : 'Sign in'}
      >
        {session
          ? <LogoutIcon sx={iconStyle(false)} aria-hidden="true" />
          : <LoginIcon sx={iconStyle(false)} aria-hidden="true" />
        }
        <span style={labelStyle(false)}>{session ? 'LOGOUT' : 'LOGIN'}</span>
      </button>
    </nav>
  );
}
