// src/components/Footer.jsx
import { Github, Twitter, Instagram, ExternalLink } from 'lucide-react';

const socialLinks = [
  { Icon: Github,    label: 'GitHub',    href: 'https://github.com'    },
  { Icon: Twitter,   label: 'Twitter',   href: 'https://twitter.com'   },
  { Icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
];

const data = {
  explore: [
    { text: 'Drivers',       tab: 'drivers'   },
    { text: 'Teams',         tab: 'teams'     },
    { text: 'Circuits',      tab: 'circuits'  },
    { text: 'Race Schedule', tab: 'races'     },
  ],
  results: [
    { text: 'Race Results',      tab: 'results'      },
    { text: 'Driver Standings',  tab: 'standings'    },
    { text: 'Constructor WCC',   tab: 'constructors' },
    { text: 'Lap Times',         tab: 'laptimes'     },
  ],
  tools: [
    { text: 'Race Replay', tab: 'replay'  },
    { text: 'Charts',      tab: 'charts'  },
    { text: 'Seasons',     tab: 'seasons' },
  ],
  info: [
    { text: 'Ergast API',  href: 'https://ergast.com/mrd/' },
    { text: 'OpenF1 API',  href: 'https://openf1.org'      },
    { text: 'Jolpica API', href: 'https://jolpi.ca'        },
  ],
};

const linkBase = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 400,
  color: 'rgba(255,255,255,0.4)', textAlign: 'left', padding: 0,
  transition: 'color 0.15s',
};

function NavLink({ text, tab, href, setTab }) {
  const enter = (e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; };
  const leave = (e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; };

  if (tab) {
    return (
      <li>
        <button onClick={() => setTab?.(tab)} style={linkBase}
          onMouseEnter={enter} onMouseLeave={leave}>
          {text}
        </button>
      </li>
    );
  }
  return (
    <li>
      <a href={href} target="_blank" rel="noreferrer"
        style={{ ...linkBase, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
        onMouseEnter={enter} onMouseLeave={leave}>
        {text}
        <ExternalLink size={11} />
      </a>
    </li>
  );
}

function Column({ title, links, setTab }) {
  return (
    <div>
      <p style={{
        fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 13,
        color: '#fff', letterSpacing: '-0.01em', margin: '0 0 16px',
      }}>
        {title}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {links.map(link => <NavLink key={link.text} {...link} setTab={setTab} />)}
      </ul>
    </div>
  );
}

export default function Footer({ setTab }) {
  return (
    <footer className="app-footer" style={{
      background: 'var(--bg2)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '48px 40px 24px',
    }}>
      <div className="footer-grid" style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
        gap: 40,
        alignItems: 'flex-start',
      }}>
        {/* Brand */}
        <div>
          <div style={{
            fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 22,
            letterSpacing: '-0.02em', fontStyle: 'italic', marginBottom: 12,
          }}>
            <span style={{ color: 'var(--red)' }}>F1</span>
            <span style={{ color: '#fff' }}>DB</span>
          </div>
          <p style={{
            fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 400,
            color: 'rgba(255,255,255,0.4)', lineHeight: 1.7,
            maxWidth: 240, margin: '0 0 24px',
          }}>
            A community-built Formula One database. Browse drivers, teams, circuits, results, and live telemetry.
          </p>
          <div style={{ display: 'flex', gap: 14 }}>
            {socialLinks.map(({ Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" title={label}
                style={{ color: 'rgba(255,255,255,0.3)', transition: 'color 0.15s', display: 'flex' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>

        <Column title="Explore"      links={data.explore} setTab={setTab} />
        <Column title="Results"      links={data.results} setTab={setTab} />
        <Column title="Tools"        links={data.tools}   setTab={setTab} />
        <Column title="Data Sources" links={data.info}    setTab={setTab} />
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: 1200, margin: '40px auto 0',
        paddingTop: 20,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
          © {new Date().getFullYear()} F1DB — Not affiliated with Formula 1® or FOM
        </p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
          Data provided by Ergast, OpenF1 &amp; Jolpica APIs
        </p>
      </div>
    </footer>
  );
}
