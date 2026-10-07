import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { money } from '../lib/format';
import StatusBadge from './StatusBadge';

export default function EventStats({ events }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    if (!events.length) {
      setD({ b: [], t: [], s: [] });
      return;
    }
    const ids = events.map((e) => e.id);
    Promise.all([
      supabase.from('bookings').select('event_id,status,total_price,quantity').in('event_id', ids).limit(5000),
      supabase.from('ticket_tiers').select('event_id,remaining_quantity').in('event_id', ids),
      supabase.from('stalls').select('event_id,status').in('event_id', ids),
    ]).then(([b, t, s]) => setD({ b: b.data || [], t: t.data || [], s: s.data || [] }));
  }, [events]);

  if (!d) return <p>Loading stats…</p>;

  const rows = events.map((e) => {
    const bk = d.b.filter((x) => x.event_id === e.id);
    const approved = bk.filter((x) => x.status === 'approved');
    return {
      e,
      sold: approved.reduce((n, x) => n + x.quantity, 0),
      revenue: approved.reduce((n, x) => n + Number(x.total_price), 0),
      pending: bk.filter((x) => x.status === 'pending' || x.status === 'payment_received').length,
      remaining:
        e.type === 'ticketed'
          ? d.t.filter((x) => x.event_id === e.id).reduce((n, x) => n + x.remaining_quantity, 0)
          : d.s.filter((x) => x.event_id === e.id && x.status === 'available').length,
    };
  });

  const total = rows.reduce(
    (a, r) => ({ sold: a.sold + r.sold, revenue: a.revenue + r.revenue, pending: a.pending + r.pending }),
    { sold: 0, revenue: 0, pending: 0 }
  );

  return (
    <>
      <div className="grid" style={{ marginBottom: '1rem' }}>
        <div className="card"><div className="muted">Events</div><div className="stat">{events.length}</div></div>
        <div className="card"><div className="muted">Sold / booked</div><div className="stat">{total.sold}</div></div>
        <div className="card"><div className="muted">Awaiting action</div><div className="stat">{total.pending}</div></div>
        <div className="card"><div className="muted">Revenue (approved)</div><div className="stat">{money(total.revenue)}</div></div>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Event</th><th>Type</th><th>Status</th><th>Sold</th><th>Pending</th><th>Remaining</th><th>Revenue</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.e.id}>
                <td>{r.e.name}</td>
                <td>{r.e.type}</td>
                <td><StatusBadge status={r.e.status} /></td>
                <td>{r.sold}</td>
                <td>{r.pending}</td>
                <td>{r.remaining}</td>
                <td>{money(r.revenue)}</td>
                <td><Link to={`/admin/events/${r.e.id}`}>Manage</Link></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="8" className="muted">No events yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}