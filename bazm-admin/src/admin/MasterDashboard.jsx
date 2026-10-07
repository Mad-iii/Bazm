import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import EventStats from '../components/EventStats';

export default function MasterDashboard() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    supabase.from('events').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setEvents(data || []));
  }, []);

  if (!events) return <p>Loading…</p>;
  return (
    <>
      <div className="spread">
        <h1>Platform overview</h1>
        <Link className="btn" to="/admin/events/new">+ New event</Link>
      </div>
      <EventStats events={events} />
    </>
  );
}