import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import EventStats from '../components/EventStats';

export default function OrganizerDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState(null);

  useEffect(() => {
    supabase
      .from('event_assignments')
      .select('events(*)')
      .eq('user_id', profile.id)
      .then(({ data }) => setEvents((data || []).map((r) => r.events).filter(Boolean)));
  }, [profile.id]);

  if (!events) return <p>Loading…</p>;
  return (
    <>
      <h1>Your events</h1>
      {!events.length && <p className="muted">No events assigned to you yet.</p>}
      <EventStats events={events} />
    </>
  );
}