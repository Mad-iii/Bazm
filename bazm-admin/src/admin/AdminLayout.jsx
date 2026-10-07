import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const isMaster = profile.role === 'master';
  const cls = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <>
      <nav className="nav">
        <div className="container">
          <Link to="/admin" className="brand">🎟 Admin</Link>
          <span className="muted">{profile.name || profile.email} ({profile.role})</span>
          <button className="secondary small" onClick={signOut}>Sign out</button>
        </div>
      </nav>
      <div className="admin">
        <aside className="side">
          <NavLink end to="/admin" className={cls}>Dashboard</NavLink>
          <NavLink to="/admin/bookings" className={cls}>Bookings</NavLink>
          {isMaster && <NavLink to="/admin/events/new" className={cls}>+ New event</NavLink>}
          {isMaster && <NavLink to="/admin/users" className={cls}>Users</NavLink>}
          <NavLink to="/admin/audit" className={cls}>Audit log</NavLink>
        </aside>
        <section style={{ padding: '1rem', minWidth: 0 }}><Outlet /></section>
      </div>
    </>
  );
}