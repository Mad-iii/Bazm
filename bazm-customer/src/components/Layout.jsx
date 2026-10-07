import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <nav className="nav">
        <div className="container">
          <Link to="/" className="brand">🎟 Events</Link>
          <Link to="/">Events</Link>
          <Link to="/status">Check order</Link>
        </div>
      </nav>
      <main className="container"><Outlet /></main>
    </>
  );
}