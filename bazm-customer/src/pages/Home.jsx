import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fmtDate } from '../lib/format';

export default function Home() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('starts_at', { ascending: true })
      .then(({ data }) => setEvents(data || []));
  }, []);

  if (!events) return <p>Loading…</p>;

  return (
    <>
      <h1>Upcoming events</h1>
      {!events.length && <p className="muted">No events right now.</p>}
      <div className="grid">
        {events.map((e) => (
          <Link key={e.id} to={`/events/${e.id}`} className="card" style={{ color: 'inherit' }}>
            {e.banner_url ? <img className="banner" src={e.banner_url} alt="" /> : <div className="banner card" style={{ height: 150 }} />}
            <h3>{e.name}</h3>
            <div className="muted">{fmtDate(e.starts_at)}</div>
            <div className="muted">{e.venue}</div>
            <div className="muted">{e.type === 'stall' ? 'Stall booking' : 'Tickets'}</div>
          </Link>
        ))}
      </div>
    </>
  );
}