import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { to: '/new', label: 'New Investigation', icon: '◈' },
  { to: '/library', label: 'Library', icon: '▤' },
  { to: '/editor', label: 'Editor', icon: '◧' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-mark">A</div>
        <div className="wordmark">
          Au<span className="accent">dt</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">SA</div>
        <div className="user-meta">
          <div className="user-name">Seb Astapia</div>
          <div className="user-role">Researcher</div>
        </div>
      </div>
    </aside>
  );
}
